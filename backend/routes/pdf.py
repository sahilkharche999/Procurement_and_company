import os
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form

from db.mongo import get_projects_collection, get_project_sources_collection, get_pdf_documents_collection
from schemas.budget import PdfDocumentOut

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

router = APIRouter(prefix="/pdf", tags=["PDF"])

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "pdfs")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), section: str = Form("general")):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    project_name = now.strftime("%d-%m-%Y_%-I_%-M_%p")

    safe_name = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    content = await file.read()
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

    projects_coll = get_projects_collection()
    project_sources_coll = get_project_sources_collection()
    pdf_docs_coll = get_pdf_documents_collection()

    new_project = {
        "projectName": project_name,
        "name": project_name,
        "description": f"Uploaded from {file.filename}",
        "createdAt": now.isoformat(),
        "created_at": now.isoformat(),
        "status": "draft",
    }
    result = await projects_coll.insert_one(new_project)
    project_id = str(result.inserted_id)

    new_project_source = {
        "project": result.inserted_id,
        "source_pdf_url": f"/uploads/pdfs/{safe_name}",
        "pages": []
    }
    await project_sources_coll.insert_one(new_project_source)

    doc_data = {
        "filename": safe_name,
        "original_name": file.filename,
        "file_path": f"/uploads/pdfs/{safe_name}",
        "file_size": file_size,
        "section": section,
        "page_count": page_count,
        "uploaded_at": now.isoformat(),
        "project_id": project_id
    }
    doc_result = await pdf_docs_coll.insert_one(doc_data)
    doc_data["id"] = str(doc_result.inserted_id)

    return PdfDocumentOut.model_validate(doc_data)


@router.get("/list")
async def list_pdfs(section: str = Query("general")):
    pdf_docs_coll = get_pdf_documents_collection()
    docs = await pdf_docs_coll.find({"section": section}).to_list(length=None)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(PdfDocumentOut.model_validate(d))
    return result


@router.delete("/{pdf_id}")
async def delete_pdf(pdf_id: str):
    pdf_docs_coll = get_pdf_documents_collection()
    doc = await pdf_docs_coll.find_one({"_id": ObjectId(pdf_id)})
    if not doc:
        raise HTTPException(404, "PDF not found")

    full_path = os.path.join(UPLOAD_DIR, doc.get("filename", ""))
    if os.path.exists(full_path) and os.path.isfile(full_path):
        os.remove(full_path)

    await pdf_docs_coll.delete_one({"_id": ObjectId(pdf_id)})
    return {"ok": True}
