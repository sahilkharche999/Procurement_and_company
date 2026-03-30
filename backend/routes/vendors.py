"""
routes/vendors.py
API routes for vendor management.
"""
from fastapi import APIRouter, HTTPException, Query
from schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from services.vendor_service import (
    create_vendor,
    get_vendor,
    get_all_vendors,
    update_vendor,
    delete_vendor,
)

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("", response_model=dict)
async def list_vendors(
    search: str = Query(""),
    limit: int = Query(1000),
    skip: int = Query(0),
):
    """Get all vendors with optional search and pagination."""
    docs, total = await get_all_vendors(search=search, limit=limit, skip=skip)
    return {
        "vendors": docs,
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.get("/{vendor_id}", response_model=dict)
async def get_single_vendor(vendor_id: str):
    """Get a single vendor by ID."""
    vendor = await get_vendor(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("", status_code=201, response_model=dict)
async def create_new_vendor(body: VendorCreate):
    """Create a new vendor."""
    vendor = await create_vendor(body)
    return vendor


@router.put("/{vendor_id}", response_model=dict)
async def update_existing_vendor(vendor_id: str, body: VendorUpdate):
    """Update an existing vendor."""
    vendor = await update_vendor(vendor_id, body)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.delete("/{vendor_id}", status_code=204)
async def delete_existing_vendor(vendor_id: str):
    """Delete a vendor."""
    success = await delete_vendor(vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return None
