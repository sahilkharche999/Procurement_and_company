import os
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form

from config import BASE_DIR, LOCAL_FILE_DB
from db.mongo import (
    get_diagrams_collection,
    get_pages_collection,
    get_pdf_documents_collection,
    get_processing_jobs_collection,
    get_project_sources_collection,
    get_projects_collection,
)
from schemas.budget import PdfDocumentOut
import services.project_pdf_service as pdf_svc

router = APIRouter(prefix="/pdf", tags=["PDF"])

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "pdfs")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _local_url_to_abs_path(local_url: str) -> str:
    rel = local_url.replace("/local_file_db/", "").lstrip("/\\")
    return os.path.join(LOCAL_FILE_DB, rel)


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    section: str = Form("general"),
):
    """
    Store an architectural PDF against an existing project.

    Uploading no longer creates a project — the project must exist first, so that
    adding a drawing and starting a project stay separate actions. A project may
    hold any number of PDFs.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    if not ObjectId.is_valid(project_id):
        raise HTTPException(400, "Invalid project_id")

    projects_coll = get_projects_collection()
    project = await projects_coll.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(404, "Project not found")

    project_sources_coll = get_project_sources_collection()
    pdf_docs_coll = get_pdf_documents_collection()

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")

    safe_name = f"{timestamp}_{file.filename.replace(' ', '_')}"
    content = await file.read()
    project_source_dir = os.path.join(LOCAL_FILE_DB, f"project_{project_id}", "source")
    os.makedirs(project_source_dir, exist_ok=True)
    file_path = os.path.join(project_source_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)
    file_size = os.path.getsize(file_path)

    page_count = None
    try:
        import fitz
        doc = fitz.open(file_path)
        page_count = doc.page_count
        doc.close()
    except Exception:
        pass

    source_pdf_url = f"/local_file_db/project_{project_id}/source/{safe_name}"

    doc_data = {
        "filename": safe_name,
        "original_name": file.filename,
        "file_path": source_pdf_url,
        "file_size": file_size,
        "section": section,
        "page_count": page_count,
        "uploaded_at": now.isoformat(),
        "project_id": project_id,
        "extraction_status": pdf_svc.NOT_EXTRACTED,
        "diagram_count": 0,
        "last_job_id": None,
    }
    doc_result = await pdf_docs_coll.insert_one(doc_data)
    pdf_id = str(doc_result.inserted_id)
    doc_data["id"] = pdf_id

    # One source record per PDF. It used to be one per project with the page list
    # overwritten on every extraction, which silently erased the first PDF's pages
    # as soon as a second one was processed.
    await project_sources_coll.insert_one({
        "project": ObjectId(project_id),
        "pdf_id": pdf_id,
        "source_pdf_url": source_pdf_url,
        "pages": [],
    })

    await projects_coll.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"updated_at": now.isoformat()}},
    )

    return PdfDocumentOut.model_validate(doc_data)


@router.get("/list")
async def list_pdfs(
    project_id: str = Query("", description="Required — PDFs are scoped to a project"),
    section: str = Query("general"),
):
    """
    List a project's PDFs.

    `project_id` is mandatory. An unscoped listing used to return every PDF in the
    database, which let one project's drawing be processed into another project.
    """
    if not project_id:
        raise HTTPException(400, "project_id is required")

    pdf_docs_coll = get_pdf_documents_collection()
    docs = await pdf_docs_coll.find(
        {"project_id": {"$in": pdf_svc.id_variants(project_id)}}
    ).sort("_id", 1).to_list(length=None)

    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(PdfDocumentOut.model_validate(d))
    return result


@router.delete("/{pdf_id}")
async def delete_pdf(pdf_id: str, force: bool = Query(False)):
    """
    Remove a PDF and everything extracted from it.

    Refused while rooms or budget items depend on the drawing. Deleting only the
    PDF record would leave its diagrams, rooms and budget items in place —
    invisible in the UI but still counted in the budget total.
    """
    if not ObjectId.is_valid(pdf_id):
        raise HTTPException(400, "Invalid pdf_id")

    pdf_docs_coll = get_pdf_documents_collection()
    doc = await pdf_docs_coll.find_one({"_id": ObjectId(pdf_id)})
    if not doc:
        raise HTTPException(404, "PDF not found")

    deps = await pdf_svc.get_pdf_dependencies(pdf_id)
    if not force and (deps["room_count"] or deps["budget_count"]):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Can't delete this drawing — {pdf_svc.describe_dependencies(deps)} "
                f"depend on it. Remove those first."
            ),
        )

    pdf_values = pdf_svc.id_variants(pdf_id)

    # Diagrams and pages are the only things keyed directly to the PDF. Rooms and
    # everything below them are guarded above, so at this point there are none.
    diagrams_deleted = await get_diagrams_collection().delete_many({"pdf_id": {"$in": pdf_values}})
    pages_deleted = await get_pages_collection().delete_many({"pdf_id": {"$in": pdf_values}})
    await get_processing_jobs_collection().delete_many({"pdf_id": {"$in": pdf_values}})
    await get_project_sources_collection().delete_many({"pdf_id": {"$in": pdf_values}})

    file_url = doc.get("file_path", "")
    if file_url.startswith("/local_file_db/"):
        full_path = _local_url_to_abs_path(file_url)
    else:
        full_path = os.path.join(UPLOAD_DIR, doc.get("filename", ""))

    if os.path.exists(full_path) and os.path.isfile(full_path):
        os.remove(full_path)

    await pdf_docs_coll.delete_one({"_id": ObjectId(pdf_id)})

    # Saved Pages caches diagram ids on the project, so drop the ones just removed.
    project_id = doc.get("project_id")
    if project_id and ObjectId.is_valid(str(project_id)):
        await _prune_selected_metadata(str(project_id))

    return {
        "ok": True,
        "deleted": {
            "diagrams": diagrams_deleted.deleted_count,
            "pages": pages_deleted.deleted_count,
        },
    }


async def _prune_selected_metadata(project_id: str) -> None:
    """Drop images from `selected_diagram_metadata` whose diagram no longer exists."""
    projects_coll = get_projects_collection()
    project = await projects_coll.find_one({"_id": ObjectId(project_id)})
    if not project:
        return

    metadata = project.get("selected_diagram_metadata") or {}
    images = metadata.get("images") or []
    if not images:
        return

    live_ids = set()
    candidate_ids = [
        ObjectId(img["id"]) for img in images
        if img.get("id") and ObjectId.is_valid(str(img.get("id")))
    ]
    if candidate_ids:
        live_ids = set(await get_diagrams_collection().distinct("_id", {"_id": {"$in": candidate_ids}}))

    kept = [
        img for img in images
        # Uploaded images have no diagram id and are not tied to any PDF.
        if not img.get("id") or not ObjectId.is_valid(str(img.get("id")))
        or ObjectId(img["id"]) in live_ids
    ]
    if len(kept) == len(images):
        return

    metadata["images"] = kept
    metadata["total"] = len(kept)
    metadata["updated_at"] = datetime.utcnow().isoformat()
    await projects_coll.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"selected_diagram_metadata": metadata}},
    )
