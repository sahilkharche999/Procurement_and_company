from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.mongo import get_rooms_collection, get_groups_collection, get_masks_collection
from schemas.room import RoomCreate


router = APIRouter(prefix="/rooms", tags=["Rooms"])


def _as_obj_id(id_value: str):
    try:
        if len(id_value) == 24 and ObjectId.is_valid(id_value):
            return ObjectId(id_value)
        return id_value
    except Exception:
        return id_value


def _to_object_id_list(id_values: list[str]) -> list[ObjectId]:
    out: list[ObjectId] = []
    for v in id_values:
        if isinstance(v, str) and len(v) == 24 and ObjectId.is_valid(v):
            out.append(ObjectId(v))
    return out


def _normalize_room_doc(room_doc: dict) -> dict:
    room_doc["_id"] = str(room_doc["_id"])
    room_doc["name"] = room_doc.get("name") or room_doc.get("room_name", "")
    room_doc["notes"] = room_doc.get("notes", "")
    room_doc["created_by"] = room_doc.get("created_by", "user")
    room_doc["is_included_in_budget"] = room_doc.get("is_included_in_budget", False)
    room_doc["diagram"] = str(room_doc.get("diagram", ""))
    room_doc["project"] = str(room_doc.get("project", ""))
    room_doc["image_width"] = int(room_doc.get("image_width", 0) or 0)
    room_doc["image_height"] = int(room_doc.get("image_height", 0) or 0)
    return room_doc


@router.get("/project/{project_id}")
async def get_rooms_by_project(project_id: str):
    rooms_coll = get_rooms_collection()
    cursor = rooms_coll.find({"project": project_id})
    docs = await cursor.to_list(1000)
    for d in docs:
        _normalize_room_doc(d)
    return docs


@router.post("/project/{project_id}", status_code=201)
async def create_room(project_id: str, body: RoomCreate):
    rooms_coll = get_rooms_collection()
    new_room = {
        "project": project_id,
        "name": body.name,
        "notes": body.notes,
        "created_by": body.created_by,
        "is_included_in_budget": body.is_included_in_budget,
        "image_width": body.image_width,
        "image_height": body.image_height,
    }
    res = await rooms_coll.insert_one(new_room)
    new_room["_id"] = str(res.inserted_id)
    return new_room


@router.get("/{room_id}")
async def get_room(room_id: str):
    rooms_coll = get_rooms_collection()
    # Handle if room_id is valid ObjectId or just a string
    obj_id = _as_obj_id(room_id)

    room_doc = await rooms_coll.find_one({"_id": obj_id})

    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found.")

    return _normalize_room_doc(room_doc)


@router.get("/{room_id}/editor-data/{project_id}")
async def get_room_editor_data(room_id: str, project_id: str):
    """
    DB-backed editor payload endpoint.
    Returns same shape as masks_polygons.json:
    {
      groups: { ... },
      masks: [ ... ],
      image_width: int,
      image_height: int,
    }
    """
    room_doc = await get_room(room_id)
    room_project = str(room_doc.get("project", ""))
    if room_project != str(project_id):
        raise HTTPException(status_code=404, detail="Room not found in provided project")

    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()

    group_docs = await groups_coll.find({"room": str(room_id), "project": str(project_id)}).to_list(5000)
    mask_docs = await masks_coll.find({"room": str(room_id), "project": str(project_id)}).to_list(20000)

    groups_map = {}
    for g in group_docs:
        gid = str(g["_id"])
        groups_map[gid] = {
            "id": gid,
            "name": g.get("name", ""),
            "code": g.get("code", ""),
            "color": g.get("color", [141, 106, 59]),
            "type": g.get("type", "FF&E"),
            "description": g.get("description", ""),
            "room": str(g.get("room", room_id)),
            "project": str(g.get("project", project_id)),
        }

    masks_out = []
    for m in mask_docs:
        raw_type = (m.get("mask_type") or m.get("type") or "label").lower()
        mask_type = raw_type if raw_type in {"label", "custom"} else "label"
        masks_out.append(
            {
                "id": str(m["_id"]),
                "group_id": str(m.get("group_id", "")),
                "project_id": str(project_id),
                "polygons": m.get("polygons", []),
                "source": m.get("source", "system"),
                "type": mask_type,
                "description": m.get("description", ""),
            }
        )

    return {
        "groups": groups_map,
        "masks": masks_out,
        "image_width": int(room_doc.get("image_width", 0) or 0),
        "image_height": int(room_doc.get("image_height", 0) or 0),
    }


class MasksUpdate(BaseModel):
    masks: list
    groups: dict


class IncludeInBudgetUpdate(BaseModel):
    is_included_in_budget: bool


@router.put("/{room_id}/masks")
async def update_room_masks(room_id: str, body: MasksUpdate):
    """
    Persists editor masks/groups into MongoDB.
    DB is the source of truth.
    """
    room_doc = await get_room(room_id)
    project_id = str(room_doc.get("project", ""))

    if not project_id:
        raise HTTPException(status_code=400, detail="Room does not have a valid project ID.")

    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()

    # 1) Upsert groups and build id remap for any non-Mongo ids.
    cleaned_groups = {}
    group_id_map: dict[str, str] = {}
    canonical_group_ids: list[str] = []

    for g_id, g_data in body.groups.items():
        group_doc = {
            "name": g_data.get("name", ""),
            "code": g_data.get("code", ""),
            "color": g_data.get("color", [141, 106, 59]),
            "type": g_data.get("type", "FF&E"),
            "description": g_data.get("description", ""),
            "room": str(room_id),
            "project": str(project_id),
        }

        if isinstance(g_id, str) and len(g_id) == 24 and ObjectId.is_valid(g_id):
            oid = ObjectId(g_id)
            await groups_coll.update_one({"_id": oid}, {"$set": group_doc}, upsert=True)
            canonical_id = str(oid)
        else:
            inserted = await groups_coll.insert_one(group_doc)
            canonical_id = str(inserted.inserted_id)

        cleaned_groups[canonical_id] = {
            "id": canonical_id,
            **group_doc,
        }
        group_id_map[str(g_id)] = canonical_id
        canonical_group_ids.append(canonical_id)

    # Delete stale groups for this room/project not present in latest payload
    canonical_group_obj_ids = _to_object_id_list(canonical_group_ids)
    if canonical_group_obj_ids:
        await groups_coll.delete_many(
            {
                "room": str(room_id),
                "project": str(project_id),
                "_id": {"$nin": canonical_group_obj_ids},
            }
        )
    else:
        await groups_coll.delete_many({"room": str(room_id), "project": str(project_id)})

    # 2) Upsert masks, remapping group ids as needed.
    persisted_masks = []
    canonical_mask_ids: list[str] = []

    for mask in body.masks:
        incoming_group_id = str(mask.get("group_id", ""))
        canonical_group_id = group_id_map.get(incoming_group_id, incoming_group_id)
        group_meta = cleaned_groups.get(canonical_group_id, {})

        raw_type = (mask.get("type") or mask.get("mask_type") or "label").lower()
        mask_type = raw_type if raw_type in {"label", "custom"} else "label"

        mask_doc = {
            "name": group_meta.get("name", ""),
            "code": group_meta.get("code", ""),
            "color": group_meta.get("color", [141, 106, 59]),
            "type": group_meta.get("type", "FF&E"),
            "description": mask.get("description", group_meta.get("description", "")),
            "room": str(room_id),
            "project": str(project_id),
            "group_id": canonical_group_id,
            "polygons": mask.get("polygons", []),
            "source": mask.get("source", "user"),
            "mask_type": mask_type,
        }

        incoming_mask_id = str(mask.get("id", ""))
        if len(incoming_mask_id) == 24 and ObjectId.is_valid(incoming_mask_id):
            mask_oid = ObjectId(incoming_mask_id)
            await masks_coll.update_one({"_id": mask_oid}, {"$set": mask_doc}, upsert=True)
            canonical_mask_id = str(mask_oid)
        else:
            inserted = await masks_coll.insert_one(mask_doc)
            canonical_mask_id = str(inserted.inserted_id)

        canonical_mask_ids.append(canonical_mask_id)
        persisted_masks.append(
            {
                "id": canonical_mask_id,
                "group_id": canonical_group_id,
                "project_id": project_id,
                "polygons": mask_doc["polygons"],
                "source": mask_doc["source"],
                "type": mask_doc["mask_type"],
                "description": mask_doc["description"],
            }
        )

    # Delete stale masks for this room/project not present in latest payload
    canonical_mask_obj_ids = _to_object_id_list(canonical_mask_ids)
    if canonical_mask_obj_ids:
        await masks_coll.delete_many(
            {
                "room": str(room_id),
                "project": str(project_id),
                "_id": {"$nin": canonical_mask_obj_ids},
            }
        )
    else:
        await masks_coll.delete_many({"room": str(room_id), "project": str(project_id)})

    return {
        "ok": True,
        "message": "Masks and groups successfully persisted to database.",
        "groups": cleaned_groups,
        "masks": persisted_masks,
        "image_width": int(room_doc.get("image_width", 0) or 0),
        "image_height": int(room_doc.get("image_height", 0) or 0),
    }


@router.patch("/{room_id}/include-in-budget")
async def update_room_include_in_budget(room_id: str, body: IncludeInBudgetUpdate):
    rooms_coll = get_rooms_collection()

    obj_id = _as_obj_id(room_id)

    result = await rooms_coll.update_one(
        {"_id": obj_id},
        {"$set": {"is_included_in_budget": body.is_included_in_budget}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found.")

    updated = await rooms_coll.find_one({"_id": obj_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Room not found.")

    return _normalize_room_doc(updated)
