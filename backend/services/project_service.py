"""
project_service.py
──────────────────
Business logic that sits between the route handlers and the database.
"""

import json
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


async def attach_diagram_metadata(project_id: str, metadata_path: str) -> dict | None:
    """
    Called after save-selected completes. This function:
      1. Renames the tmp_XXXXXX folder  →  project_{mongo_id}/
      2. Creates project_{mongo_id}/final/
      3. Moves + renames selected images  →  {mongo_id}_{page}_{seq}.png
      4. Writes project_{mongo_id}/selected_image_registry.json with updated paths
      5. Stores selected_image_registry location in the MongoDB project document
    """
    if not os.path.exists(metadata_path):
        print(f"[attach_metadata] ⚠️  metadata file not found: {metadata_path}")
        return None

    with open(metadata_path) as f:
        metadata = json.load(f)

    # ── Step 1:  Find and rename the tmp_ folder ───────────────────────────
    old_selected_dir = os.path.dirname(metadata_path)

    # Walk up from old_selected_dir until its parent is LOCAL_FILE_DB
    old_tmp_dir = old_selected_dir
    while os.path.dirname(old_tmp_dir) != LOCAL_FILE_DB:
        parent = os.path.dirname(old_tmp_dir)
        if parent == old_tmp_dir:  # reached filesystem root — safety guard
            break
        old_tmp_dir = parent

    # Rename tmp_XXXXXX  →  project_{mongo_id}
    project_folder = os.path.join(LOCAL_FILE_DB, f"project_{project_id}")
    if old_tmp_dir != project_folder and os.path.exists(old_tmp_dir):
        os.rename(old_tmp_dir, project_folder)
        print(f"[attach_metadata] 📁 '{os.path.basename(old_tmp_dir)}' → 'project_{project_id}'")
    else:
        os.makedirs(project_folder, exist_ok=True)

    # Recalculate old_selected_dir now that the folder has been renamed
    rel_from_tmp = old_selected_dir[len(old_tmp_dir):].lstrip("/\\")
    old_selected_dir = os.path.join(project_folder, rel_from_tmp)

    # ── Step 2:  Create final/ and move + rename images ────────────────────
    final_folder = os.path.join(project_folder, "final")
    os.makedirs(final_folder, exist_ok=True)

    updated_images = []
    for img in metadata.get("images", []):
        page_num = img.get("page_number", 0)
        diagram_seq = img.get("diagram_seq", "a")

        # Canonical filename: {mongo_id}_{page}_{seq}.png
        new_filename = f"{project_id}_{page_num}_{diagram_seq}.png"
        new_full_path = os.path.join(final_folder, new_filename)

        # Locate the old file, remapping path under renamed folder if needed
        old_path = img.get("saved_path", "")
        if old_path:
            old_path = old_path.replace(old_tmp_dir, project_folder)
        if not old_path or not os.path.exists(old_path):
            old_path = os.path.join(old_selected_dir, img.get("filename", ""))

        if os.path.exists(old_path):
            shutil.move(old_path, new_full_path)

        rel_path = new_full_path.replace(LOCAL_FILE_DB, "").lstrip("/\\").replace("\\", "/")
        new_url = f"/local_file_db/{rel_path}"

        updated_images.append({
            **img,
            "filename": new_filename,
            "saved_path": new_full_path,
            "url": new_url,
        })

    # ── Step 3:  Write selected_image_registry.json into project root ──────
    new_meta_path = os.path.join(project_folder, "selected_image_registry.json")
    metadata["images"] = updated_images
    metadata["project_id"] = project_id
    with open(new_meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[attach_metadata] ✅ {len(updated_images)} image(s) → project_{project_id}/final/")

    return await update_project(project_id, {
        "selected_image_registry": f"/local_file_db/project_{project_id}/selected_image_registry.json"
    })
