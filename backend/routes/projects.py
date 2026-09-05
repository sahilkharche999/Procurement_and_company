"""
routes/projects.py
──────────────────
All /projects/* REST endpoints, backed by MongoDB via the project service.
"""

import os
import time
import urllib.request
from datetime import datetime

import cv2
import numpy as np
from bson import ObjectId
from fastapi import APIRouter, HTTPException, File, Form, UploadFile, BackgroundTasks

from db.mongo import (
    get_projects_collection,
    get_diagrams_collection,
    get_rooms_collection,
    get_pages_collection,
    get_groups_collection,
    get_masks_collection,
    get_pdf_documents_collection,
)
from models.project import ProjectCreate, ProjectOut, ProjectUpdate
from services import project_service
from services.project_service import LOCAL_FILE_DB
from services.v2_room_analysis_orchestrator import run_room_analysis_pipeline
import services.project_pdf_service as pdf_svc

router = APIRouter(prefix="/projects", tags=["Projects"])


# ── Create ─────────────────────────────────────────────────────────────────────
@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate):
    """
    Create a new project document in MongoDB.
    Returns the created project with its MongoDB _id.
    """
    doc = await project_service.create_project_document(body.model_dump())
    return ProjectOut.from_mongo(doc)


# ── List all ───────────────────────────────────────────────────────────────────
@router.get("", response_model=list[ProjectOut])
async def list_projects(deleted: bool = False):
    """
    Return projects, newest first.

    `?deleted=true` returns the recycle bin instead of the working list.
    """
    docs = await project_service.get_all_projects(deleted=deleted)
    return [ProjectOut.from_mongo(d) for d in docs]


# ── Get one ────────────────────────────────────────────────────────────────────
@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str):
    """
    Fetch a single project by its MongoDB ObjectId.
    Returns full detail including selected_diagram_metadata.
    """
    doc = await project_service.get_project_by_id(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


# ── Partial update ─────────────────────────────────────────────────────────────
@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, body: ProjectUpdate):
    """
    Update any subset of project fields (name, description, registries, status…).
    Only fields that are explicitly provided (non-None) will be changed.
    """
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    doc = await project_service.update_project(project_id, updates)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


# ── Attach diagram metadata ────────────────────────────────────────────────────
@router.post("/{project_id}/attach-metadata")
async def attach_metadata(project_id: str, body: dict | None = None):
    """
    Refreshes `selected_diagram_metadata` from MongoDB-selected diagrams.
    Legacy `metadata_path` is accepted but ignored.
    """
    metadata_path = (body or {}).get("metadata_path")
    doc = await project_service.attach_diagram_metadata(project_id, metadata_path)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


# ── Update individual registries ───────────────────────────────────────────────
@router.patch("/{project_id}/mask-registry")
async def update_mask_registry(project_id: str, body: dict):
    """Replace the mask_registry for this project."""
    doc = await project_service.update_project(project_id, {"mask_registry": body})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


@router.patch("/{project_id}/polygon-registry")
async def update_polygon_registry(project_id: str, body: dict):
    """Replace the polygon_registry for this project."""
    doc = await project_service.update_project(project_id, {"polygon_registry": body})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


@router.patch("/{project_id}/group-registry")
async def update_group_registry(project_id: str, body: dict):
    """Replace the group_registry for this project."""
    doc = await project_service.update_project(project_id, {"group_registry": body})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


# ── Delete (soft) ──────────────────────────────────────────────────────────────
@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """
    Move a project to the recycle bin.

    Nothing is destroyed — no files, diagrams, rooms or budget items. The
    project is hidden from the working list and can be restored intact via
    POST /projects/{id}/restore.
    """
    doc = await project_service.soft_delete_project(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "ok": True,
        "deleted_id": project_id,
        "soft_deleted": True,
        "deleted_at": doc.get("deleted_at"),
    }


# ── Restore ────────────────────────────────────────────────────────────────────
@router.post("/{project_id}/restore", response_model=ProjectOut)
async def restore_project(project_id: str):
    """Bring a project back from the recycle bin."""
    doc = await project_service.restore_project(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.from_mongo(doc)


# ── Drawing sets (architectural PDFs uploaded to this project) ─────────────────
@router.get("/{project_id}/pdfs")
async def list_project_pdfs(project_id: str):
    """
    Every architectural PDF uploaded to this project, each with its extraction
    state and live job progress. Backs the drawing cards in the Source tab.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project id")
    exists = await get_projects_collection().find_one({"_id": ObjectId(project_id)}, {"_id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Project not found")
    return await pdf_svc.list_project_pdfs(project_id)


# ── Rename a drawing (cosmetic only) ───────────────────────────────────────────
@router.patch("/{project_id}/drawings/{diagram_id}")
async def rename_drawing(project_id: str, diagram_id: str, body: dict):
    """
    Set or clear a drawing's display name.

    Purely a label. `filename` stays the identifier that room extraction and the
    add/remove endpoints match on, so a rename can never break a lookup. Sending
    an empty name clears the override and the filename shows again.

    The name lives on the diagram rather than in `selected_diagram_metadata`
    because that array is rebuilt from the diagrams collection by
    attach_diagram_metadata — anything stored only there would be wiped.
    """
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(diagram_id):
        raise HTTPException(status_code=400, detail="Invalid project or drawing id")

    display_name = str(body.get("display_name") or "").strip()[:120]

    diagrams_coll = get_diagrams_collection()
    project_values = [project_id]
    if ObjectId.is_valid(project_id):
        project_values.append(ObjectId(project_id))

    update = (
        {"$set": {"display_name": display_name}}
        if display_name
        else {"$unset": {"display_name": ""}}
    )
    result = await diagrams_coll.update_one(
        {"_id": ObjectId(diagram_id), "project": {"$in": project_values}},
        update,
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Drawing not found in this project")

    return {"ok": True, "id": diagram_id, "display_name": display_name}


# ── Internal Pages (available in extracted_diagrams dir) ───────────────────────
@router.get("/{project_id}/available-pages")
async def get_available_pages(project_id: str, pdf_id: str = ""):
    """
    Returns all detected diagrams for this project from MongoDB.
    Used in the 'Add Pages' tab of the Source manager.

    Pass `pdf_id` to narrow the list to one drawing set — without it a project
    with several PDFs returns every diagram from all of them at once.
    """
    diagrams_coll = get_diagrams_collection()
    pages_coll = get_pages_collection()
    pdf_docs_coll = get_pdf_documents_collection()

    project_filter = ObjectId(project_id) if ObjectId.is_valid(project_id) else project_id
    diagram_filter = {"project": project_filter}
    if pdf_id:
        diagram_filter["pdf_id"] = {"$in": pdf_svc.id_variants(pdf_id)}
    diagrams = await diagrams_coll.find(diagram_filter).to_list(length=None)

    page_ids = [d.get("page") for d in diagrams if d.get("page")]
    page_map = {}
    if page_ids:
        pages = await pages_coll.find({"_id": {"$in": page_ids}}).to_list(length=None)
        page_map = {p["_id"]: p.get("page_no", 0) for p in pages}

    # Label each diagram with the drawing set it came from — page numbers restart
    # at 1 in every PDF, so the page number alone is ambiguous.
    pdf_ids = {str(d.get("pdf_id")) for d in diagrams if d.get("pdf_id")}
    pdf_name_map = {}
    valid_pdf_oids = [ObjectId(p) for p in pdf_ids if ObjectId.is_valid(p)]
    if valid_pdf_oids:
        pdf_docs = await pdf_docs_coll.find({"_id": {"$in": valid_pdf_oids}}).to_list(length=None)
        pdf_name_map = {
            str(p["_id"]): p.get("original_name") or p.get("filename", "")
            for p in pdf_docs
        }

    images = []
    for d in diagrams:
        d_pdf_id = str(d.get("pdf_id") or "")
        images.append({
            "id": str(d["_id"]),
            "filename": d.get("filename", ""),
            "page_num": page_map.get(d.get("page"), 0),
            "label": d.get("label", ""),
            "sub_index": d.get("sub_index", 0),
            "url": d.get("diagram_image_url", ""),
            "is_selected": d.get("is_selected", False),
            "pdf_id": d_pdf_id,
            "pdf_name": pdf_name_map.get(d_pdf_id, ""),
            # Cosmetic label; the UI falls back to `filename` when empty.
            "display_name": d.get("display_name", ""),
        })

    images.sort(key=lambda x: (x.get("pdf_name", ""), x.get("page_num", 0),
                               x.get("sub_index", 0), x.get("filename", "")))
    return {"images": images, "total": len(images)}


@router.get("/{project_id}/pages")
async def get_project_saved_pages(project_id: str):
    """
    Returns the images currently saved in the project's MongoDB document.
    Used in the 'Saved Pages' tab.
    """
    doc = await project_service.get_project_by_id(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    metadata = doc.get("selected_diagram_metadata") or {}
    return {
        "images": metadata.get("images", []),
        "total_selected": metadata.get("total", 0)
    }


@router.patch("/{project_id}/pages")
async def update_project_saved_pages(project_id: str, body: dict):
    """
    Adds or removes images from the project's selected_diagram_metadata.
    body: { "add_filenames": [...], "remove_filenames": [...] }
    """
    doc = await project_service.get_project_by_id(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    metadata = doc.get("selected_diagram_metadata") or {"images": [], "total": 0}
    images = metadata.get("images", [])

    add_list = body.get("add_filenames", [])
    remove_list = body.get("remove_filenames", [])

    # Collections needed to keep is_selected flags in sync with SourceTab actions.
    diagrams_coll = get_diagrams_collection()
    pages_coll = get_pages_collection()

    # Some legacy records use string project id, newer records use ObjectId.
    project_values = [project_id]
    if ObjectId.is_valid(project_id):
        project_values.append(ObjectId(project_id))

    # Handle removals
    if remove_list:
        images = [img for img in images if img["filename"] not in remove_list]

        # Mark corresponding diagrams as unselected in MongoDB.
        await diagrams_coll.update_many(
            {
                "project": {"$in": project_values},
                "filename": {"$in": remove_list},
            },
            {"$set": {"is_selected": False}},
        )

    # Handle additions
    if add_list:
        existing_fnames = {img["filename"] for img in images}
        add_diagrams = await diagrams_coll.find(
            {
                "project": {"$in": project_values},
                "filename": {"$in": add_list},
            }
        ).to_list(length=None)

        add_page_ids = [d.get("page") for d in add_diagrams if d.get("page")]
        add_page_map = {}
        if add_page_ids:
            add_pages = await pages_coll.find({"_id": {"$in": add_page_ids}}).to_list(length=None)
            add_page_map = {p["_id"]: p.get("page_no", 0) for p in add_pages}

        for d in add_diagrams:
            fname = d.get("filename", "")
            if not fname or fname in existing_fnames:
                continue
            images.append({
                "filename": fname,
                "page_number": add_page_map.get(d.get("page"), 0),
                "label": d.get("label", "full"),
                "sub_index": d.get("sub_index", 0),
                "url": d.get("diagram_image_url", ""),
                "diagram_id": str(d.get("_id")),
            })

        # Mark corresponding diagrams as selected in MongoDB.
        await diagrams_coll.update_many(
            {
                "project": {"$in": project_values},
                "filename": {"$in": add_list},
            },
            {"$set": {"is_selected": True}},
        )

    # Recompute page-level is_selected based on whether the page has any selected diagrams.
    changed_filenames = list(set(add_list + remove_list))
    if changed_filenames:
        affected_page_ids = await diagrams_coll.distinct(
            "page",
            {
                "project": {"$in": project_values},
                "filename": {"$in": changed_filenames},
            },
        )

        for page_id in affected_page_ids:
            has_selected_diagram = await diagrams_coll.find_one(
                {
                    "project": {"$in": project_values},
                    "page": page_id,
                    "is_selected": True,
                },
                {"_id": 1},
            )
            await pages_coll.update_one(
                {"_id": page_id},
                {"$set": {"is_selected": bool(has_selected_diagram)}},
            )

    # Update MongoDB
    metadata["images"] = images
    metadata["total"] = len(images)
    metadata["updated_at"] = datetime.utcnow().isoformat()

    await project_service.update_project(project_id, {"selected_diagram_metadata": metadata})
    return {"images": images, "total_selected": len(images)}


@router.post("/{project_id}/upload-image")
async def upload_image_to_mongo_project(
        project_id: str,
        file: UploadFile = File(...),
        page_number: int = Form(1),
        label: str = Form("UPLOADED")
):
    """
    Upload a floorplan image directly, without going through a PDF.

    The image becomes a real page + diagram, exactly like an extracted one. It
    used to be pushed only into `selected_diagram_metadata`, which left it
    invisible to the project aggregation and unusable for room extraction —
    both of those read the `diagrams` collection.
    """
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project id")

    projects_coll = get_projects_collection()
    project = await projects_coll.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create project-specific upload dir
    upload_dir = os.path.join(LOCAL_FILE_DB, f"project_{project_id}", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"upload_{int(datetime.now().timestamp())}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    url = f"/local_file_db/project_{project_id}/uploads/{filename}"

    project_oid = ObjectId(project_id)
    pages_coll = get_pages_collection()
    diagrams_coll = get_diagrams_collection()

    try:
        page_no = max(1, int(page_number))
    except (TypeError, ValueError):
        page_no = 1

    # Uploaded images have no source PDF, so they share a page per page number.
    page = await pages_coll.find_one({
        "project": project_oid,
        "page_no": page_no,
        "pdf_id": {"$in": [None, ""]},
    })
    if page:
        page_id = page["_id"]
        await pages_coll.update_one({"_id": page_id}, {"$set": {"is_selected": True}})
    else:
        page_result = await pages_coll.insert_one({
            "project": project_oid,
            "project_source": None,
            "pdf_id": None,
            "page_no": page_no,
            "is_selected": True,
            "page_image_url": url,
            "diagrams": [],
        })
        page_id = page_result.inserted_id

    sub_index = await diagrams_coll.count_documents({"project": project_oid, "page": page_id})

    # Stored names carry a uniqueness timestamp, so keep the name the user chose
    # as the label. They can still rename it later.
    original_label = os.path.splitext(file.filename or "")[0].strip()[:120]

    diagram_result = await diagrams_coll.insert_one({
        "project": project_oid,
        "page": page_id,
        "pdf_id": None,
        "diagram_seq": chr(ord("a") + min(sub_index, 25)),
        "diagram_image_url": url,
        "filename": filename,
        "display_name": original_label,
        "label": label,
        "sub_index": sub_index,
        "is_selected": True,
        "source": "uploaded",
        "rooms": [],
    })
    diagram_id = diagram_result.inserted_id
    await pages_coll.update_one({"_id": page_id}, {"$addToSet": {"diagrams": diagram_id}})

    new_img = {
        "id": str(diagram_id),
        "diagram_id": str(diagram_id),
        "filename": filename,
        "display_name": original_label,
        "url": url,
        "page_number": page_no,
        "label": label,
        "sub_index": sub_index,
        "source": "uploaded",
    }

    metadata = project.get("selected_diagram_metadata") or {}
    images = list(metadata.get("images") or [])
    images.append(new_img)
    metadata["images"] = images
    metadata["total"] = len(images)
    metadata["updated_at"] = datetime.utcnow().isoformat()

    await projects_coll.update_one(
        {"_id": project_oid},
        {"$set": {"selected_diagram_metadata": metadata,
                  "updated_at": datetime.utcnow().isoformat()}},
    )

    return {"ok": True, "image": new_img}


# ── Room Extraction ────────────────────────────────────────────────────────────
@router.post("/{project_id}/rooms/extract")
async def extract_rooms(project_id: str, body: dict):
    """
    Extracts individual rooms from a floorplan based on drawn polygons.
    body: {
        "image_url": "/local_file_db/project_.../extracted_diagrams/filename.png",
        "rooms": [
            { "name": "Room 1", "polygon": [{"x": 0.1, "y": 0.2}, ...] }
        ]
    }
    """
    image_url = body.get("image_url", "")
    filename = body.get("filename", "")
    page_number = body.get("page_number", 1)
    diagram_seq = body.get("diagram_seq", "a")
    rooms = body.get("rooms", [])

    if image_url.startswith("/local_file_db/"):
        rel_path = image_url[len("/local_file_db/"):]
        abs_path = os.path.join(LOCAL_FILE_DB, rel_path)

        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Image file not found")

        img = cv2.imread(abs_path)
        if img is None:
            raise HTTPException(status_code=500, detail="Could not read image file")
    elif image_url.startswith("http://") or image_url.startswith("https://"):
        try:
            with urllib.request.urlopen(image_url, timeout=30) as resp:
                img_bytes = resp.read()
            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not download image URL: {e}")

        if img is None:
            raise HTTPException(status_code=500, detail="Could not decode image from URL")
    else:
        raise HTTPException(status_code=400, detail="Invalid image URL")

    h, w = img.shape[:2]

    diagrams_coll = get_diagrams_collection()
    rooms_coll = get_rooms_collection()

    project_oid = ObjectId(project_id) if ObjectId.is_valid(project_id) else project_id
    diagram_id = body.get("diagram_id")

    diagram = None
    if diagram_id and len(diagram_id) == 24 and ObjectId.is_valid(diagram_id):
        diagram = await diagrams_coll.find_one({"_id": ObjectId(diagram_id), "project": project_oid})

    if not diagram and filename:
        # Fallback to finding by project_id and original filename logic (less reliable due to renames)
        diagram = await diagrams_coll.find_one({"project": project_oid, "filename": filename})

    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found for room extraction")

    try:
        page_num_int = int(page_number)
    except (TypeError, ValueError):
        page_num_int = 1

    # Prefer Mongo diagram sub_index for naming convention d00.
    diagram_num = 0
    sub_index = diagram.get("sub_index")
    if isinstance(sub_index, int):
        diagram_num = sub_index
    else:
        digits = "".join(ch for ch in str(diagram_seq) if ch.isdigit())
        if digits:
            diagram_num = int(digits)

    project_rooms_dir = os.path.join(LOCAL_FILE_DB, f"project_{project_id}", "rooms")
    os.makedirs(project_rooms_dir, exist_ok=True)

    results = []
    room_ids = []

    # Create an image with an alpha channel for transparent background editing
    img_bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    for idx, room in enumerate(rooms):
        name = room.get("name", f"room_{int(time.time())}_{idx}")
        polygon = room.get("polygon", [])

        if not polygon:
            continue

        existing = None
        incoming_room_id = str(room.get("id") or "").strip()
        if ObjectId.is_valid(incoming_room_id):
            existing = await rooms_coll.find_one({"_id": ObjectId(incoming_room_id), "project": project_oid})

        if not existing:
            # Check existence by name in current diagram to avoid duplicate IDs during re-save
            existing = await rooms_coll.find_one({
                "diagram": diagram["_id"],
                "$or": [{"name": name}, {"room_name": name}],
            })

        room_oid = existing["_id"] if existing else ObjectId()
        room_id_str = str(room_oid)
        created_at = (existing or {}).get("created_at") or datetime.now().isoformat()

        # Create/refresh room document first so folder can use Mongo room id.
        pre_file_room_doc = {
            "diagram": diagram["_id"],
            "project": project_oid,
            "name": name,
            "notes": (existing or {}).get("notes", ""),
            "created_by": (existing or {}).get("created_by", "system"),
            "is_included_in_budget": bool((existing or {}).get("is_included_in_budget", False)),
            "room_name": name,
            "created_at": created_at,
            "mask_array": polygon,
            "room_image_url": (existing or {}).get("room_image_url", ""),
            "image_width": int((existing or {}).get("image_width", 0) or 0),
            "image_height": int((existing or {}).get("image_height", 0) or 0),
        }
        if existing:
            await rooms_coll.update_one({"_id": room_oid}, {"$set": pre_file_room_doc})
        else:
            await rooms_coll.insert_one({"_id": room_oid, **pre_file_room_doc})

        pts = []
        for p in polygon:
            pts.append([int(p["x"] * w), int(p["y"] * h)])
        pts = np.array(pts, dtype=np.int32)

        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 255)

        img_bgra_masked = img_bgra.copy()
        img_bgra_masked[:, :, 3] = mask

        rx, ry, rbw, rbh = cv2.boundingRect(pts)

        # Safety guards
        rx, ry = max(0, rx), max(0, ry)
        rbw = min(rbw, w - rx)
        rbh = min(rbh, h - ry)

        cropped = img_bgra_masked[ry:ry + rbh, rx:rx + rbw]

        safe_name = "".join(c if c.isalnum() else "_" for c in name).strip("_") or "room"
        room_dir = os.path.join(project_rooms_dir, room_id_str)
        os.makedirs(room_dir, exist_ok=True)

        fname = f"p{page_num_int:03d}_d{diagram_num:02d}_{room_id_str}_{safe_name}.png"
        out_path = os.path.join(room_dir, fname)

        cv2.imwrite(out_path, cropped)

        url = f"/local_file_db/project_{project_id}/rooms/{room_id_str}/{fname}"

        image_height, image_width = cropped.shape[:2]
        await rooms_coll.update_one(
            {"_id": room_oid},
            {
                "$set": {
                    "room_image_url": url,
                    "image_width": int(image_width),
                    "image_height": int(image_height),
                    "mask_array": polygon,
                    "room_name": name,
                    "name": name,
                }
            },
        )

        room_ids.append(room_oid)
        results.append({
            "id": room_id_str,
            "name": name,
            "filename": fname,
            "url": url,
            "saved_path": out_path,
            "mask_array": polygon,
            "source_image": image_url,
            "created_at": created_at
        })

    if room_ids:
        # Link Diagram document to the Rooms
        await diagrams_coll.update_one(
            {"_id": diagram["_id"]},
            {"$addToSet": {"rooms": {"$each": room_ids}}}
        )

    return {"ok": True, "rooms": results}


# ── Delete Extracted Room ──────────────────────────────────────────────────────
@router.delete("/{project_id}/rooms/{room_id}")
async def delete_room(project_id: str, room_id: str, image_filename: str):
    """Deletes a specific extracted room mask based on its unique ID."""

    # Apply delete on MongoDB standalone schemas
    rooms_coll = get_rooms_collection()
    diagrams_coll = get_diagrams_collection()

    # Check if Room exists by ID or name
    delete_query = {
        "project": ObjectId(project_id),
        "$or": [
            # Check string representation of _id in case room_id is valid 24-char ObjectId
            {"_id": ObjectId(room_id) if len(room_id) == 24 else room_id},
            {"room_name": room_id},
            {"name": room_id},
        ]
    }

    room_to_del = await rooms_coll.find_one(delete_query)
    if room_to_del:
        room_url = room_to_del.get("room_image_url", "")
        if isinstance(room_url, str) and room_url.startswith("/local_file_db/"):
            abs_path = os.path.join(LOCAL_FILE_DB, room_url.replace("/local_file_db/", "").lstrip("/\\"))
            if os.path.exists(abs_path):
                os.remove(abs_path)

        await rooms_coll.delete_one({"_id": room_to_del["_id"]})
        # Unlink from parent Diagram document
        await diagrams_coll.update_one(
            {"_id": room_to_del["diagram"]},
            {"$pull": {"rooms": room_to_del["_id"]}}
        )

    return {"ok": True}


# ── Room Analysis Orchestration ───────────────────────────────────────────────
@router.post("/{project_id}/rooms/{room_id}/analyze")
async def analyze_room(project_id: str, room_id: str, background_tasks: BackgroundTasks):
    """
    Trigger the background SAM mask generation pipeline for a specific room.
    """
    rooms_coll = get_rooms_collection()
    # Check if Room exists
    room_doc = await rooms_coll.find_one(
        {"_id": ObjectId(room_id) if len(room_id) == 24 else room_id, "project": ObjectId(project_id)})

    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found in this project.")

    # Reprocess safety: remove stale editor entities for this room first,
    # so old labels/masks do not mix with newly generated data.
    groups_coll = get_groups_collection()
    masks_coll = get_masks_collection()

    room_id_str = str(room_doc["_id"])
    project_id_str = str(project_id)
    room_id_oid = ObjectId(room_id_str) if len(room_id_str) == 24 and ObjectId.is_valid(room_id_str) else room_id_str
    project_id_oid = ObjectId(project_id_str) if len(project_id_str) == 24 and ObjectId.is_valid(project_id_str) else project_id_str

    cleanup_filter = {
        "room": {"$in": [room_id_str, room_id_oid]},
        "project": {"$in": [project_id_str, project_id_oid]},
    }

    await masks_coll.delete_many(cleanup_filter)
    await groups_coll.delete_many(cleanup_filter)

    # Queue the background process
    background_tasks.add_task(
        run_room_analysis_pipeline,
        room_id=str(room_doc["_id"]),
        project_id=project_id,
        room_image_url=room_doc.get("room_image_url", "")
    )

    # Initialize state
    await rooms_coll.update_one(
        {"_id": room_doc["_id"]},
        {"$set": {
            "analysis_status": "pending",
            "analysis_progress": 0,
            "analysis_message": "Queued for processing..."
        }}
    )

    return {"ok": True, "message": "Room analysis started in the background."}


@router.get("/{project_id}/rooms/{room_id}/analysis-status")
async def get_room_analysis_status(project_id: str, room_id: str):
    """
    Poll the current status of the background analysis pipeline.
    """
    rooms_coll = get_rooms_collection()
    room_doc = await rooms_coll.find_one(
        {"_id": ObjectId(room_id) if len(room_id) == 24 else room_id, "project": ObjectId(project_id)})

    if not room_doc:
        raise HTTPException(status_code=404, detail="Room not found.")

    return {
        "ok": True,
        "status": room_doc.get("analysis_status", "idle"),
        "progress": room_doc.get("analysis_progress", 0),
        "message": room_doc.get("analysis_message", ""),
        "masks_polygons_url": room_doc.get("masks_polygons_url", ""),
        "masks_groups_url": room_doc.get("masks_groups_url", ""),
        "masks_pkl_url": room_doc.get("masks_pkl_url", "")
    }
