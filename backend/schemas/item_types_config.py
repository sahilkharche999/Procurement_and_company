"""
schemas/item_types_config.py
Pydantic models for configurable item types in Settings.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ItemTypeConfigCreate(BaseModel):
    name: str
    description: str = ""


class ItemTypeConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ItemTypeConfigOut(BaseModel):
    id: str = Field(alias="_id")
    name: str
    description: str = ""
    is_deleted: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"populate_by_name": True}
