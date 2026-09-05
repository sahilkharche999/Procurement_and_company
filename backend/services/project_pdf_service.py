"""
services/project_pdf_service.py
───────────────────────────────
Everything about "which drawing sets belong to a project, and what has been
extracted from them".

A project may hold several architectural PDFs. Pages and diagrams have always
recorded the `pdf_id` they came from, so scoping by PDF needs no migration —
this module just reads that existing shape consistently.

It is also the single place that answers "what depends on this PDF?", which both
the extraction guard and the delete guard rely on. Reprocessing a PDF deletes and
recreates its pages/diagrams with new ObjectIds, which strands any room drawn on
the old diagram, so that question must be asked before either operation.
"""
from __future__ import annotations

from bson import ObjectId

from db.mongo import (
    get_budget_collection,
    get_diagrams_collection,
    get_groups_collection,
    get_masks_collection,
    get_pages_collection,
    get_pdf_documents_collection,
    get_processing_jobs_collection,
    get_rooms_collection,
)

# Extraction states surfaced on a drawing card.
NOT_EXTRACTED = "not_extracted"
PROCESSING = "processing"
EXTRACTED = "extracted"
FAILED = "failed"

_ACTIVE_JOB_STATES = ("pending", "processing")


def id_variants(value) -> list:
    """Both id representations. Older rows store strings, newer ones ObjectIds."""
    text = str(value)
    if ObjectId.is_valid(text):
        return [text, ObjectId(text)]
    return [text]


async def get_pdf_document(pdf_id: str) -> dict | None:
    if not ObjectId.is_valid(str(pdf_id)):
        return None
    return await get_pdf_documents_collection().find_one({"_id": ObjectId(pdf_id)})


async def _latest_job_for_pdf(pdf_id: str) -> dict | None:
    jobs = get_processing_jobs_collection()
    cursor = jobs.find({"pdf_id": {"$in": id_variants(pdf_id)}}).sort("_id", -1).limit(1)
    found = await cursor.to_list(1)
    return found[0] if found else None


async def get_pdf_dependencies(pdf_id: str) -> dict:
    """
    Count everything built on top of a PDF's extracted diagrams.

    Rooms hold a hard `diagram` reference, and masks/groups/budget items hang off
    rooms, so this walks pdf -> diagrams -> rooms -> the rest.
    """
    diagrams_coll = get_diagrams_collection()
    rooms_coll = get_rooms_collection()

    pdf_values = id_variants(pdf_id)
    diagram_ids = await diagrams_coll.distinct("_id", {"pdf_id": {"$in": pdf_values}})

    rooms: list[dict] = []
    if diagram_ids:
        rooms = await rooms_coll.find({"diagram": {"$in": diagram_ids}}).to_list(None)

    room_ids: list = []
    for room in rooms:
        room_ids.extend(id_variants(room["_id"]))

    budget_count = mask_count = group_count = 0
    if room_ids:
        budget_count = await get_budget_collection().count_documents({"room": {"$in": room_ids}})
        mask_count = await get_masks_collection().count_documents({"room": {"$in": room_ids}})
        group_count = await get_groups_collection().count_documents({"room": {"$in": room_ids}})

    return {
        "diagram_ids": diagram_ids,
        "diagram_count": len(diagram_ids),
        "room_count": len(rooms),
        "room_names": [str(r.get("name") or r.get("room_name") or "") for r in rooms],
        "budget_count": budget_count,
        "mask_count": mask_count,
        "group_count": group_count,
    }


def describe_dependencies(deps: dict) -> str:
    """Human-readable 'what you would lose', for guard error messages."""
    parts = []
    if deps["room_count"]:
        parts.append(f"{deps['room_count']} room{'s' if deps['room_count'] != 1 else ''}")
    if deps["budget_count"]:
        parts.append(f"{deps['budget_count']} budget item{'s' if deps['budget_count'] != 1 else ''}")
    if deps["mask_count"]:
        parts.append(f"{deps['mask_count']} mask{'s' if deps['mask_count'] != 1 else ''}")
    if not parts:
        return "nothing"
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + f" and {parts[-1]}"


async def resolve_extraction_state(pdf_id: str) -> dict:
    """
    Current extraction state of one PDF, derived from live data rather than a
    stored flag, so PDFs uploaded before this feature report correctly with no
    backfill. The denormalised fields on `pdf_documents` are only a cache.
    """
    job = await _latest_job_for_pdf(pdf_id)
    diagram_count = await get_diagrams_collection().count_documents(
        {"pdf_id": {"$in": id_variants(pdf_id)}}
    )
    selected_count = await get_diagrams_collection().count_documents(
        {"pdf_id": {"$in": id_variants(pdf_id)}, "is_selected": True}
    )

    job_status = (job or {}).get("status")
    if job_status in _ACTIVE_JOB_STATES:
        status = PROCESSING
    elif job_status == "error" and diagram_count == 0:
        status = FAILED
    elif diagram_count > 0:
        status = EXTRACTED
    else:
        status = NOT_EXTRACTED

    return {
        "extraction_status": status,
        "diagram_count": diagram_count,
        "selected_diagram_count": selected_count,
        "job": {
            "id": str(job["_id"]),
            "status": job.get("status", ""),
            "step": job.get("step", ""),
            "progress": int(job.get("progress", 0) or 0),
            "error_msg": job.get("error_msg"),
            "created_at": job.get("created_at", ""),
        } if job else None,
    }


async def list_project_pdfs(project_id: str) -> dict:
    """All drawing sets uploaded to a project, each with its extraction state."""
    pdf_docs = get_pdf_documents_collection()
    docs = await pdf_docs.find(
        {"project_id": {"$in": id_variants(project_id)}}
    ).sort("_id", 1).to_list(None)

    pages_coll = get_pages_collection()
    items = []
    for doc in docs:
        pdf_id = str(doc["_id"])
        state = await resolve_extraction_state(pdf_id)
        deps = await get_pdf_dependencies(pdf_id)
        page_count_extracted = await pages_coll.count_documents(
            {"pdf_id": {"$in": id_variants(pdf_id)}}
        )
        items.append({
            "id": pdf_id,
            "filename": doc.get("filename", ""),
            "original_name": doc.get("original_name", ""),
            "file_path": doc.get("file_path", ""),
            "file_size": doc.get("file_size", 0),
            "page_count": doc.get("page_count"),
            "uploaded_at": doc.get("uploaded_at", ""),
            "project_id": str(doc.get("project_id", "")),
            "extracted_page_count": page_count_extracted,
            "room_count": deps["room_count"],
            "budget_count": deps["budget_count"],
            # A PDF can only be removed while nothing has been built on it.
            "can_delete": deps["room_count"] == 0 and deps["budget_count"] == 0,
            **state,
        })

    return {"pdfs": items, "total": len(items)}
