"""
schemas/vendor.py
Pydantic models for vendor management.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ── Vendor Models ────────────────────────────────────────────────────────────

class VendorCreate(BaseModel):
    company_name: str
    contact_name: str
    contact_number: str
    email: Optional[str] = None
    description: Optional[str] = None


class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None


class VendorResponse(BaseModel):
    id: str = Field(alias="_id")
    company_name: str
    contact_name: str
    contact_number: str
    email: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        populate_by_name = True
