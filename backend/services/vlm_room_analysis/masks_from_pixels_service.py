import json
import os
import random
import string
import sys
import time

import cv2
from pymongo import MongoClient

# Allow importing backend/config.py when executed as a script
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from config import MONGO_DB_NAME, MONGO_URI


def random_color():
    return [
        random.randint(50, 255),
        random.randint(50, 255),
        random.randint(50, 255),
    ]


def random_group_name(prefix="Object"):
    suffix = "".join(random.choices(string.ascii_uppercase, k=3))
    return f"{prefix}_{suffix}"


def infer_image_path_from_pixels_json(input_json_path):
    """
    Infer source image path from *_with_pixels.json filename.
    Example: output/2preprocessed_with_pixels.json -> input/2preprocessed.png
    """
    base_name = os.path.basename(input_json_path)
    if base_name.endswith("_with_pixels.json"):
        stem = base_name[: -len("_with_pixels.json")]
    elif base_name.endswith(".json"):
        stem = base_name[: -len(".json")]
    else:
        stem = base_name

    myexp_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(myexp_dir, "input", f"{stem}.png")


def _persist_group_in_mongo(group_payload, room_id=None, project_id=None):
    """
    Create canonical group in MongoDB (room/project empty for now).
    Returns inserted _id as string.
    """
    client = None
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        groups_coll = db["groups"]

        doc = {
            "name": group_payload.get("name", ""),
            "code": group_payload.get("code", ""),
            "description" : group_payload.get("description", ""),
            "color": group_payload.get("color", [141, 106, 59]),
            "type": group_payload.get("type", "FF&E"),
            "room": str(room_id or ""),
            "project": str(project_id or "")
        }

        result = groups_coll.insert_one(doc)
        return str(result.inserted_id)
    except Exception as exc:
        print(f"[masks_from_pixels_service] Failed to persist group in MongoDB: {exc}")
        return None
    finally:
        if client:
            client.close()


def _persist_mask_in_mongo(mask_payload):
    """
    Create canonical mask in MongoDB and return inserted _id as string.
    """
    client = None
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        masks_coll = db["masks"]

        doc = {
            "name": mask_payload.get("name", ""),
            "code": mask_payload.get("code", ""),
            "description": mask_payload.get("description", ""),
            "color": mask_payload.get("color", [141, 106, 59]),
            "type": mask_payload.get("type", "FF&E"),
            "room": str(mask_payload.get("room", "")),
            "project": str(mask_payload.get("project", "")),
            "group_id": str(mask_payload.get("group_id", "")),
            "polygons": mask_payload.get("polygons", []),
            "source": mask_payload.get("source", "system"),
            "mask_type": mask_payload.get("mask_type", "label"),
        }

        result = masks_coll.insert_one(doc)
        return str(result.inserted_id)
    except Exception as exc:
        print(f"[masks_from_pixels_service] Failed to persist mask in MongoDB: {exc}")
        return None
    finally:
        if client:
            client.close()


def square_polygon_from_center(center_x, center_y, box_size=20):
    """
    Build square polygon around a center point.

    Returns flattened coordinates in clockwise order and closed path:
    [x1, y1, x2, y2, x3, y3, x4, y4, x1, y1]
    """
    half = box_size / 2.0

    x1 = center_x - half
    y1 = center_y - half
    x2 = center_x + half
    y2 = center_y - half
    x3 = center_x + half
    y3 = center_y + half
    x4 = center_x - half
    y4 = center_y + half

    return [x1, y1, x2, y2, x3, y3, x4, y4, x1, y1]


def clamp_polygon_to_bounds(polygon, image_width, image_height):
    """
    Clamp polygon coordinates into [0, image_width-1] x [0, image_height-1].
    """
    clamped = []
    max_x = max(0.0, float(image_width) - 1.0)
    max_y = max(0.0, float(image_height) - 1.0)

    for i, value in enumerate(polygon):
        if i % 2 == 0:
            clamped.append(max(0.0, min(float(value), max_x)))
        else:
            clamped.append(max(0.0, min(float(value), max_y)))
    return clamped


def get_image_dimensions(image_path):
    if not os.path.exists(image_path):
        raise ValueError(f"❌ Image not found: {image_path}")
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("❌ Failed to load image")
    image_height, image_width = img.shape[:2]
    return image_width, image_height


def _make_mask_id(index):
    # Similar style to existing mask IDs with time-based uniqueness
    millis = int(time.time() * 1000)
    return f"mask_{millis}_{index}"


def generate_masks_polygons_from_pixels_json(
    input_json_path,
    output_json_path,
    image_width=None,
    image_height=None,
    image_path=None,
    room_id=None,
    project_id=None,
    default_group_type="FF&E",
    box_size=20,
):
    """
    Convert objects with similar_objects_pixel into masks_polygons format.

    Flow:
    1) For each object, create a group in MongoDB and keep returned group_id.
    2) Add this group under output['groups'].
    3) For each pixel point under similar_objects_pixel, create a square mask
       centered on that point.
    4) Add output image_width/image_height from parameters.
    """
    if not os.path.exists(input_json_path):
        raise ValueError(f"❌ Input JSON not found: {input_json_path}")

    if image_path:
        image_width, image_height = get_image_dimensions(image_path)
    elif image_width is None or image_height is None:
        raise ValueError("❌ Provide either image_path or image_width/image_height")

    with open(input_json_path, "r") as f:
        objects = json.load(f)

    result = {
        "groups": {},
        "masks": [],
        "image_width": int(image_width),
        "image_height": int(image_height),
    }

    mask_counter = 0

    for obj_idx, obj in enumerate(objects):
        description = (obj.get("description") or "").strip()

        group_payload = {
            "name": obj.get("name") or random_group_name("Object"),
            "code": obj.get("code", ""),
            "description": description,
            "color": random_color(),
            "type": default_group_type,
        }

        mongo_group_id = _persist_group_in_mongo(
            group_payload,
            room_id=room_id,
            project_id=project_id,
        )
        group_id = mongo_group_id or f"group_local_{obj_idx}"

        result["groups"][group_id] = {
            "id": group_id,
            "name": group_payload["name"],
            "code": group_payload["code"],
            "color": group_payload["color"],
            "type": group_payload["type"],
            "description": group_payload["description"],
            "room": str(room_id or ""),
            "project": str(project_id or ""),
        }

        points = obj.get("similar_objects_pixel", [])
        for p in points:
            cx = float(p["pixel_x"])
            cy = float(p["pixel_y"])

            polygon = square_polygon_from_center(cx, cy, box_size=box_size)
            polygon = clamp_polygon_to_bounds(
                polygon,
                image_width=image_width,
                image_height=image_height,
            )

            mask_counter += 1
            mask_payload = {
                "name": group_payload["name"],
                "code": group_payload["code"],
                "description": group_payload["description"],
                "color": group_payload["color"],
                "type": group_payload["type"],
                "room": str(room_id or ""),
                "project": str(project_id or ""),
                "group_id": group_id,
                "polygons": [polygon],
                "source": "system",
                "mask_type": "label",
            }
            mongo_mask_id = _persist_mask_in_mongo(mask_payload)

            mask_obj = {
                "id": mongo_mask_id or _make_mask_id(mask_counter),
                "group_id": group_id,
                "project_id": project_id,
                "polygons": [polygon],
                "source": "system",
                "type": "label",
                "description": description,
            }
            result["masks"].append(mask_obj)

    with open(output_json_path, "w") as f:
        json.dump(result, f, indent=4)

    return result


def generate_masks_polygons_file(
    input_pixels_json_path,
    output_masks_polygons_path,
    image_path,
    room_id=None,
    project_id=None,
    default_group_type="FF&E",
    box_size=20,
):
    """Pipeline-friendly wrapper for generating masks_polygons.json from pixel JSON."""
    return generate_masks_polygons_from_pixels_json(
        input_json_path=input_pixels_json_path,
        output_json_path=output_masks_polygons_path,
        image_path=image_path,
        room_id=room_id,
        project_id=project_id,
        default_group_type=default_group_type,
        box_size=box_size,
    )


if __name__ == "__main__":
    # Driver for manual testing
    input_json_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/output/2preprocessed_with_pixels.json"
    image_path = infer_image_path_from_pixels_json(input_json_path)
    output_json_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/output/masks_polygons.json"

    if not os.path.exists(image_path):
        raise ValueError(
            f"❌ Could not infer source image for JSON. Expected: {image_path}"
        )

    data = generate_masks_polygons_from_pixels_json(
        input_json_path=input_json_path,
        output_json_path=output_json_path,
        image_path=image_path,
        default_group_type="FF&E",
        box_size=20,
    )

    print(f"✅ masks_polygons generated: {output_json_path}")
    print(f"ℹ️ groups={len(data['groups'])}, masks={len(data['masks'])}")
