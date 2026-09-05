"""
services/settings/item_types_config_service.py
Business logic for Settings -> Item Types config collection.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from db.mongo import get_item_types_config_collection

# Item types that ship with the product. They are always offered in the UI and
# are protected: they cannot be edited or deleted from Settings.
SYSTEM_ITEM_TYPE_NAMES = ("COM/COL", "FF&E", "OFCI")
_SYSTEM_ITEM_TYPE_KEYS = {name.strip().lower() for name in SYSTEM_ITEM_TYPE_NAMES}


def is_system_item_type_name(name: str) -> bool:
    """True when `name` is one of the protected system defaults (case-insensitive)."""
    return str(name or "").strip().lower() in _SYSTEM_ITEM_TYPE_KEYS


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize(doc: dict) -> dict:
    data = dict(doc)
    data["_id"] = str(data["_id"])
    data["name"] = str(data.get("name", "")).strip()
    data["description"] = str(data.get("description", "")).strip()
    data["is_system"] = is_system_item_type_name(data["name"])
    return data


async def list_item_types(
    search: str = "",
    include_deleted: bool = False,
) -> dict:
    coll = get_item_types_config_collection()
    filt: dict = {}

    if not include_deleted:
        filt["is_deleted"] = {"$ne": True}

    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    total = await coll.count_documents(filt)
    cursor = coll.find(filt).sort([("name", 1), ("_id", 1)])
    docs = await cursor.to_list(None)

    return {
        "items": [_serialize(d) for d in docs],
        "total": total,
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
        "is_deleted": False,
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
    result = await coll.update_one(
        {"_id": ObjectId(item_type_id)},
        {"$set": {"is_deleted": True, "updated_at": _now()}},
    )
    return result.matched_count == 1
