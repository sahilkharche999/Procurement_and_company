"""
schemas/budget.py
Pydantic models for budget items, PDF documents, and processing jobs.
Consolidated from budget.py and budget_mongo.py.
"""
from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel, Field


# ── Budget Item Models (MongoDB) ─────────────────────────────────────────────

class BudgetItemCreate(BaseModel):
    spec_no: str = ""
    description: str = ""
    name: str = ""  # Mapped from group name
    room: str = ""
    room_id: str = ""
    project: str = ""
    page_no: Optional[int] = None
    page_id: str = ""
    qty: str = "1 Ea."
    unit_cost: Optional[float] = None
    group_id: str = ""  # Linked from front-end mask groups
    insert_relative_to: Optional[str] = None  # _id string of neighbour
    position: str = "below"  # "above" | "below"
    is_sub_item: bool = False
    created_by: str = "user"  # "user" or "system"


class BudgetItemUpdate(BaseModel):
    spec_no: Optional[str] = None
    description: Optional[str] = None
    name: Optional[str] = None
    group_id: Optional[str] = None
    room: Optional[str] = None
    project: Optional[str] = None
    page_no: Optional[int] = None
    page_id: Optional[str] = None
    qty: Optional[str] = None
    unit_cost: Optional[float] = None
    hidden_from_total: Optional[bool] = None
    is_sub_item: Optional[bool] = None
    created_by: Optional[str] = None


class BudgetItemOut(BaseModel):
    id: str = Field(alias="_id")
    project: str = ""
    page_id: str = ""
    room: str = ""
    spec_no: str = ""
    description: str = ""
    name: str = ""
    group_id: str = ""
    page_no: Optional[int] = None
    qty: str = ""
    unit_cost: Optional[float] = None
    extended: Optional[float] = None
    order_index: int = 0
    hidden_from_total: bool = False
    is_sub_item: bool = False
    created_by: str = "user"
    subitems: List['BudgetItemOut'] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"populate_by_name": True}

    @classmethod
    def from_mongo(cls, doc: dict) -> "BudgetItemOut":
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        return cls(**doc)


# ── PDF & Job Models (MongoDB) ───────────────────────────────────────────────

class PdfDocumentOut(BaseModel):
    id: str
    filename: str
    original_name: str
    file_path: str
    file_size: int
    section: str
    page_count: Optional[int] = None
    uploaded_at: str
    project_id: Optional[str] = None

    class Config:
        from_attributes = True


class JobOut(BaseModel):
    id: str
    pdf_id: str
    status: str
    step: str
    progress: int
    job_dir: str
    error_msg: Optional[str] = None
    created_at: str
    dpi: int
    min_area_pct: float
    project_id: Optional[str] = None

    class Config:
        from_attributes = True
