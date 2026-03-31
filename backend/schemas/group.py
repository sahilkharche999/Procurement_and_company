"""
schemas/group.py
Pydantic models for canonical groups collection.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class GroupBase(BaseModel):
    name: str
    description: str = ""
    code: str = ""
    color: list[int] = [141, 106, 59]
    type: str = "FF&E"
    unit_id: Optional[str] = None
    user_entered_qty: Optional[str] = None
    room: str = ""
    project: str = ""

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: list[int]) -> list[int]:
        if len(v) != 3:
            raise ValueError("color must have exactly 3 values [R, G, B]")
        if any((not isinstance(c, int)) or c < 0 or c > 255 for c in v):
            raise ValueError("each color value must be an integer between 0 and 255")
        return v


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    code: str | None = None
    color: list[int] | None = None
    type: str | None = None
    unit_id: Optional[str] = None
    user_entered_qty: Optional[str] = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: list[int] | None) -> list[int] | None:
        if v is None:
            return None
        if len(v) != 3:
            raise ValueError("color must have exactly 3 values [R, G, B]")
        if any((not isinstance(c, int)) or c < 0 or c > 255 for c in v):
            raise ValueError("each color value must be an integer between 0 and 255")
        return v


class GroupOut(GroupBase):
    id: str = Field(alias="_id")

    model_config = {"populate_by_name": True}
