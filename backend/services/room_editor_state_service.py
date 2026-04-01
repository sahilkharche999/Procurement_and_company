from __future__ import annotations

from bson import ObjectId
from fastapi import HTTPException

from db.mongo import get_groups_collection, get_masks_collection, get_rooms_collection


def as_obj_id(id_value: str):
    try:
        if len(id_value) == 24 and ObjectId.is_valid(id_value):
            return ObjectId(id_value)
        return id_value
    except Exception:
        return id_value


def to_object_id_list(id_values: list[str]) -> list[ObjectId]:
    out: list[ObjectId] = []
    for value in id_values:
        if isinstance(value, str) and len(value) == 24 and ObjectId.is_valid(value):
            out.append(ObjectId(value))
    return out


def normalize_room_doc(room_doc: dict) -> dict:
    room_doc["_id"] = str(room_doc["_id"])
    room_doc["name"] = room_doc.get("name") or room_doc.get("room_name", "")
    room_doc["notes"] = room_doc.get("notes", "")
    room_doc["created_by"] = room_doc.get("created_by", "user")
    room_doc["is_included_in_budget"] = room_doc.get("is_included_in_budget", False)
    room_doc["diagram"] = str(room_doc.get("diagram", ""))
    room_doc["project"] = str(room_doc.get("project", ""))
    room_doc["image_width"] = int(room_doc.get("image_width", 0) or 0)
    room_doc["image_height"] = int(room_doc.get("image_height", 0) or 0)
    raw_scale = room_doc.get("scale_factor_feet_per_pixel")
    room_doc["scale_factor_feet_per_pixel"] = (
        float(raw_scale) if raw_scale is not None else None
    )
    return room_doc


async def fetch_room_or_404(room_id: str) -> dict:
    rooms_coll = get_rooms_collection()
    room_doc = await rooms_coll.find_one({"_id": as_obj_id(room_id)})
    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found.")
    return normalize_room_doc(room_doc)


async def build_editor_state_payload(room_id: str, project_id: str) -> dict:
    room_doc = await fetch_room_or_404(room_id)
    room_project = str(room_doc.get("project", ""))
    if room_project != str(project_id):
        raise HTTPException(status_code=404, detail="Room not found in provided project")

    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()

    group_docs = await groups_coll.find(
        {"room": str(room_id), "project": str(project_id)}
    ).to_list(5000)
    mask_docs = await masks_coll.find(
        {"room": str(room_id), "project": str(project_id)}
    ).to_list(20000)

    groups_map = {}
    for group in group_docs:
        gid = str(group["_id"])
        groups_map[gid] = {
            "id": gid,
            "name": group.get("name", ""),
            "code": group.get("code", ""),
            "color": group.get("color", [141, 106, 59]),
            "type": group.get("type", "FF&E"),
            "unit_id": str(group.get("unit_id")) if group.get("unit_id") else None,
            "user_entered_qty": group.get("user_entered_qty"),
            "size": group.get("size"),
            "parent_group": str(group.get("parent_group")) if group.get("parent_group") else None,
            "is_subgroup": bool(group.get("is_subgroup", False)),
            "description": group.get("description", ""),
            "room": str(group.get("room", room_id)),
            "project": str(group.get("project", project_id)),
        }

    masks_out = []
    for mask in mask_docs:
        raw_type = (mask.get("mask_type") or mask.get("type") or "label").lower()
        mask_type = raw_type if raw_type in {"label", "custom"} else "label"
        masks_out.append(
            {
                "id": str(mask["_id"]),
                "group_id": str(mask.get("group_id", "")),
                "project_id": str(project_id),
                "polygons": mask.get("polygons", []),
                "source": mask.get("source", "system"),
                "type": mask_type,
                "description": mask.get("description", ""),
            }
        )

    return {
        "groups": groups_map,
        "masks": masks_out,
        "image_width": int(room_doc.get("image_width", 0) or 0),
        "image_height": int(room_doc.get("image_height", 0) or 0),
    }


async def persist_editor_state(room_id: str, project_id: str, groups: dict, masks: list) -> dict:
    room_doc = await fetch_room_or_404(room_id)
    room_project = str(room_doc.get("project", ""))
    if room_project != str(project_id):
        raise HTTPException(status_code=404, detail="Room not found in provided project")

    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()

    cleaned_groups = {}
    group_id_map: dict[str, str] = {}
    canonical_group_ids: list[str] = []

    for g_id, g_data in groups.items():
        group_doc = {
            "name": g_data.get("name", ""),
            "code": g_data.get("code", ""),
            "color": g_data.get("color", [141, 106, 59]),
            "type": g_data.get("type", "FF&E"),
            "unit_id": (str(g_data.get("unit_id")).strip() if g_data.get("unit_id") is not None else "") or None,
            "user_entered_qty": g_data.get("user_entered_qty"),
            "size": g_data.get("size"),
            "parent_group": (str(g_data.get("parent_group")).strip() if g_data.get("parent_group") else None) or None,
            "is_subgroup": bool(g_data.get("is_subgroup", False)),
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

    canonical_group_obj_ids = to_object_id_list(canonical_group_ids)
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

    persisted_masks = []
    canonical_mask_ids: list[str] = []

    for mask in masks:
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
                "project_id": str(project_id),
                "polygons": mask_doc["polygons"],
                "source": mask_doc["source"],
                "type": mask_doc["mask_type"],
                "description": mask_doc["description"],
            }
        )

    canonical_mask_obj_ids = to_object_id_list(canonical_mask_ids)
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
        "message": "Editor state persisted to database.",
        "groups": cleaned_groups,
        "masks": persisted_masks,
        "image_width": int(room_doc.get("image_width", 0) or 0),
        "image_height": int(room_doc.get("image_height", 0) or 0),
    }


async def update_room_budget_inclusion(room_id: str, is_included_in_budget: bool) -> dict:
    rooms_coll = get_rooms_collection()
    obj_id = as_obj_id(room_id)

    result = await rooms_coll.update_one(
        {"_id": obj_id},
        {"$set": {"is_included_in_budget": is_included_in_budget}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found.")

    updated = await rooms_coll.find_one({"_id": obj_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Room not found.")

    return normalize_room_doc(updated)


async def update_room_scale_factor(room_id: str, scale_factor_feet_per_pixel: float | None) -> dict:
    rooms_coll = get_rooms_collection()
    obj_id = as_obj_id(room_id)

    result = await rooms_coll.update_one(
        {"_id": obj_id},
        {"$set": {"scale_factor_feet_per_pixel": scale_factor_feet_per_pixel}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found.")

    updated = await rooms_coll.find_one({"_id": obj_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Room not found.")

    return normalize_room_doc(updated)
