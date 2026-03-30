"""
schemas/item.py
Pydantic models for Price Register item records.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    name: str
    code: str = ""
    type: str = "FF&E"
    description: str = ""
    price: float = 0.0
    extended_price: float = 0.0


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    extended_price: Optional[float] = None


class ItemOut(BaseModel):
    id: str = Field(alias="_id")
    name: str
    code: str = ""
    type: str = "FF&E"
    description: str = ""
    price: float = 0.0
    extended_price: float = 0.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"populate_by_name": True}
