from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from db.mongo import get_masks_collection, get_rooms_collection
from schemas.mask import MaskCreate, MaskUpdate


router = APIRouter(prefix="/masks", tags=["Masks"])


def _as_obj_id(id_value: str):
    try:
        if len(id_value) == 24 and ObjectId.is_valid(id_value):
            return ObjectId(id_value)
        return id_value
    except Exception:
        return id_value


def _serialize_mask(doc: dict) -> dict:
    d = dict(doc)
    d["_id"] = str(d["_id"])
    d["name"] = d.get("name", "")
    d["code"] = d.get("code", "")
    d["color"] = d.get("color", [141, 106, 59])
    d["type"] = d.get("type", "FF&E")
    d["description"] = d.get("description", "")
    d["room"] = str(d.get("room", ""))
    d["project"] = str(d.get("project", ""))
    d["group_id"] = str(d.get("group_id", ""))
    d["polygons"] = d.get("polygons", [])
    d["source"] = d.get("source", "system")
    d["mask_type"] = d.get("mask_type", d.get("type", "label")).lower()
    raw_parent_mask = d.get("parent_mask")
    d["parent_mask"] = str(raw_parent_mask) if raw_parent_mask else None
    d["is_sub_mask"] = bool(d.get("is_sub_mask", False))
    return d


@router.get("")
async def list_masks(
    search: str = Query(""),
    room: str = Query(""),
    project: str = Query(""),
    group_id: str = Query(""),
    mask_type: str = Query(""),
):
    coll = get_masks_collection()
    filt: dict = {}

    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if room:
        filt["room"] = room
    if project:
        filt["project"] = project
    if group_id:
        filt["group_id"] = group_id
    if mask_type:
        filt["mask_type"] = mask_type.lower()

    docs = await coll.find(filt).sort("name", 1).to_list(5000)
    return [_serialize_mask(d) for d in docs]


@router.get("/{mask_id}")
async def get_mask(mask_id: str):
    coll = get_masks_collection()
    doc = await coll.find_one({"_id": _as_obj_id(mask_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Mask not found")
    return _serialize_mask(doc)


@router.post("", status_code=201)
async def create_mask(body: MaskCreate):
    coll = get_masks_collection()
    rooms_coll = get_rooms_collection()

    room_id = body.room
    if not room_id:
        raise HTTPException(status_code=400, detail="room is required")

    room_doc = await rooms_coll.find_one({"_id": _as_obj_id(room_id)})
    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found")

    project_id = str(room_doc.get("project", ""))
    if not project_id:
        raise HTTPException(status_code=400, detail="Room does not have a valid project")

    doc = body.model_dump()
    doc["room"] = str(room_id)
    doc["project"] = project_id
    doc["mask_type"] = (doc.get("mask_type") or "label").lower()
    parent_mask = doc.get("parent_mask")
    doc["parent_mask"] = str(parent_mask).strip() if parent_mask else None
    doc["is_sub_mask"] = bool(doc.get("is_sub_mask", False))

    res = await coll.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc


@router.put("/{mask_id}")
async def update_mask(mask_id: str, body: MaskUpdate):
    coll = get_masks_collection()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        doc = await coll.find_one({"_id": _as_obj_id(mask_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Mask not found")
        return _serialize_mask(doc)

    if "mask_type" in updates and updates["mask_type"]:
        updates["mask_type"] = updates["mask_type"].lower()
    if "parent_mask" in updates:
        parent_mask = updates.get("parent_mask")
        updates["parent_mask"] = str(parent_mask).strip() if parent_mask else None
    if "is_sub_mask" in updates:
        updates["is_sub_mask"] = bool(updates.get("is_sub_mask"))

    result = await coll.update_one({"_id": _as_obj_id(mask_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mask not found")

    updated = await coll.find_one({"_id": _as_obj_id(mask_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Mask not found")
    return _serialize_mask(updated)


@router.delete("/{mask_id}")
async def delete_mask(mask_id: str):
    coll = get_masks_collection()
    result = await coll.delete_one({"_id": _as_obj_id(mask_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mask not found")
    return {"ok": True}
