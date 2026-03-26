"""
services/item_service.py
Business logic for the MongoDB items collection used by Price Register.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from db.mongo import get_items_collection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize(doc: dict) -> dict:
    data = dict(doc)
    data["_id"] = str(data["_id"])
    data["name"] = data.get("name", "")
    data["code"] = data.get("code", "")
    data["type"] = data.get("type", "FF&E")
    data["description"] = data.get("description", "")
    data["price"] = float(data.get("price", 0) or 0)
    data["extended_price"] = float(data.get("extended_price", 0) or 0)
    return data


async def list_items(
    page: int = 1,
    page_size: int = 12,
    search: str = "",
    sort_by: str = "name",
    sort_order: str = "asc",
) -> dict:
    coll = get_items_collection()

    filt: dict = {}
    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"type": {"$regex": search, "$options": "i"}},
        ]

    safe_sort_field = "name" if sort_by not in {"name"} else sort_by
    safe_sort_direction = 1 if str(sort_order).lower() == "asc" else -1

    total = await coll.count_documents(filt)
    cursor = (
        coll.find(filt)
        .sort([(safe_sort_field, safe_sort_direction), ("_id", 1)])
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


async def create_item(data: dict) -> dict:
    coll = get_items_collection()
    now = _now()

    doc = {
        "name": data.get("name", "").strip(),
        "code": data.get("code", "").strip(),
        "type": data.get("type", "FF&E"),
        "description": data.get("description", "").strip(),
        "price": float(data.get("price", 0) or 0),
        "extended_price": float(data.get("extended_price", 0) or 0),
        "created_at": now,
        "updated_at": now,
    }

    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


async def update_item(item_id: str, updates: dict) -> dict | None:
    if not ObjectId.is_valid(item_id):
        return None

    coll = get_items_collection()
    doc = await coll.find_one({"_id": ObjectId(item_id)})
    if not doc:
        return None

    patch = {k: v for k, v in updates.items() if v is not None}
    if "name" in patch:
        patch["name"] = str(patch["name"]).strip()
    if "code" in patch:
        patch["code"] = str(patch["code"]).strip()
    if "description" in patch:
        patch["description"] = str(patch["description"]).strip()
    if "price" in patch:
        patch["price"] = float(patch.get("price") or 0)
    if "extended_price" in patch:
        patch["extended_price"] = float(patch.get("extended_price") or 0)

    patch["updated_at"] = _now()

    await coll.update_one({"_id": ObjectId(item_id)}, {"$set": patch})
    updated = await coll.find_one({"_id": ObjectId(item_id)})
    return _serialize(updated) if updated else None


async def delete_item(item_id: str) -> bool:
    if not ObjectId.is_valid(item_id):
        return False

    coll = get_items_collection()
    result = await coll.delete_one({"_id": ObjectId(item_id)})
    return result.deleted_count == 1
