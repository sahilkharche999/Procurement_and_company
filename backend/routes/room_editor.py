from fastapi import APIRouter
from pydantic import BaseModel

from services.room_editor_state_service import (
    build_editor_state_payload,
    persist_editor_state,
    update_room_budget_inclusion,
)


router = APIRouter(prefix="/projects/{project_id}/rooms", tags=["Room Editor"])


class EditorStateUpdate(BaseModel):
    masks: list
    groups: dict


class BudgetInclusionUpdate(BaseModel):
    is_included_in_budget: bool


@router.get("/{room_id}/editor-state")
async def get_editor_state(project_id: str, room_id: str):
    """Production endpoint: DB-backed room editor state payload."""
    return await build_editor_state_payload(room_id=room_id, project_id=project_id)


@router.put("/{room_id}/editor-state")
async def put_editor_state(project_id: str, room_id: str, body: EditorStateUpdate):
    """Production endpoint: persist room editor groups/masks into DB."""
    return await persist_editor_state(
        room_id=room_id,
        project_id=project_id,
        groups=body.groups,
        masks=body.masks,
    )


@router.patch("/{room_id}/budget-inclusion")
async def patch_room_budget_inclusion(
    project_id: str,
    room_id: str,
    body: BudgetInclusionUpdate,
):
    """Production endpoint: update room budget inclusion flag."""
    # project_id is validated implicitly by room ownership in room service fetch path
    return await update_room_budget_inclusion(
        room_id=room_id,
        is_included_in_budget=body.is_included_in_budget,
    )
