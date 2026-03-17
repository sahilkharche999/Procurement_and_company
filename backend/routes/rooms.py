from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.mongo import get_rooms_collection


class RoomCreate(BaseModel):
    name: str
    notes: str = ""
    created_by: str = "user"


router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("/project/{project_id}")
async def get_rooms_by_project(project_id: str):
    rooms_coll = get_rooms_collection()
    cursor = rooms_coll.find({"project": project_id})
    docs = await cursor.to_list(1000)
    for d in docs:
        d["_id"] = str(d["_id"])
        if "diagram" in d:
            d["diagram"] = str(d.get("diagram", ""))
        if "project" in d:
            d["project"] = str(d.get("project", ""))
    return docs


@router.post("/project/{project_id}", status_code=201)
async def create_room(project_id: str, body: RoomCreate):
    rooms_coll = get_rooms_collection()
    new_room = {
        "project": project_id,
        "name": body.name,
        "notes": body.notes,
        "created_by": body.created_by
    }
    res = await rooms_coll.insert_one(new_room)
    new_room["_id"] = str(res.inserted_id)
    return new_room


@router.get("/{room_id}")
async def get_room(room_id: str):
    rooms_coll = get_rooms_collection()
    # Handle if room_id is valid ObjectId or just a string
    try:
        obj_id = ObjectId(room_id) if len(room_id) == 24 else room_id
    except:
        obj_id = room_id

    room_doc = await rooms_coll.find_one({"_id": obj_id})

    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found.")

    room_doc["_id"] = str(room_doc["_id"])
    room_doc["diagram"] = str(room_doc.get("diagram", ""))
    room_doc["project"] = str(room_doc.get("project", ""))
    return room_doc


class MasksUpdate(BaseModel):
    masks: list
    groups: dict


@router.put("/{room_id}/masks")
async def update_room_masks(room_id: str, body: MasksUpdate):
    """
    Overwrites the masks_polygons.json file for a given room.
    """
    import os, json
    from services.project_service import LOCAL_FILE_DB

    room_doc = await get_room(room_id)
    project_id = room_doc.get("project")

    if not project_id:
        raise HTTPException(status_code=400, detail="Room does not have a valid project ID.")

    # Construct the path to where the masks_polygons.json is stored
    room_output_dir = os.path.join(LOCAL_FILE_DB, f"project_{project_id}", "rooms", str(room_id), "analysis")
    masks_polygons_json_path = os.path.join(room_output_dir, "masks_polygons.json")

    if not os.path.exists(room_output_dir):
        os.makedirs(room_output_dir, exist_ok=True)

    # Clean up frontend data to match masks_polygons.json structure
    # Remove 'mask_indices' since we use the 'group_id' on the mask itself now
    cleaned_groups = {}
    for g_id, g_data in body.groups.items():
        if "mask_indices" in g_data:
            del g_data["mask_indices"]
        cleaned_groups[g_id] = g_data

    # Attempt to read existing width and height from the file if it exists
    image_width = 0
    image_height = 0
    if os.path.exists(masks_polygons_json_path):
        try:
            with open(masks_polygons_json_path, 'r') as f:
                existing_data = json.load(f)
                image_width = existing_data.get("image_width", 0)
                image_height = existing_data.get("image_height", 0)
        except Exception:
            pass

    data_to_save = {
        "groups": cleaned_groups,
        "masks": body.masks,
        "image_width": image_width,
        "image_height": image_height
    }

    try:
        with open(masks_polygons_json_path, 'w') as f:
            json.dump(data_to_save, f, indent=4)
        return {"ok": True, "message": "Masks and groups successfully persisted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {e}")
