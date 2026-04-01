from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from db.mongo import get_groups_collection, get_masks_collection, get_rooms_collection
from schemas.group import GroupCreate, GroupUpdate


router = APIRouter(prefix="/groups", tags=["Groups"])


def _normalize_group_code(code: str | None) -> str:
    return str(code or "").strip().lower()


async def _find_duplicate_group_code(
    coll,
    *,
    room_id: str,
    code: str | None,
    exclude_group_id: str | None = None,
):
    normalized_code = _normalize_group_code(code)
    if not normalized_code:
        return None

    filt: dict = {"room": str(room_id)}
    if exclude_group_id:
        filt["_id"] = {"$ne": _as_obj_id(exclude_group_id)}

    docs = await coll.find(filt, {"_id": 1, "code": 1}).to_list(5000)
    for doc in docs:
        if _normalize_group_code(doc.get("code")) == normalized_code:
            return doc
    return None


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
    d["description"] = d.get("description", "")
    d["code"] = d.get("code", "")
    d["color"] = d.get("color", [141, 106, 59])
    d["type"] = d.get("type", "FF&E")
    raw_unit_id = d.get("unit_id")
    d["unit_id"] = str(raw_unit_id) if raw_unit_id else None
    d["user_entered_qty"] = d.get("user_entered_qty")
    d["size"] = d.get("size")
    d["parent_group"] = str(d.get("parent_group")) if d.get("parent_group") else None
    d["is_subgroup"] = bool(d.get("is_subgroup", False))
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

    duplicate = await _find_duplicate_group_code(
        coll,
        room_id=str(room_id),
        code=body.code,
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Group code already exists in this room. Please use a unique spec number.",
        )

    doc = body.model_dump()
    doc["code"] = str(doc.get("code", "")).strip()
    doc["parent_group"] = (
        str(doc.get("parent_group")).strip() if doc.get("parent_group") else None
    ) or None
    doc["is_subgroup"] = bool(doc.get("is_subgroup", False))
    doc["room"] = str(room_id)
    doc["project"] = project_id
    res = await coll.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc


@router.post("/subgroup", status_code=201)
async def create_subgroup(body: GroupCreate):
    coll = get_groups_collection()
    rooms_coll = get_rooms_collection()

    room_id = body.room
    if not room_id:
        raise HTTPException(status_code=400, detail="room is required")

    parent_group_id = str(body.parent_group or "").strip()
    if not parent_group_id:
        raise HTTPException(status_code=400, detail="parent_group is required")

    parent = await coll.find_one({"_id": _as_obj_id(parent_group_id)})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent group not found")

    if str(parent.get("room", "")) != str(room_id):
        raise HTTPException(status_code=400, detail="Parent group does not belong to provided room")

    room_doc = await rooms_coll.find_one({"_id": _as_obj_id(room_id)})
    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found")

    project_id = str(room_doc.get("project", ""))
    if not project_id:
        raise HTTPException(status_code=400, detail="Room does not have a valid project")

    duplicate = await _find_duplicate_group_code(
        coll,
        room_id=str(room_id),
        code=body.code,
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Group code already exists in this room. Please use a unique spec number.",
        )

    doc = body.model_dump()
    doc["code"] = str(doc.get("code", "")).strip()
    doc["parent_group"] = parent_group_id
    doc["is_subgroup"] = True
    doc["room"] = str(room_id)
    doc["project"] = project_id

    res = await coll.insert_one(doc)
    created = await coll.find_one({"_id": res.inserted_id})
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create subgroup")
    return _serialize_group(created)


@router.put("/{group_id}")
async def update_group(group_id: str, body: GroupUpdate):
    coll = get_groups_collection()
    existing = await coll.find_one({"_id": _as_obj_id(group_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        return _serialize_group(existing)

    incoming_code = updates.get("code", existing.get("code", ""))
    duplicate = await _find_duplicate_group_code(
        coll,
        room_id=str(existing.get("room", "")),
        code=incoming_code,
        exclude_group_id=group_id,
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Group code already exists in this room. Please use a unique spec number.",
        )

    if "code" in updates:
        updates["code"] = str(updates.get("code", "")).strip()

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
