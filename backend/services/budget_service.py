"""
services/budget_service.py
Business logic for the MongoDB budget_items collection.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from db.mongo import get_db
from services.budget_to_price_item_sync_service import sync_price_item_from_budget


def _col():
    return get_db()["budget_items"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _calc_extended(qty: str, unit_cost: Optional[float]) -> Optional[float]:
    """Parse qty string, extract leading number, multiply by unit_cost."""
    if unit_cost is None:
        return None
    m = re.match(r"[\s]*([0-9]+(?:\.[0-9]*)?)", str(qty or "1"))
    n = float(m.group(1)) if m else 1.0
    return round(n * unit_cost, 2)


def _serialize(doc: dict) -> dict:
    """Convert ObjectId → str for JSON serialisation."""
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("room"), ObjectId):
        doc["room"] = str(doc["room"])
    if isinstance(doc.get("vendor"), ObjectId):
        doc["vendor"] = str(doc["vendor"])
    return doc


def _resolve_room_name(room_value: str, room_map: dict[str, dict]) -> str:
    if not room_value:
        return "Unassigned Room"
    room_key = str(room_value)
    room_doc = room_map.get(room_key)
    if room_doc:
        return room_doc.get("name") or room_doc.get("room_name") or room_key
    if ObjectId.is_valid(room_key):
        return "Unknown Room"
    return room_key


def _resolve_vendor_name(vendor_value: str, vendor_map: dict[str, dict]) -> str:
    if not vendor_value:
        return ""
    vendor_key = str(vendor_value)
    vendor_doc = vendor_map.get(vendor_key)
    if vendor_doc:
        return vendor_doc.get("company_name") or vendor_key
    return vendor_key


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _max_order(project_id: str) -> int:
    col = _col()
    cur = col.find(
        {"project": project_id},
        {"order_index": 1}
    ).sort("order_index", -1).limit(1)
    docs = await cur.to_list(1)
    return docs[0]["order_index"] if docs else -1


# ── CRUD ─────────────────────────────────────────────────────────────────────

async def list_items(
        project_id: str,
        search: str = "",
        page: int = 1,
        page_size: int = 12,
        group_by_room: bool = False,
        group_by_page: bool = False,
        rooms_filter: str = "",
) -> dict:
    from db.mongo import get_rooms_collection, get_vendors_collection
    rooms_coll = get_rooms_collection()
    vendors_coll = get_vendors_collection()

    col = _col()
    filt: dict = {"project": project_id, "is_sub_item": {"$ne": True}}
    if search:
        filt["spec_no"] = {"$regex": search, "$options": "i"}

    print("fe")

    if rooms_filter:
        # expects a comma-separated string of pure mongoid room IDs
        rooms_list = [r.strip() for r in rooms_filter.split(",")]
        # Support fetching budget items which explicitly have no room or match the filter
        # It's better to just strictly use $in 
        filt["room"] = {"$in": rooms_list}

    total = await col.count_documents(filt)

    if group_by_page:
        sort_key = [("page_no", 1), ("order_index", 1)]
    elif group_by_room:
        sort_key = [("room", 1), ("order_index", 1)]
    else:
        sort_key = [("order_index", 1)]

    cursor = col.find(filt).sort(sort_key).skip((page - 1) * page_size).limit(page_size)
    docs = await cursor.to_list(page_size)

    # Preload rooms for population
    room_ids = list({ObjectId(d["room"]) for d in docs if d.get("room") and ObjectId.is_valid(str(d["room"]))})
    if room_ids:
        rooms = await rooms_coll.find({"_id": {"$in": room_ids}}).to_list(None)
        room_map = {str(r["_id"]): r for r in rooms}
        for r in room_map.values():
            r["_id"] = str(r["_id"])
    else:
        room_map = {}

    # Preload vendors for population
    vendor_ids = list({ObjectId(d["vendor"]) for d in docs if d.get("vendor") and ObjectId.is_valid(str(d["vendor"]))})
    if vendor_ids:
        vendors = await vendors_coll.find({"_id": {"$in": vendor_ids}}).to_list(None)
        vendor_map = {str(v["_id"]): v for v in vendors}
    else:
        vendor_map = {}

    for d in docs:
        d["room_name"] = _resolve_room_name(d.get("room", ""), room_map)
        d["vendor_name"] = _resolve_vendor_name(d.get("vendor", ""), vendor_map)

    # Fetch subitems
    all_subitem_ids = []
    for d in docs:
        sub_list = d.get("subitems", [])
        if sub_list and isinstance(sub_list, list):
            # some might be dictionaries or strings, we expect strings
            all_subitem_ids.extend([ObjectId(s) for s in sub_list if ObjectId.is_valid(s)])

    subitems_map = {}
    if all_subitem_ids:
        sub_docs = await col.find({"_id": {"$in": all_subitem_ids}}).to_list(None)
        for s in sub_docs:
            s["room_name"] = _resolve_room_name(s.get("room", ""), room_map)
            s["vendor_name"] = _resolve_vendor_name(s.get("vendor", ""), vendor_map)
            subitems_map[str(s["_id"])] = _serialize(s)

    items = []
    for d in docs:
        d_serial = _serialize(d)
        resolved_subitems = []
        for sid in d.get("subitems", []):
            if isinstance(sid, str) and sid in subitems_map:
                resolved_subitems.append(subitems_map[sid])
        d_serial["subitems"] = resolved_subitems
        items.append(d_serial)

    # Grand total (all non-hidden, not just this page)
    all_cursor = col.find(filt, {"extended": 1, "hidden_from_total": 1, "room": 1})
    all_docs = await all_cursor.to_list(None)

    # Preload all rooms for totals
    all_room_ids = list({ObjectId(d["room"]) for d in all_docs if d.get("room") and ObjectId.is_valid(str(d["room"]))})
    all_room_map = {}
    if all_room_ids:
        all_rooms = await rooms_coll.find({"_id": {"$in": all_room_ids}}).to_list(None)
        all_room_map = {
            str(r["_id"]): (r.get("name") or r.get("room_name") or str(r["_id"]))
            for r in all_rooms
        }

    grand_total = sum(
        (d.get("extended") or 0) for d in all_docs if not d.get("hidden_from_total")
    )

    room_totals: dict[str, float] = {}
    for d in all_docs:
        raw_room_id = str(d.get("room", "")) if d.get("room") else ""
        key = str(all_room_map.get(raw_room_id, raw_room_id)) if raw_room_id else "Unassigned Room"
        room_totals[key] = room_totals.get(key, 0.0) + (
            (d.get("extended") or 0) if not d.get("hidden_from_total") else 0.0
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_subtotal": grand_total,
        "room_totals": room_totals,
    }


async def export_items(
        project_id: str,
        group_by_room: bool = False,
        group_by_page: bool = False,
) -> dict:
    from db.mongo import get_rooms_collection
    rooms_coll = get_rooms_collection()

    col = _col()
    filt = {"project": project_id, "is_sub_item": {"$ne": True}}

    if group_by_page:
        sort = [("page_no", 1), ("order_index", 1)]
    elif group_by_room:
        sort = [("room", 1), ("order_index", 1)]
    else:
        sort = [("order_index", 1)]

    docs = await col.find(filt).sort(sort).to_list(None)

    room_ids = list({ObjectId(d["room"]) for d in docs if d.get("room") and ObjectId.is_valid(str(d["room"]))})
    if room_ids:
        rooms = await rooms_coll.find({"_id": {"$in": room_ids}}).to_list(None)
        room_map = {str(r["_id"]): r for r in rooms}
        for r in room_map.values():
            r["_id"] = str(r["_id"])
    else:
        room_map = {}

    # Preload vendors
    vendor_ids = list({ObjectId(d["vendor"]) for d in docs if d.get("vendor") and ObjectId.is_valid(str(d["vendor"]))})
    if vendor_ids:
        vendors = await vendors_coll.find({"_id": {"$in": vendor_ids}}).to_list(None)
        vendor_map = {str(v["_id"]): v for v in vendors}
    else:
        vendor_map = {}

    for d in docs:
        d["room_name"] = _resolve_room_name(d.get("room", ""), room_map)
        d["vendor_name"] = _resolve_vendor_name(d.get("vendor", ""), vendor_map)

    # Resolve subitems properly
    all_subitem_ids = []
    for d in docs:
        sub_list = d.get("subitems", [])
        if sub_list and isinstance(sub_list, list):
            all_subitem_ids.extend([ObjectId(s) for s in sub_list if isinstance(s, str) and ObjectId.is_valid(s)])

    subitems_map = {}
    if all_subitem_ids:
        sub_docs = await col.find({"_id": {"$in": all_subitem_ids}}).to_list(None)
        for s in sub_docs:
            s["room_name"] = _resolve_room_name(s.get("room", ""), room_map)
            s["vendor_name"] = _resolve_vendor_name(s.get("vendor", ""), vendor_map)
            subitems_map[str(s["_id"])] = _serialize(s)

    items = []
    for d in docs:
        d_serial = _serialize(d)
        resolved_subitems = []
        for sid in d.get("subitems", []):
            if isinstance(sid, str) and sid in subitems_map:
                resolved_subitems.append(subitems_map[sid])
        d_serial["subitems"] = resolved_subitems
        items.append(d_serial)

    grand_total = sum((d.get("extended") or 0) for d in docs if not d.get("hidden_from_total"))
    room_totals: dict[str, float] = {}
    for d in docs:
        raw_room_id = str(d.get("room", "")) if d.get("room") else ""
        mapped_room = room_map.get(raw_room_id, {})
        room_name = (
            mapped_room.get("name") or mapped_room.get("room_name") or raw_room_id
        ) if isinstance(mapped_room, dict) else raw_room_id
        key = str(room_name) if raw_room_id else "Unassigned Room"
        room_totals[key] = room_totals.get(key, 0.0) + (
            (d.get("extended") or 0) if not d.get("hidden_from_total") else 0.0
        )

    return {"items": items, "grand_total": grand_total, "room_totals": room_totals}


async def create_item(project_id: str, data: dict) -> dict:
    col = _col()
    ref_id = data.pop("insert_relative_to", None)
    position = data.pop("position", "below")

    if ref_id and ObjectId.is_valid(ref_id):
        ref = await col.find_one({"_id": ObjectId(ref_id)})
        if ref:
            pivot = ref["order_index"]
            new_index = pivot if position == "above" else pivot + 1
            # Shift everything >= new_index up by 1
            await col.update_many(
                {"project": project_id, "order_index": {"$gte": new_index}},
                {"$inc": {"order_index": 1}},
            )
        else:
            new_index = await _max_order(project_id) + 1
    else:
        new_index = await _max_order(project_id) + 1

    qty_value = str(data.get("qty", "1") or "1")
    user_entered_qty = data.get("user_entered_qty")
    if user_entered_qty is not None:
        user_entered_qty = str(user_entered_qty).strip() or None
    effective_qty = user_entered_qty or qty_value
    extended = _calc_extended(effective_qty, data.get("unit_cost"))
    now = _now()
    doc = {
        "project": project_id,
        "page_id": data.get("page_id", ""),
        "room": data.get("room", ""),
        "spec_no": data.get("spec_no", ""),
        "name": data.get("name", ""),
        "description": data.get("description", ""),
        "group_id": data.get("group_id", ""),
        "type": data.get("type", "FF&E"),
        "page_no": data.get("page_no"),
        "qty": qty_value,
        "vendor": data.get("vendor", ""),
        "user_entered_qty": user_entered_qty,
        "unit_cost": data.get("unit_cost"),
        "extended": extended,
        "order_index": new_index,
        "hidden_from_total": data.get("hidden_from_total", False),
        "is_sub_item": data.get("is_sub_item", False),
        "created_by": data.get("created_by", "user"),
        "subitems": data.get("subitems", []),
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # Mirror into price register dictionary (items collection).
    await sync_price_item_from_budget(doc)
    return doc


async def get_item(item_id: str) -> dict | None:
    if not ObjectId.is_valid(item_id):
        return None
    col = _col()
    doc = await col.find_one({"_id": ObjectId(item_id)})
    if not doc:
        return None

    doc_serial = _serialize(doc)

    # Resolve subitems for the single fetched document
    sub_list = doc_serial.get("subitems", [])
    if sub_list and isinstance(sub_list, list):
        sub_ids = [ObjectId(s) for s in sub_list if isinstance(s, str) and ObjectId.is_valid(s)]
        if sub_ids:
            sub_docs = await col.find({"_id": {"$in": sub_ids}}).to_list(None)
            sub_map = {str(s["_id"]): _serialize(s) for s in sub_docs}
            resolved = []
            for s in sub_list:
                if isinstance(s, str) and s in sub_map:
                    resolved.append(sub_map[s])
                elif isinstance(s, dict):  # robust for old data
                    resolved.append(s)
            doc_serial["subitems"] = resolved

    return doc_serial


async def update_item(item_id: str, updates: dict) -> dict | None:
    if not ObjectId.is_valid(item_id):
        return None
    col = _col()
    doc = await col.find_one({"_id": ObjectId(item_id)})
    if not doc:
        return None

    # Manual qty edit should be tracked in user_entered_qty only.
    if "qty" in updates:
        raw_qty = updates.pop("qty")
        cleaned_qty = str(raw_qty).strip() if raw_qty is not None else ""
        updates["user_entered_qty"] = cleaned_qty or None

    if "user_entered_qty" in updates:
        raw_user_qty = updates.get("user_entered_qty")
        updates["user_entered_qty"] = (
            str(raw_user_qty).strip() if raw_user_qty is not None else None
        ) or None

    # Merge updates
    for k, v in updates.items():
        if v is not None:
            doc[k] = v
        elif k == "user_entered_qty":
            doc[k] = None

    # Recalculate extended using effective qty (manual override wins)
    effective_qty = doc.get("user_entered_qty") or doc.get("qty", "1")
    doc["extended"] = _calc_extended(str(effective_qty), doc.get("unit_cost"))
    doc["updated_at"] = _now()

    await col.replace_one({"_id": ObjectId(item_id)}, doc)
    doc_serial = _serialize(doc)

    # Mirror into price register dictionary (items collection).
    await sync_price_item_from_budget(doc_serial)
    return doc_serial


async def delete_item(item_id: str) -> bool:
    if not ObjectId.is_valid(item_id):
        return False
    col = _col()
    doc = await col.find_one({"_id": ObjectId(item_id)}, {"order_index": 1, "project": 1})
    if not doc:
        return False
    await col.delete_one({"_id": ObjectId(item_id)})
    # Compact order_index gap
    await col.update_many(
        {"project": doc["project"], "order_index": {"$gt": doc["order_index"]}},
        {"$inc": {"order_index": -1}},
    )
    return True


# ── Sub-item operations ───────────────────────────────────────────────────────

async def add_subitem(item_id: str, data: dict) -> dict | None:
    if not ObjectId.is_valid(item_id):
        return None
    col = _col()
    parent = await col.find_one({"_id": ObjectId(item_id)})
    if not parent:
        return None

    # Determine order index relative to other subitems
    subitems = parent.get("subitems", [])
    if subitems and isinstance(subitems, list) and len(subitems) > 0:
        # If it contains dictionaries from old format, ignore or fetch them.
        pass

    data["is_sub_item"] = True
    # For now, create the subitem as a brand new item in the flat collection
    new_subitem = await create_item(parent["project"], data)
    new_subitem_id = str(new_subitem["_id"])

    # Make old dictionaries backwards compatible gracefully
    cleaned_subitems = [s for s in subitems if isinstance(s, str)]
    cleaned_subitems.append(new_subitem_id)

    await col.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"subitems": cleaned_subitems, "updated_at": _now()}},
    )
    doc = await col.find_one({"_id": ObjectId(item_id)})
    return await get_item(item_id)  # fetch populated


async def update_subitem(item_id: str, sub_id: str, updates: dict) -> dict | None:
    if not ObjectId.is_valid(item_id) or not ObjectId.is_valid(sub_id):
        return None
    col = _col()
    parent = await col.find_one({"_id": ObjectId(item_id)})
    if not parent:
        return None

    # update the actual item doc
    await update_item(sub_id, updates)
    return await get_item(item_id)


async def delete_subitem(item_id: str, sub_id: str) -> dict | None:
    if not ObjectId.is_valid(item_id) or not ObjectId.is_valid(sub_id):
        return None
    col = _col()
    parent = await col.find_one({"_id": ObjectId(item_id)})
    if not parent:
        return None

    subitems = parent.get("subitems", [])
    if sub_id in subitems:
        subitems.remove(sub_id)

    await col.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"subitems": subitems, "updated_at": _now()}},
    )
    # Actually delete the subitem completely
    await delete_item(sub_id)
    return await get_item(item_id)


async def detach_subitem(item_id: str, sub_id: str) -> tuple[dict | None, dict | None]:
    """
    Promote a subitem to a top-level budget item.
    Returns (updated_parent, new_top_level_item).
    """
    if not ObjectId.is_valid(item_id):
        return None, None
    col = _col()
    parent = await col.find_one({"_id": ObjectId(item_id)})
    if not parent:
        return None, None

    target_sub_id = None
    remaining = []
    for s in parent.get("subitems", []):
        if s == sub_id:
            target_sub_id = s
        else:
            remaining.append(s)

    if not target_sub_id:
        return None, None

    await col.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"subitems": remaining, "updated_at": _now()}},
    )

    # Detach by removing is_sub_item flag and positioning it below parent
    parent_index = parent.get("order_index", 0)
    await col.update_many(
        {"project": parent["project"], "order_index": {"$gt": parent_index}},
        {"$inc": {"order_index": 1}},
    )

    await col.update_one(
        {"_id": ObjectId(target_sub_id)},
        {"$set": {"is_sub_item": False, "order_index": parent_index + 1}}
    )

    updated_parent = await get_item(item_id)
    new_top = await get_item(target_sub_id)
    return updated_parent, new_top


async def assign_to_parent(item_id: str, parent_id: str) -> bool:
    if not ObjectId.is_valid(item_id) or not ObjectId.is_valid(parent_id):
        return False
    col = _col()
    item = await col.find_one({"_id": ObjectId(item_id)})
    parent = await col.find_one({"_id": ObjectId(parent_id)})
    if not item or not parent:
        return False

    # Pull from any existing parent
    await col.update_many(
        {"subitems": item_id},
        {"$pull": {"subitems": item_id}}
    )
    # Add to new parent
    await col.update_one(
        {"_id": ObjectId(parent_id)},
        {"$addToSet": {"subitems": item_id}, "$set": {"updated_at": _now()}}
    )
    # Mark as subitem
    await col.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"is_sub_item": True, "updated_at": _now()}}
    )
    return True


# ── Preliminary Budget Generation ───────────────────────────────────────────

async def create_preliminary_budget(project_id: str) -> dict:
    """
    Reads groups + masks from MongoDB for every room belonging to project_id,
    then creates/updates/deletes budget items in MongoDB.
    Database is the single source of truth.
    """
    from db.mongo import (
        get_rooms_collection,
        get_diagrams_collection,
        get_pages_collection,
        get_groups_collection,
        get_masks_collection,
    )

    rooms_coll = get_rooms_collection()
    diagrams_coll = get_diagrams_collection()
    pages_coll = get_pages_collection()
    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()
    col = _col()

    # 1. Fetch rooms — always query BOTH string and ObjectId formats.
    #    Rooms created by the auto-analysis pipeline store project as ObjectId.
    #    Rooms created manually via the API store project as a plain string.
    #    We need both sets — but we only care about rooms that have masks_polygons_url.
    print(f"[BudgetGen] Starting for project_id={project_id!r}")

    rooms_str = await rooms_coll.find({"project": project_id}).to_list(None)
    print(f"[BudgetGen] String query found {len(rooms_str)} room(s)")

    rooms_oid = []
    try:
        rooms_oid = await rooms_coll.find({"project": ObjectId(project_id)}).to_list(None)
        print(f"[BudgetGen] ObjectId query found {len(rooms_oid)} room(s)")
    except Exception as e:
        print(f"[BudgetGen] ObjectId conversion failed: {e}")

    # Merge, deduplicate by _id
    seen_ids = set()
    rooms = []

    for r in rooms_str:
        rid = str(r["_id"])
        if rid not in seen_ids:
            seen_ids.add(rid)
            rooms.append(r)

    for r in rooms_oid:
        rid = str(r["_id"])
        if rid not in seen_ids:
            seen_ids.add(rid)
            rooms.append(r)
    print(f"[BudgetGen] Total unique rooms: {len(rooms)}")

    if not rooms:
        return {"created": 0, "updated": 0, "rooms_processed": 0,
                "message": "No rooms found for this project."}

    # 2. Split rooms by include-in-budget toggle
    included_rooms = [r for r in rooms if bool(r.get("is_included_in_budget", False))]
    excluded_room_ids = [str(r["_id"]) for r in rooms if not bool(r.get("is_included_in_budget", False))]

    print(f"[BudgetGen] Included rooms: {len(included_rooms)} | Excluded rooms: {len(excluded_room_ids)}")

    # Edge case sync:
    # If a room was previously enabled and now disabled, remove all budget items for that room.
    # Keep this broad (not just system-created) to fully sync with toggle intent.
    deleted_count = 0
    if excluded_room_ids:
        room_match_values = set(excluded_room_ids)
        for rid in excluded_room_ids:
            if ObjectId.is_valid(rid):
                room_match_values.add(ObjectId(rid))

        delete_res = await col.delete_many({
            "project": project_id,
            "room": {"$in": list(room_match_values)},
        })
        deleted_count = delete_res.deleted_count
        print(f"[BudgetGen] Deleted {deleted_count} budget item(s) for excluded rooms")

    if not included_rooms:
        summary = (
            f"Budget generation complete. 0 items created, 0 items updated across 0 rooms. "
            f"Deleted {deleted_count} items from excluded rooms."
        )
        print(f"[BudgetGen] Done: {summary}")
        return {
            "created": 0,
            "updated": 0,
            "deleted": deleted_count,
            "rooms_processed": 0,
            "message": summary,
        }

    created_count = 0
    updated_count = 0
    stale_group_deleted_count = 0
    rooms_processed = 0

    # 3. Iterate over each included room
    for room in included_rooms:
        room_id = str(room["_id"])
        room_match_values = [room_id]
        if ObjectId.is_valid(room_id):
            room_match_values.append(ObjectId(room_id))

        project_match_values = [project_id]
        if ObjectId.is_valid(project_id):
            project_match_values.append(ObjectId(project_id))

        groups_docs = await groups_coll.find({
            "room": {"$in": room_match_values},
            "project": {"$in": project_match_values},
        }).to_list(None)

        masks_docs = await masks_coll.find(
            {
                "room": {"$in": room_match_values},
                "project": {"$in": project_match_values},
            },
            {"group_id": 1},
        ).to_list(None)

        mask_count_by_group: dict[str, int] = {}
        for m in masks_docs:
            gid = str(m.get("group_id", "") or "")
            if not gid:
                continue
            mask_count_by_group[gid] = mask_count_by_group.get(gid, 0) + 1

        print(f"[BudgetGen] Room {room_id}: groups={len(groups_docs)} masks={len(masks_docs)}")

        if not groups_docs:
            print(f"[BudgetGen]  -> Skipping: no groups in DB for this room")
            continue

        # Safe cleanup: remove stale system-generated budget items for this room
        # whose group_id no longer exists in the room's current groups snapshot.
        current_group_ids = [str(g.get("_id")) for g in groups_docs if g.get("_id")]
        if current_group_ids:
            stale_delete_result = await col.delete_many(
                {
                    "project": project_id,
                    "room": {"$in": room_match_values},
                    "created_by": "system",
                    "group_id": {
                        "$exists": True,
                        "$ne": "",
                        "$nin": current_group_ids,
                    },
                }
            )
            stale_group_deleted_count += stale_delete_result.deleted_count
            if stale_delete_result.deleted_count:
                print(
                    f"[BudgetGen]  -> Deleted {stale_delete_result.deleted_count} stale group item(s)"
                )

        rooms_processed += 1

        # -- Resolve page_id and page_no for this room via the diagram chain --
        # Chain: room.diagram (ObjectId) -> diagram.page (ObjectId) -> page.page_no (int)
        room_name = room.get("name") or room.get("room_name", "")
        room_id = str(room.get("_id") or "")
        page_id_str = ""
        page_no_val = None

        diagram_ref = room.get("diagram")  # ObjectId or None
        if diagram_ref:
            try:
                diag_doc = await diagrams_coll.find_one({"_id": diagram_ref})
                if diag_doc and diag_doc.get("page"):
                    page_doc = await pages_coll.find_one({"_id": diag_doc["page"]})
                    if page_doc:
                        page_id_str = str(page_doc["_id"])
                        page_no_val = page_doc.get("page_no")
            except Exception as e:
                print(f"[BudgetGen]  -> Could not resolve page for room {room_id}: {e}")

        print(f"[BudgetGen]  -> room_name={room_name!r}, page_id={page_id_str!r}, page_no={page_no_val!r}")

        # 3. For each group, count masks and upsert budget item
        for group in groups_docs:
            group_id_val = str(group.get("_id", ""))

            code_raw = group.get("code")
            code: str = str(code_raw or "").strip()
            print(f"[BudgetGen]    Group {group_id_val}: code={code!r}")
            if not code:
                print(f"[BudgetGen]    -> Skipping: empty code")
                continue

            group_name: str = str(group.get("name") or "")
            group_desc: str = str(group.get("description") or "")
            group_type: str = str(group.get("type") or "FF&E")

            # Count masks belonging to this group
            mask_count = mask_count_by_group.get(group_id_val, 0)
            qty_number = max(mask_count, 1)
            qty_str = str(qty_number)
            raw_group_user_qty = group.get("user_entered_qty")
            group_user_qty = (
                str(raw_group_user_qty).strip() if raw_group_user_qty is not None else ""
            ) or None
            print(f"[BudgetGen]    -> mask_count={mask_count}, qty_str={qty_str!r}")

            # Match on project + spec_no + group_id — the unique key for each group.
            # When found, we OVERRIDE qty with the current JSON count (idempotent).
            # This means repeated runs or mask removals are always reflected correctly.
            existing = await col.find_one({
                "project": project_id,
                "spec_no": code,
                "group_id": group_id_val,
            })
            print(f"[BudgetGen]    -> existing item in DB: {existing is not None}")

            if existing:
                # OVERRIDE qty with current count from JSON (not increment)
                effective_qty_for_math = group_user_qty or existing.get("user_entered_qty") or qty_str
                new_extended = _calc_extended(str(effective_qty_for_math), existing.get("unit_cost"))
                updated_at = _now()
                updates = {
                    "qty": qty_str,
                    "extended": new_extended,
                    "name": group_name,
                    "description": group_desc,
                    "type": group_type,
                    "room": room_id,
                    "page_id": page_id_str,
                    "page_no": page_no_val,
                    "updated_at": updated_at,
                }
                if group_user_qty is not None:
                    updates["user_entered_qty"] = group_user_qty
                await col.update_one(
                    {"_id": existing["_id"]},
                    {"$set": updates},
                )

                updated_doc = dict(existing)
                updated_doc.update({
                    "qty": qty_str,
                    "extended": new_extended,
                    "name": group_name,
                    "description": group_desc,
                    "type": group_type,
                    "room": room_id,
                    "page_id": page_id_str,
                    "page_no": page_no_val,
                    "updated_at": updated_at,
                })
                if group_user_qty is not None:
                    updated_doc["user_entered_qty"] = group_user_qty
                await sync_price_item_from_budget(updated_doc)

                updated_count += 1
                print(f"[BudgetGen]    -> SYNCED qty to {qty_str!r}, room={room_name!r} ({room_id}), page_no={page_no_val!r}")

            else:
                new_index = await _max_order(project_id) + 1
                now = _now()
                new_doc = {
                    "project": project_id,
                    "spec_no": code,
                    "name": group_name,
                    "description": group_desc,
                    "group_id": group_id_val,
                    "type": group_type,
                    "room": room_id,  # canonical room id
                    "page_id": page_id_str,  # MongoDB _id of the page
                    "page_no": page_no_val,  # page number (int)
                    "qty": qty_str,
                    "user_entered_qty": group_user_qty,
                    "unit_cost": None,
                    "extended": None,
                    "order_index": new_index,
                    "hidden_from_total": False,
                    "is_sub_item": False,
                    "created_by": "system",
                    "subitems": [],
                    "created_at": now,
                    "updated_at": now,
                }
                result = await col.insert_one(new_doc)
                new_doc["_id"] = str(result.inserted_id)
                await sync_price_item_from_budget(new_doc)
                created_count += 1
                print(
                    f"[BudgetGen]    -> CREATED _id={result.inserted_id}, room={room_name!r} ({room_id}), page_no={page_no_val!r}")

    summary = (f"Budget generation complete. {created_count} items created, "
               f"{updated_count} items updated across {rooms_processed} rooms. "
               f"Deleted {deleted_count} items from excluded rooms and "
               f"{stale_group_deleted_count} stale group items.")
    print(f"[BudgetGen] Done: {summary}")
    return {
        "created": created_count,
        "updated": updated_count,
        "deleted": deleted_count,
        "stale_group_deleted": stale_group_deleted_count,
        "rooms_processed": rooms_processed,
        "message": summary,
    }
