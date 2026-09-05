import os
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Form, BackgroundTasks

from db.mongo import get_diagrams_collection, get_pages_collection, get_pdf_documents_collection, get_processing_jobs_collection
from schemas.budget import JobOut
from services.pdf_processing import run_processing, get_yolo_status
import services.project_pdf_service as pdf_svc
from config import LOCAL_FILE_DB, BASE_DIR

router = APIRouter(prefix="/floorplan", tags=["Floorplan"])


def _resolve_pdf_abs_path(pdf_doc: dict) -> str:
    file_url = pdf_doc.get("file_path", "")
    if file_url.startswith("/local_file_db/"):
        rel = file_url.replace("/local_file_db/", "").lstrip("/\\")
        return os.path.join(LOCAL_FILE_DB, rel)

    upload_dir = os.path.join(BASE_DIR, "uploads", "pdfs")
    return os.path.join(upload_dir, pdf_doc.get("filename", ""))


def _pdf_bucket_name(pdf_id: str) -> str:
    safe = "".join(ch for ch in str(pdf_id) if ch.isalnum())
    return f"pdf_{safe or 'unknown'}"


async def _guard_reprocessing(pdf_id: str, force: bool) -> None:
    """
    Refuse to re-extract a PDF that other work already depends on.

    Extraction deletes and recreates this PDF's pages and diagrams with new
    ObjectIds. Rooms hold a hard `diagram` reference, so any room drawn on the
    old diagrams would be stranded — along with its masks, groups and budget
    items. This is enforced here rather than in the UI because a stale tab, a
    double-click or a direct API call all bypass a hidden button.
    """
    if force:
        return

    deps = await pdf_svc.get_pdf_dependencies(pdf_id)
    if deps["room_count"] == 0 and deps["budget_count"] == 0:
        return

    raise HTTPException(
        status_code=409,
        detail=(
            f"This drawing has already been extracted and "
            f"{pdf_svc.describe_dependencies(deps)} depend on it. "
            f"Re-extracting would delete the drawings those rooms were traced on."
        ),
    )


async def _guard_concurrent_job(pdf_id: str) -> None:
    """One extraction at a time per PDF; two would race on the same documents."""
    state = await pdf_svc.resolve_extraction_state(pdf_id)
    if state["extraction_status"] == pdf_svc.PROCESSING:
        raise HTTPException(
            status_code=409,
            detail="This drawing is already being extracted. Wait for it to finish.",
        )


@router.post("/process")
async def start_processing(
        background_tasks: BackgroundTasks,
        pdf_id: str = Form(...),
        dpi: int = Form(300),
        min_area_pct: float = Form(5.0),
        force: bool = Form(False),
):
    dpi = 300
    pdf_docs_coll = get_pdf_documents_collection()
    if not ObjectId.is_valid(pdf_id):
        raise HTTPException(400, "Invalid pdf_id")
    pdf_doc = await pdf_docs_coll.find_one({"_id": ObjectId(pdf_id)})
    if not pdf_doc:
        raise HTTPException(404, "PDF not found")

    project_id = pdf_doc.get("project_id")
    if not project_id:
        raise HTTPException(400, "PDF is not associated with a MongoDB project")

    # Guards run before any filesystem work: whether this drawing may be
    # re-extracted at all is a more fundamental answer than whether its file is
    # currently readable, and it must not depend on infrastructure state.
    await _guard_concurrent_job(pdf_id)
    await _guard_reprocessing(pdf_id, force)

    pdf_path = _resolve_pdf_abs_path(pdf_doc)
    if not os.path.exists(pdf_path):
        raise HTTPException(404, "PDF file missing on disk")

    # Path: local_file_db/project_{project_id}/pdf_processing/pdf_{pdf_id}/
    job_dir = os.path.join(LOCAL_FILE_DB, f"project_{project_id}", "pdf_processing", _pdf_bucket_name(pdf_id))
    os.makedirs(job_dir, exist_ok=True)

    jobs_coll = get_processing_jobs_collection()
    job_data = {
        "pdf_id": pdf_id,
        "project_id": project_id,
        "status": "pending",
        "step": "Queued — waiting to start",
        "progress": 0,
        "job_dir": job_dir,
        "dpi": dpi,
        "min_area_pct": min_area_pct,
        "created_at": datetime.now().isoformat()
    }
    result = await jobs_coll.insert_one(job_data)
    job_id = str(result.inserted_id)
    job_data["id"] = job_id

    background_tasks.add_task(run_processing, job_id, pdf_path, dpi, min_area_pct)
    return JobOut.model_validate(job_data)


# Clearer alias: create processing job
@router.post("/processing-jobs")
async def create_floorplan_processing_job(
    background_tasks: BackgroundTasks,
    pdf_id: str = Form(...),
    dpi: int = Form(300),
    min_area_pct: float = Form(5.0),
    force: bool = Form(False),
):
    return await start_processing(background_tasks, pdf_id, dpi, min_area_pct, force)


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    jobs_coll = get_processing_jobs_collection()
    job = await jobs_coll.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    job["id"] = str(job.pop("_id"))
    return JobOut.model_validate(job)


# Clearer alias: get single processing job
@router.get("/processing-jobs/{job_id}")
async def get_floorplan_processing_job(job_id: str):
    return await get_job_status(job_id)


@router.get("/job/{job_id}/images")
async def get_job_images(job_id: str):
    jobs_coll = get_processing_jobs_collection()
    job = await jobs_coll.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("status") != "done":
        return {"images": [], "total": 0, "status": job.get("status")}
    if not job.get("project_id"):
        return {"images": [], "total": 0, "status": "done"}

    pages_coll = get_pages_collection()
    diagrams_coll = get_diagrams_collection()

    page_filter = {"project": ObjectId(job.get("project_id"))}
    if job.get("pdf_id"):
        page_filter["pdf_id"] = str(job.get("pdf_id"))
    pages = await pages_coll.find(page_filter).to_list(length=None)
    page_map = {p["_id"]: p["page_no"] for p in pages}

    diag_filter = {"project": ObjectId(job.get("project_id"))}
    if job.get("pdf_id"):
        diag_filter["pdf_id"] = str(job.get("pdf_id"))
    diagrams = await diagrams_coll.find(diag_filter).to_list(length=None)

    images = []
    for d in diagrams:
        images.append({
            "id": str(d["_id"]),
            "filename": d.get("filename", ""),
            "page_number": page_map.get(d.get("page"), 0),
            "label": d.get("label", ""),
            "diagram_seq": d.get("diagram_seq", ""),
            "sub_index": d.get("sub_index", 0),
            "url": d.get("diagram_image_url", ""),
            "is_selected": d.get("is_selected", False)
        })

    return {"images": images, "total": len(images), "status": "done"}


# Clearer alias: list extracted diagrams for a processing job
@router.get("/processing-jobs/{job_id}/diagrams")
async def get_floorplan_processing_job_diagrams(job_id: str):
    return await get_job_images(job_id)


@router.post("/job/{job_id}/save-selected")
async def save_selected_images(job_id: str, body: dict):
    jobs_coll = get_processing_jobs_collection()
    job = await jobs_coll.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("status") != "done":
        raise HTTPException(400, "Job not complete yet")

    selected_names = set(body.get("selected", []))

    diagrams_coll = get_diagrams_collection()
    pages_coll = get_pages_collection()

    diag_filter = {"project": ObjectId(job.get("project_id"))}
    if job.get("pdf_id"):
        diag_filter["pdf_id"] = str(job.get("pdf_id"))
    diagrams = await diagrams_coll.find(diag_filter).to_list(length=None)
    page_filter = {"project": ObjectId(job.get("project_id"))}
    if job.get("pdf_id"):
        page_filter["pdf_id"] = str(job.get("pdf_id"))
    pages = await pages_coll.find(page_filter).to_list(length=None)
    page_map = {p["_id"]: p["page_no"] for p in pages}

    # Reset all to not selected first
    await diagrams_coll.update_many(diag_filter, {"$set": {"is_selected": False}})

    result_images = []

    for d in diagrams:
        if str(d["_id"]) in selected_names:
            await diagrams_coll.update_one({"_id": d["_id"]}, {"$set": {"is_selected": True}})
            # Optional: update the page is_selected to True if any of its diagrams are selected
            await pages_coll.update_one({"_id": d["page"]}, {"$set": {"is_selected": True}})

            # Mongo is the source of truth; no file copy is needed here.
            result_images.append({
                "id": str(d["_id"]),
                "filename": d.get("filename"),
                "page_number": page_map.get(d.get("page"), 0),
                "label": d.get("label"),
                "diagram_seq": d.get("diagram_seq", "a"),
                "sub_index": d.get("sub_index", 0),
                "url": d.get("diagram_image_url", ""),
            })

    metadata = {
        "project_id": job.get("project_id"),
        "total_selected": len(result_images),
        "timestamp": datetime.now().isoformat(),
        "dpi": job.get("dpi"),
        "images": result_images,
    }

    return metadata


# Clearer alias: persist selected diagrams for a processing job
@router.post("/processing-jobs/{job_id}/selected-diagrams")
async def save_floorplan_selected_diagrams(job_id: str, body: dict):
    return await save_selected_images(job_id, body)


@router.get("/jobs")
async def list_jobs():
    jobs_coll = get_processing_jobs_collection()
    jobs = await jobs_coll.find().sort({"_id": -1}).to_list(length=None)
    result = []
    for j in jobs:
        j["id"] = str(j.pop("_id"))
        result.append(JobOut.model_validate(j))
    return result


# Clearer alias: list processing jobs
@router.get("/processing-jobs")
async def list_floorplan_processing_jobs():
    return await list_jobs()


@router.get("/yolo-status")
def get_yolo_status_route():
    return get_yolo_status()


# Clearer alias: health endpoint for processing model status
@router.get("/processing-health/yolo")
def get_floorplan_processing_health():
    return get_yolo_status_route()
