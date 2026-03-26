"""
routes/items.py
FastAPI router for Price Register item APIs.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

import services.item_service as svc
from schemas.item import ItemCreate, ItemUpdate


router = APIRouter(prefix="/items", tags=["Items"])


@router.get("")
async def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str = Query(""),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
):
    return await svc.list_items(
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", status_code=201)
async def create_item(body: ItemCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    return await svc.create_item(body.model_dump())


@router.put("/{item_id}")
async def update_item(item_id: str, body: ItemUpdate):
    updates = body.model_dump(exclude_none=True)
    if "name" in updates and not str(updates.get("name", "")).strip():
        raise HTTPException(status_code=400, detail="name cannot be empty")

    result = await svc.update_item(item_id, updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return result


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    ok = await svc.delete_item(item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}
