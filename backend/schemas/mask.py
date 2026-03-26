"""
schemas/mask.py
Pydantic models for canonical masks collection.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MaskBase(BaseModel):
    name: str
    code: str = ""
    color: list[int] = [141, 106, 59]
    type: Literal["FF&E", "OFCI"] = "FF&E"
    description: str = ""
    room: str = ""
    project: str = ""

    # Optional geometry/relationship fields used by editor-generated labels
    group_id: str = ""
    polygons: list[list[float]] = []
    source: str = "system"
    mask_type: Literal["label", "custom"] = "label"

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: list[int]) -> list[int]:
        if len(v) != 3:
            raise ValueError("color must have exactly 3 values [R, G, B]")
        if any((not isinstance(c, int)) or c < 0 or c > 255 for c in v):
            raise ValueError("each color value must be an integer between 0 and 255")
        return v


class MaskCreate(MaskBase):
    pass


class MaskUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    color: list[int] | None = None
    type: Literal["FF&E", "OFCI"] | None = None
    description: str | None = None
    room: str | None = None
    project: str | None = None
    group_id: str | None = None
    polygons: list[list[float]] | None = None
    source: str | None = None
    mask_type: Literal["label", "custom"] | None = None

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


class MaskOut(MaskBase):
    id: str = Field(alias="_id")

    model_config = {"populate_by_name": True}
