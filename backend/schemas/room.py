"""
schemas/room.py
Pydantic models for room documents.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class RoomBase(BaseModel):
    name: str
    notes: str = ""
    created_by: str = "user"
    is_included_in_budget: bool = False


class RoomCreate(RoomBase):
    pass


class RoomOut(RoomBase):
    id: str = Field(alias="_id")

    model_config = {"populate_by_name": True}
