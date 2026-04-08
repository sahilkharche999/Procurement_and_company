"""
project_service.py
──────────────────
Business logic that sits between the route handlers and the database.
"""

import os
import shutil
from datetime import datetime

from bson import ObjectId

from config import LOCAL_FILE_DB
from db.mongo import (
    get_db,
    get_projects_collection,
    get_diagrams_collection,
    get_pages_collection,
    get_rooms_collection
)


async def create_project_document(data: dict) -> dict:
    """Insert a new project document into MongoDB and return the saved doc."""
    col = get_projects_collection()
    now = datetime.utcnow().isoformat()
    doc = {
        "name": data.get("name", "Untitled Project"),
        "description": data.get("description", ""),
        "status": "draft",
        "source_pdf_path": data.get("source_pdf_path"),
        "mask_registry": data.get("mask_registry"),
        "polygon_registry": data.get("polygon_registry"),
        "group_registry": data.get("group_registry"),
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


async def get_all_projects() -> list[dict]:
    """Return all projects, newest first."""
    col = get_projects_collection()
    cursor = col.find().sort("created_at", -1)
    docs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        docs.append(doc)
    return docs


async def get_project_by_id(project_id: str) -> dict | None:
    """Return one project by its MongoDB ObjectId string, dynamically aggregating diagrams and rooms."""
    col = get_projects_collection()
    if not ObjectId.is_valid(project_id):
        return None

    doc = await col.find_one({"_id": ObjectId(project_id)})
    if not doc:
        return None

    # Force string conversion early
    doc["_id"] = str(doc["_id"])

    # Init native relational array
    doc["diagrams"] = []

    try:
        diagrams_coll = get_diagrams_collection()
        pages_coll = get_pages_collection()
        rooms_coll = get_rooms_collection()

        obj_project_id = ObjectId(project_id)

        # 1. Pipeline: Get all generated diagrams that are marked as selected
        cursor = diagrams_coll.find({"project": obj_project_id, "is_selected": True})
        diagrams = await cursor.to_list(length=None)

        for diag in diagrams:
            # 2. Extract relative Page document for `page_num` mapping
            page_num = 1
            if diag.get("page"):
                page_doc = await pages_coll.find_one({"_id": diag["page"]})
                if page_doc:
                    page_num = page_doc.get("page_no", 1)

            # 3. Extract related Rooms
            room_cursor = rooms_coll.find({"diagram": diag["_id"]})
            rooms_list = await room_cursor.to_list(length=None)

            formatted_rooms = []
            for r in rooms_list:
                formatted_rooms.append({
                    "id": str(r["_id"]),
                    "name": r.get("name") or r.get("room_name", ""),
                    "is_included_in_budget": r.get("is_included_in_budget", False),
                    "filename": diag.get("filename", ""),  # Relational inherit
                    "url": r.get("room_image_url", ""),
                    "saved_path": r.get("saved_path", ""),  # Optional local path mapping
                    "mask_array": r.get("mask_array", []),
                    "source_image": diag.get("diagram_image_url", ""),
                    "created_at": r.get("created_at") or datetime.utcnow().isoformat(),
                    "analysis_status": r.get("analysis_status"),
                    "analysis_progress": r.get("analysis_progress"),
                    "analysis_message": r.get("analysis_message"),
                    "masks_polygons_url": r.get("masks_polygons_url"),
                    "masks_groups_url": r.get("masks_groups_url"),
                    "masks_pkl_url": r.get("masks_pkl_url")
                })

            # Append derived relational hierarchy naturally onto the response payload
            doc["diagrams"].append({
                "id": str(diag["_id"]),
                "filename": diag.get("filename", ""),
                "page_number": page_num,
                "label": diag.get("label", "full"),
                "diagram_seq": diag.get("diagram_seq", "a"),
                "sub_index": diag.get("sub_index", 0),
                "url": diag.get("diagram_image_url", ""),
                "saved_path": "",  # Omitted if pure storage, can be derived
                "rooms": formatted_rooms,
                "is_selected": True
            })

    except Exception as e:
        print(f"[get_project_by_id] Query Aggregation Error: {e}")

    return doc


async def update_project(project_id: str, updates: dict) -> dict | None:
    """Apply a partial update dict to a project. Always sets updated_at."""
    col = get_projects_collection()
    if not ObjectId.is_valid(project_id):
        return None
    updates["updated_at"] = datetime.utcnow().isoformat()
    updates = {k: v for k, v in updates.items() if v is not None}
    await col.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": updates},
    )
    return await get_project_by_id(project_id)


async def delete_project(project_id: str) -> bool:
    """
    Delete a project and all related resources.

    Steps:
      1) Delete the project root folder from local_file_db/project_{project_id}
      2) Delete all related MongoDB documents in collections that reference this project
         via either `project` or `project_id` fields (string/ObjectId tolerant)
      3) Delete the project document itself
    """
    projects_coll = get_projects_collection()
    db = get_db()

    print(f"[delete_project] Starting delete for project_id={project_id}")

    # Validate project id format first.
    if not ObjectId.is_valid(project_id):
        print(f"[delete_project] Invalid project id format: {project_id}")
        return False

    obj_project_id = ObjectId(project_id)

    # Ensure project exists; if not, behave exactly as before and return False.
    existing = await projects_coll.find_one({"_id": obj_project_id}, {"_id": 1})
    if not existing:
        print(f"[delete_project] Project not found: {project_id}")
        return False

    # Build match clauses once so all queries stay consistent.
    # We support both string and ObjectId values because existing data uses both.
    project_value_variants = [project_id, obj_project_id]

    def _build_project_filter(*field_names: str) -> dict:
        return {
            "$or": [
                {field: {"$in": project_value_variants}}
                for field in field_names
            ]
        }

    # 1) Remove project directory from disk (safe if already missing).
    project_folder = os.path.join(LOCAL_FILE_DB, f"project_{project_id}")
    if os.path.isdir(project_folder):
        print(f"[delete_project] Removing folder: {project_folder}")
        shutil.rmtree(project_folder, ignore_errors=True)
        print(f"[delete_project] Folder removed: {project_folder}")
    else:
        print(f"[delete_project] Folder not found (skipped): {project_folder}")

    # 2) Remove related documents across all known project-bound collections.
    #    Note: delete_many with no matches is a no-op and does not raise.
    cleanup_plan = [
        ("diagrams", _build_project_filter("project", "project_id")),
        ("groups", _build_project_filter("project", "project_id")),
        ("jobs", _build_project_filter("project", "project_id")),
        ("pages", _build_project_filter("project", "project_id")),
        ("pdf_documents", _build_project_filter("project", "project_id")),
        ("processing_jobs", _build_project_filter("project", "project_id")),
        ("project_sources", _build_project_filter("project", "project_id")),
        ("rooms", _build_project_filter("project", "project_id")),
        # Extra safety: budget items are also project-bound in this system.
        ("budget_items", _build_project_filter("project", "project_id")),
    ]

    total_related_deleted = 0
    for collection_name, filt in cleanup_plan:
        try:
            result = await db[collection_name].delete_many(filt)
            total_related_deleted += result.deleted_count
            print(
                f"[delete_project] Cleanup '{collection_name}': deleted {result.deleted_count} document(s)"
            )
        except Exception as e:
            # Log and continue so one collection failure does not block the whole operation.
            print(f"[delete_project] cleanup failed for '{collection_name}': {e}")

    # 3) Finally remove the project document itself.
    result = await projects_coll.delete_one({"_id": obj_project_id})
    print(
        f"[delete_project] Project document delete count: {result.deleted_count}; "
        f"related documents deleted: {total_related_deleted}"
    )
    print(f"[delete_project] Finished delete for project_id={project_id}")
    return result.deleted_count == 1


async def attach_diagram_metadata(project_id: str, metadata_path: str | None = None) -> dict | None:
    """Mongo-only refresh for selected diagram metadata.

    `metadata_path` is ignored and kept only for backward-compatible API payloads.
    """
    if not ObjectId.is_valid(project_id):
        return None

    obj_project_id = ObjectId(project_id)
    diagrams_coll = get_diagrams_collection()
    pages_coll = get_pages_collection()

    diagrams = await diagrams_coll.find({"project": obj_project_id, "is_selected": True}).to_list(length=None)

    page_ids = [d.get("page") for d in diagrams if d.get("page")]
    page_map = {}
    if page_ids:
        pages = await pages_coll.find({"_id": {"$in": page_ids}}).to_list(length=None)
        page_map = {p["_id"]: p.get("page_no", 0) for p in pages}

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
            "is_selected": True,
        })

    images.sort(key=lambda x: (x.get("page_number", 0), x.get("sub_index", 0), x.get("filename", "")))

    selected_diagram_metadata = {
        "project_id": project_id,
        "total": len(images),
        "updated_at": datetime.utcnow().isoformat(),
        "images": images,
    }

    return await update_project(project_id, {
        "selected_diagram_metadata": selected_diagram_metadata,
    })
