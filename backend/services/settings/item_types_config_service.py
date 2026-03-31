"""
services/settings/item_types_config_service.py
Business logic for Settings -> Item Types config collection.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from db.mongo import get_item_types_config_collection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize(doc: dict) -> dict:
    data = dict(doc)
    data["_id"] = str(data["_id"])
    data["name"] = str(data.get("name", "")).strip()
    data["description"] = str(data.get("description", "")).strip()
    return data


async def list_item_types(
    page: int = 1,
    page_size: int = 50,
    search: str = "",
) -> dict:
    coll = get_item_types_config_collection()
    filt: dict = {}

    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    total = await coll.count_documents(filt)
    cursor = (
        coll.find(filt)
        .sort([("name", 1), ("_id", 1)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    docs = await cursor.to_list(page_size)

    return {
        "items": [_serialize(d) for d in docs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def get_item_type(item_type_id: str) -> dict | None:
    coll = get_item_types_config_collection()
    if not ObjectId.is_valid(item_type_id):
        return None
    doc = await coll.find_one({"_id": ObjectId(item_type_id)})
    return _serialize(doc) if doc else None


async def create_item_type(data: dict) -> dict:
    coll = get_item_types_config_collection()
    now = _now()

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()

    doc = {
        "name": name,
        "description": description,
        "created_at": now,
        "updated_at": now,
    }

    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


async def update_item_type(item_type_id: str, updates: dict) -> dict | None:
    if not ObjectId.is_valid(item_type_id):
        return None

    coll = get_item_types_config_collection()
    existing = await coll.find_one({"_id": ObjectId(item_type_id)})
    if not existing:
        return None

    patch = {k: v for k, v in updates.items() if v is not None}
    if "name" in patch:
        patch["name"] = str(patch["name"]).strip()
    if "description" in patch:
        patch["description"] = str(patch["description"]).strip()

    patch["updated_at"] = _now()

    await coll.update_one({"_id": ObjectId(item_type_id)}, {"$set": patch})
    updated = await coll.find_one({"_id": ObjectId(item_type_id)})
    return _serialize(updated) if updated else None


async def delete_item_type(item_type_id: str) -> bool:
    if not ObjectId.is_valid(item_type_id):
        return False

    coll = get_item_types_config_collection()
    result = await coll.delete_one({"_id": ObjectId(item_type_id)})
    return result.deleted_count == 1
