import json
import os
import random
import string

import cv2
import numpy as np
from pymongo import MongoClient

from config import MONGO_URI, MONGO_DB_NAME


def save_groups_to_json(groups, filepath="groups.json"):
    with open(filepath, "w") as f:
        json.dump(groups, f, indent=4)


def load_groups_from_json(filepath="groups.json"):
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return None


# ----------------------------
# Feature Extraction
# ----------------------------
def extract_mask_features(mask):
    seg = mask["segmentation"]

    area = np.sum(seg)

    ys, xs = np.where(seg)
    h = ys.max() - ys.min()
    w = xs.max() - xs.min()

    mask_uint8 = (seg.astype(np.uint8) * 255)
    contours, _ = cv2.findContours(
        mask_uint8,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    contour = max(contours, key=cv2.contourArea) if contours else None

    vertex_count = 0
    if contour is not None:
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        vertex_count = len(approx)

    return {
        "area": area,
        "height": h,
        "width": w,
        "vertex": vertex_count,
        "contour": contour
    }


# ----------------------------
# Helpers
# ----------------------------
def random_color():
    return np.random.randint(50, 255, size=3).tolist()


def random_name():
    return "Object_" + ''.join(random.choices(string.ascii_uppercase, k=3))


def _persist_group_in_mongo(group_payload, room_id=None, project_id=None):
    """
    Creates a canonical group document in MongoDB and returns its _id as string.
    Falls back to None if DB insert fails.
    """
    client = None
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        groups_coll = db["groups"]
        result = groups_coll.insert_one(
            {
                "name": group_payload.get("name", ""),
                "description": group_payload.get("description", ""),
                "code": group_payload.get("code", ""),
                "color": group_payload.get("color", [141, 106, 59]),
                "type": group_payload.get("type", "FF&E"),
                "room": str(room_id or ""),
                "project": str(project_id or ""),
            }
        )
        return str(result.inserted_id)
    except Exception as e:
        print(f"[GroupingEngine] Failed to persist group in MongoDB: {e}")
        return None
    finally:
        if client:
            client.close()


# ----------------------------
# Similarity Logic
# ----------------------------
def is_similar(f1, f2,
               area_tol=0.08,
               size_tol=0.20,
               shape_tol=0.04,
               vertex_tol=2):
    area_diff = abs(f1["area"] - f2["area"]) / max(f1["area"], 1)
    if area_diff > area_tol:
        return False

    h_diff = abs(f1["height"] - f2["height"]) / max(f1["height"], 1)
    w_diff = abs(f1["width"] - f2["width"]) / max(f1["width"], 1)
    if h_diff > size_tol or w_diff > size_tol:
        return False

    if abs(f1["vertex"] - f2["vertex"]) > vertex_tol:
        return False

    if f1["contour"] is None or f2["contour"] is None:
        return False

    shape_score = cv2.matchShapes(
        f1["contour"],
        f2["contour"],
        cv2.CONTOURS_MATCH_I1,
        0.0
    )

    if shape_score > shape_tol:
        return False

    return True


# ----------------------------
# Group Builder
# ----------------------------


def build_similarity_graph(masks):
    n = len(masks)
    features = [extract_mask_features(m) for m in masks]

    adjacency = {i: set() for i in range(n)}

    for i in range(n):
        for j in range(i + 1, n):
            if is_similar(features[i], features[j]):
                adjacency[i].add(j)
                adjacency[j].add(i)

    return adjacency


def get_connected_components(adjacency):
    visited = set()
    components = []

    for node in adjacency:
        if node in visited:
            continue

        stack = [node]
        component = []

        while stack:
            current = stack.pop()
            if current in visited:
                continue

            visited.add(current)
            component.append(current)

            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    stack.append(neighbor)

        components.append(component)

    return components


def build_groups(masks, room_id=None, project_id=None):
    adjacency = build_similarity_graph(masks)
    components = get_connected_components(adjacency)

    groups = {}

    for i, comp in enumerate(components, start=1):
        group_payload = {
            "name": random_name(),
            "code": "",
            "color": random_color(),
            "type": "FF&E",
            "mask_indices": comp
        }

        mongo_group_id = _persist_group_in_mongo(
            group_payload,
            room_id=room_id,
            project_id=project_id,
        )
        group_id = mongo_group_id or f"group_{i}"

        groups[group_id] = {
            "id": group_id,
            "name": group_payload["name"],
            "code": group_payload["code"],
            "color": group_payload["color"],
            "type": group_payload["type"],
            "mask_indices": group_payload["mask_indices"],
        }

    return groups
