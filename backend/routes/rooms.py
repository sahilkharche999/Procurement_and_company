from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from db.mongo import get_rooms_collection
from schemas.room import RoomCreate
from services.pdf_processing import LOCAL_FILE_DB
from services.room_editor_state_service import (
    as_obj_id,
    normalize_room_doc,
    fetch_room_or_404,
    build_editor_state_payload,
    persist_editor_state,
    update_room_budget_inclusion,
)


router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("/project/{project_id}")
async def get_rooms_by_project(project_id: str):
    rooms_coll = get_rooms_collection()
    # Convert project_id to ObjectId for proper MongoDB query
    cursor = rooms_coll.find({"project": as_obj_id(project_id)})
    docs = await cursor.to_list(1000)
    for d in docs:
        normalize_room_doc(d)
    return docs


@router.post("/project/{project_id}", status_code=201)
async def create_room(project_id: str, body: RoomCreate):
    rooms_coll = get_rooms_collection()
    new_room = {
        "project": as_obj_id(project_id),  # Store as ObjectId
        "name": body.name,
        "notes": body.notes,
        "created_by": body.created_by,
        "is_included_in_budget": body.is_included_in_budget,
        "image_width": body.image_width,
        "image_height": body.image_height,
    }
    res = await rooms_coll.insert_one(new_room)
    new_room["_id"] = str(res.inserted_id)
    new_room["project"] = str(new_room["project"])  # Convert back to string in response
    return new_room


@router.get("/{room_id}")
async def get_room(room_id: str):
    return await fetch_room_or_404(room_id)


@router.get("/{room_id}/image")
async def get_room_image(room_id: str):
    """
    Returns the raw room image file for this room.
    This route is used as a CORS-safe proxy for frontend PDF export flows.
    """
    room = await fetch_room_or_404(room_id)
    image_url = str(room.get("room_image_url") or "").strip()
    if not image_url:
        raise HTTPException(status_code=404, detail="Room image not found")

    abs_path = ""
    if image_url.startswith("/local_file_db/"):
        rel_path = image_url[len("/local_file_db/"):]
        abs_path = os.path.join(LOCAL_FILE_DB, rel_path)
    elif image_url.startswith("/uploads/"):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        abs_path = os.path.join(backend_dir, image_url.lstrip("/"))

    if not abs_path or not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Room image file not found")

    ext = os.path.splitext(abs_path)[1].lower()
    media_type = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(ext, "application/octet-stream")

    return FileResponse(abs_path, media_type=media_type)


@router.get("/{room_id}/editor-data/{project_id}")
async def get_room_editor_data(room_id: str, project_id: str):
    """
    DB-backed editor payload endpoint.
    Returns same shape as masks_polygons.json:
    {
      groups: { ... },
      masks: [ ... ],
      image_width: int,
      image_height: int,
    }
    """
    return await build_editor_state_payload(room_id=room_id, project_id=project_id)


class MasksUpdate(BaseModel):
    masks: list
    groups: dict


class IncludeInBudgetUpdate(BaseModel):
    is_included_in_budget: bool


@router.put("/{room_id}/masks")
async def update_room_masks(room_id: str, body: MasksUpdate):
    """
    Persists editor masks/groups into MongoDB.
    DB is the source of truth.
    """
    room_doc = await fetch_room_or_404(room_id)
    project_id = str(room_doc.get("project", ""))
    if not project_id:
        raise HTTPException(status_code=400, detail="Room does not have a valid project ID.")

    return await persist_editor_state(
        room_id=room_id,
        project_id=project_id,
        groups=body.groups,
        masks=body.masks,
    )


@router.patch("/{room_id}/include-in-budget")
async def update_room_include_in_budget(room_id: str, body: IncludeInBudgetUpdate):
    return await update_room_budget_inclusion(
        room_id=room_id,
        is_included_in_budget=body.is_included_in_budget,
    )
