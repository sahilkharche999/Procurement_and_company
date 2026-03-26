"""
services/budget_to_price_item_sync_service.py
Sync helper: mirror budget item create/update into the `items` collection.
"""
from __future__ import annotations

from datetime import datetime, timezone

from db.mongo import get_db


def _items_col():
    return get_db()["items"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_float(value, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def _normalize_type(value: str | None) -> str:
    v = str(value or "FF&E").strip().upper()
    return "OFCI" if v == "OFCI" else "FF&E"


def _build_payload_from_budget(budget_doc: dict) -> dict:
    spec_no = str(budget_doc.get("spec_no") or "").strip()
    name = str(budget_doc.get("name") or "").strip()
    description = str(budget_doc.get("description") or "").strip()

    # Keep name meaningful even when budget.name is empty.
    final_name = name or spec_no or description or "Unnamed Item"

    return {
        "name": final_name,
        "code": spec_no,
        "type": _normalize_type(budget_doc.get("type")),
        "description": description,
        "price": _to_float(budget_doc.get("unit_cost"), 0.0),
        "extended_price": _to_float(budget_doc.get("extended"), 0.0),
        "updated_at": _now(),
        "source": "budget",
        "source_budget_item_id": str(budget_doc.get("_id") or ""),
        "source_budget_project_id": str(budget_doc.get("project") or ""),
        "source_budget_is_sub_item": bool(budget_doc.get("is_sub_item", False)),
    }


async def sync_price_item_from_budget(budget_doc: dict) -> None:
    """
    Upsert a corresponding entry in `items` for a budget item.

    Notes:
      - Called on budget create/update flows.
      - Deletion is intentionally ignored by design.
      - Uses source_budget_item_id as the stable upsert key.
    """
    budget_id = str(budget_doc.get("_id") or "").strip()
    if not budget_id:
        return

    col = _items_col()
    payload = _build_payload_from_budget(budget_doc)

    await col.update_one(
        {
            "source": "budget",
            "source_budget_item_id": budget_id,
        },
        {
            "$set": payload,
            "$setOnInsert": {"created_at": _now()},
        },
        upsert=True,
    )
