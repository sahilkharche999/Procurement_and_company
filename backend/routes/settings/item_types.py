"""
routes/settings/item_types.py
FastAPI router for Settings -> Item Types config.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from schemas.item_types_config import ItemTypeConfigCreate, ItemTypeConfigUpdate
import services.settings.item_types_config_service as svc


router = APIRouter(prefix="/settings/item-types", tags=["Settings"])


@router.get("")
async def list_item_types(
    search: str = Query(""),
    include_deleted: bool = Query(False),
):
    return await svc.list_item_types(
        search=search,
        include_deleted=include_deleted,
    )


@router.get("/{item_type_id}")
async def get_item_type(item_type_id: str):
    doc = await svc.get_item_type(item_type_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Item type not found")
    return doc


@router.post("", status_code=201)
async def create_item_type(body: ItemTypeConfigCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    # Reject re-adding a system default: the duplicate would inherit the locked
    # state from its name and could then never be removed.
    if svc.is_system_item_type_name(body.name):
        raise HTTPException(
            status_code=409,
            detail=f"'{body.name.strip()}' is a system default item type and already exists.",
        )
    return await svc.create_item_type(body.model_dump())


async def _get_editable_item_type_or_error(item_type_id: str, action: str) -> dict:
    """Load an item type, rejecting system defaults which must stay untouched."""
    existing = await svc.get_item_type(item_type_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Item type not found")
    if existing.get("is_system"):
        raise HTTPException(
            status_code=403,
            detail=f"'{existing.get('name')}' is a system default item type and cannot be {action}.",
        )
    return existing


@router.put("/{item_type_id}")
async def update_item_type(item_type_id: str, body: ItemTypeConfigUpdate):
    updates = body.model_dump(exclude_none=True)
    if "name" in updates and not str(updates.get("name", "")).strip():
        raise HTTPException(status_code=400, detail="name cannot be empty")

    await _get_editable_item_type_or_error(item_type_id, "edited")

    doc = await svc.update_item_type(item_type_id, updates)
    if doc is None:
        raise HTTPException(status_code=404, detail="Item type not found")
    return doc


@router.delete("/{item_type_id}")
async def delete_item_type(item_type_id: str):
    await _get_editable_item_type_or_error(item_type_id, "deleted")

    ok = await svc.delete_item_type(item_type_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Item type not found")
    return {"ok": True}
