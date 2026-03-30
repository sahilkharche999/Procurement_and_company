from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from db.mongo import get_groups_collection, get_masks_collection, get_rooms_collection
from schemas.group import GroupCreate, GroupUpdate


router = APIRouter(prefix="/groups", tags=["Groups"])


def _as_obj_id(id_value: str):
    try:
        if len(id_value) == 24 and ObjectId.is_valid(id_value):
            return ObjectId(id_value)
        return id_value
    except Exception:
        return id_value


def _serialize_group(doc: dict) -> dict:
    d = dict(doc)
    d["_id"] = str(d["_id"])
    d["name"] = d.get("name", "")
    d["code"] = d.get("code", "")
    d["color"] = d.get("color", [141, 106, 59])
    d["type"] = d.get("type", "FF&E")
    d["user_entered_qty"] = d.get("user_entered_qty")
    d["room"] = str(d.get("room", ""))
    d["project"] = str(d.get("project", ""))
    return d


@router.get("")
async def list_groups(
    search: str = Query(""),
    group_type: str = Query("", alias="type"),
    room: str = Query(""),
    project: str = Query(""),
):
    coll = get_groups_collection()
    filt: dict = {}
    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
        ]
    if group_type:
        filt["type"] = group_type
    if room:
        filt["room"] = room
    if project:
        filt["project"] = project

    docs = await coll.find(filt).sort("name", 1).to_list(2000)
    return [_serialize_group(d) for d in docs]


@router.get("/{group_id}")
async def get_group(group_id: str):
    coll = get_groups_collection()
    doc = await coll.find_one({"_id": _as_obj_id(group_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Group not found")
    return _serialize_group(doc)


@router.post("", status_code=201)
async def create_group(body: GroupCreate):
    coll = get_groups_collection()
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
    res = await coll.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc


@router.put("/{group_id}")
async def update_group(group_id: str, body: GroupUpdate):
    coll = get_groups_collection()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        doc = await coll.find_one({"_id": _as_obj_id(group_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Group not found")
        return _serialize_group(doc)

    result = await coll.update_one({"_id": _as_obj_id(group_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")

    updated = await coll.find_one({"_id": _as_obj_id(group_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Group not found")
    return _serialize_group(updated)


@router.delete("/{group_id}")
async def delete_group(group_id: str):
    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()

    result = await groups_coll.delete_one({"_id": _as_obj_id(group_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")

    # Cascade-delete masks linked to this group.
    # group_id is persisted as string in editor state, so we delete by string id.
    masks_delete_result = await masks_coll.delete_many(
        {"group_id": {"$in": [group_id, _as_obj_id(group_id)]}}
    )

    return {"ok": True, "deleted_masks": masks_delete_result.deleted_count}
