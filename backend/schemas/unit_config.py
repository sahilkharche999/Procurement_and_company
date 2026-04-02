"""
schemas/unit_config.py
Pydantic models for configurable units in Settings.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class UnitConfigCreate(BaseModel):
    name: str
    description: str = ""


class UnitConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class UnitConfigOut(BaseModel):
    id: str = Field(alias="_id")
    name: str
    description: str = ""
    is_deleted: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"populate_by_name": True}
