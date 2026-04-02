"""
routes/settings/units.py
FastAPI router for Settings -> Units config.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from schemas.unit_config import UnitConfigCreate, UnitConfigUpdate
import services.settings.units_config_service as svc


router = APIRouter(prefix="/settings/units", tags=["Settings"])


@router.get("")
async def list_units(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: str = Query(""),
    include_deleted: bool = Query(False),
):
    return await svc.list_units(
        page=page,
        page_size=page_size,
        search=search,
        include_deleted=include_deleted,
    )


@router.get("/{unit_id}")
async def get_unit(unit_id: str):
    doc = await svc.get_unit(unit_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return doc


@router.post("", status_code=201)
async def create_unit(body: UnitConfigCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    return await svc.create_unit(body.model_dump())


@router.put("/{unit_id}")
async def update_unit(unit_id: str, body: UnitConfigUpdate):
    updates = body.model_dump(exclude_none=True)
    if "name" in updates and not str(updates.get("name", "")).strip():
        raise HTTPException(status_code=400, detail="name cannot be empty")

    doc = await svc.update_unit(unit_id, updates)
    if doc is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return doc


@router.delete("/{unit_id}")
async def delete_unit(unit_id: str):
    ok = await svc.delete_unit(unit_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"ok": True}
