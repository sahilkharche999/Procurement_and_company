import os
import shutil
from datetime import datetime

import fitz
from bson import ObjectId
from pymongo import MongoClient

from config import MONGO_URI, MONGO_DB_NAME, BASE_DIR, LOCAL_FILE_DB
from services.s3_storage_service import upload_file_to_s3

os.makedirs(LOCAL_FILE_DB, exist_ok=True)

_yolo_model = None
_yolo_load_error = None


def load_yolo_model():
    global _yolo_model, _yolo_load_error
    try:
        from doclayout_yolo import YOLOv10
        model_path = os.path.join(BASE_DIR, "doclayout_yolo_docstructbench_imgsz1024.pt")
        if not os.path.exists(model_path):
            _yolo_load_error = f"Model weights not found at: {model_path}"
            print(f"[YOLO] ⚠️  {_yolo_load_error}")
            return
        print("[YOLO] Loading model…")
        _yolo_model = YOLOv10(model_path)
        print(f"[YOLO] ✅ Model loaded. Classes: {list(_yolo_model.names.values())}")
    except Exception as e:
        _yolo_load_error = str(e)
        print(f"[YOLO] ❌ Failed to load model: {e}")


def get_yolo_status():
    return {
        "model_loaded": _yolo_model is not None,
        "error": _yolo_load_error,
        "model_path": os.path.join(BASE_DIR, "doclayout_yolo_docstructbench_imgsz1024.pt"),
        "model_exists": os.path.exists(os.path.join(BASE_DIR, "doclayout_yolo_docstructbench_imgsz1024.pt")),
        "classes": list(_yolo_model.names.values()) if _yolo_model else [],
    }


def _update_job(jobs_coll, job_id: str, **kwargs):
    jobs_coll.update_one({"_id": ObjectId(job_id)}, {"$set": kwargs})


def _pdf_suffix_from_id(pdf_id: str) -> str:
    raw = (pdf_id or "")[-6:]
    safe = "".join(ch for ch in raw if ch.isalnum()).lower()
    return safe or "unknown"


def _diagram_filename(page_num: int, sub_index: int, pdf_suffix: str) -> str:
    return f"p{page_num:03d}_d{sub_index:02d}_{pdf_suffix}.png"


def _yolo_crop_page(img_path: str, out_path: str) -> bool:
    if _yolo_model is None:
        return False
    import cv2
    PRIORITY = {"figure", "table"}
    IGNORE = {"abandon", "plain text", "table_footnote", "figure_caption", "table_caption"}
    try:
        img = cv2.imread(img_path)
        if img is None:
            return False
        h, w = img.shape[:2]
        results = _yolo_model.predict(img_path, imgsz=1024, conf=0.25, device="cpu")
        best_score, best_box = -1.0, None
        for r in results:
            for box in r.boxes:
                cls_name = _yolo_model.names[int(box.cls[0])]
                if cls_name in IGNORE:
                    continue
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                area = (x2 - x1) * (y2 - y1)
                score = float(box.conf[0]) * area
                if cls_name in PRIORITY:
                    score *= 10.0
                if score > best_score:
                    best_score, best_box = score, (x1, y1, x2, y2)
        if best_box is not None:
            x1, y1, x2, y2 = best_box
            pad = 10
            x1 = max(0, x1 - pad);
            y1 = max(0, y1 - pad)
            x2 = min(w, x2 + pad);
            y2 = min(h, y2 + pad)
            crop = img[y1:y2, x1:x2]
            cv2.imwrite(out_path, crop)
            return True
        return False
    except Exception as e:
        print(f"[YOLO] ❌ error on {os.path.basename(img_path)}: {e}")
        return False


def _detect_multiple_diagrams(image_path: str, min_area_ratio: float = 0.05):
    import cv2
    image = cv2.imread(image_path)
    if image is None:
        return [{"label": "full", "x_percent": 0, "y_percent": 0, "width_percent": 100, "height_percent": 100}]
    height, width = image.shape[:2]
    total_area = height * width
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = total_area * min_area_ratio
    valid_regions = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area >= min_area:
            valid_regions.append({
                "x": x, "y": y, "width": w, "height": h, "area": area,
                "x_percent": (x / width) * 100,
                "y_percent": (y / height) * 100,
                "width_percent": (w / width) * 100,
                "height_percent": (h / height) * 100,
            })
    valid_regions.sort(key=lambda r: r["area"], reverse=True)
    if len(valid_regions) <= 1 or valid_regions[0]["area"] > total_area * 0.70:
        return [{"label": "full", "x_percent": 0, "y_percent": 0, "width_percent": 100, "height_percent": 100}]
    diagram_regions = []
    for idx, region in enumerate(valid_regions[:4]):
        yp, xp, wp = region["y_percent"], region["x_percent"], region["width_percent"]
        if yp < 40:
            label = "top-left" if xp < 50 else "top-right"
        else:
            label = "bottom-left" if xp < 50 else "bottom-right"
        if yp > 50 and wp > 60:
            label = "bottom"
        diagram_regions.append({
            "label": label,
            "x_percent": region["x_percent"],
            "y_percent": region["y_percent"],
            "width_percent": region["width_percent"],
            "height_percent": region["height_percent"],
        })
    return diagram_regions


def _crop_regions(image_path: str, page_num: int, regions, out_dir: str, pdf_suffix: str):
    import cv2
    image = cv2.imread(image_path)
    if image is None:
        return []
    height, width = image.shape[:2]
    created = []
    for idx, region in enumerate(regions):
        x = int(region["x_percent"] * width / 100)
        y = int(region["y_percent"] * height / 100)
        w = int(region["width_percent"] * width / 100)
        h = int(region["height_percent"] * height / 100)
        x = max(0, min(x, width - 1))
        y = max(0, min(y, height - 1))
        w = max(1, min(w, width - x))
        h = max(1, min(h, height - y))
        cropped = image[y:y + h, x:x + w]
        sub_letter = chr(ord("a") + idx)
        filename = _diagram_filename(page_num, idx, pdf_suffix)
        out_path = os.path.join(out_dir, filename)
        cv2.imwrite(out_path, cropped)
        created.append((out_path, filename, region["label"], sub_letter))
    return created


def _sync_update_mongodb_project(project_id: str, pdf_id: str, page_paths: list, all_images: list):
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        projects_coll = db["projects"]
        project_sources_coll = db["project_sources"]
        pages_coll = db["pages"]
        diagrams_coll = db["diagrams"]

        # we might need to find project_source by project_id
        project_source = project_sources_coll.find_one({"project": ObjectId(project_id)})
        project_source_id = project_source["_id"] if project_source else None

        # touch project updated timestamp
        projects_coll.update_one(
            {"_id": ObjectId(project_id)},
            {
                "$set": {
                    "updated_at": datetime.now().isoformat()
                }
            }
        )

        # Re-processing same PDF should replace existing pages/diagrams for that PDF
        old_page_ids = pages_coll.distinct(
            "_id",
            {
                "project": ObjectId(project_id),
                "pdf_id": str(pdf_id),
            },
        )
        if old_page_ids:
            diagrams_coll.delete_many({"project": ObjectId(project_id), "page": {"$in": old_page_ids}})
            pages_coll.delete_many({"_id": {"$in": old_page_ids}})

        page_ids = []
        for idx, page_path in enumerate(page_paths):
            page_num = idx + 1
            # Upload page image to S3 and keep path pattern as S3 object key.
            page_s3_key = f"project_{project_id}/pdf_processing/pdf_{pdf_id}/temp/page_{page_num}_300dpi.png"
            page_url = upload_file_to_s3(page_path, page_s3_key)

            # create page record
            new_page = {
                "project": ObjectId(project_id),
                "project_source": project_source_id,
                "pdf_id": str(pdf_id),
                "page_no": page_num,
                "is_selected": False,
                "page_image_url": page_url,
                "diagrams": []  # populated next
            }
            res_page = pages_coll.insert_one(new_page)
            page_id = res_page.inserted_id
            page_ids.append(page_id)

            diagram_ids = []
            for img in all_images:
                if img["page_num"] == page_num:
                    diag_filename = img["filename"]
                    diag_local_path = img.get("path", "")
                    diag_s3_key = f"project_{project_id}/pdf_processing/pdf_{pdf_id}/extracted_diagrams/{diag_filename}"
                    diag_url = upload_file_to_s3(diag_local_path, diag_s3_key)
                    new_diagram = {
                        "project": ObjectId(project_id),
                        "page": page_id,
                        "pdf_id": str(pdf_id),
                        "diagram_seq": img["diagram_seq"],
                        "diagram_image_url": diag_url,
                        "filename": img["filename"],
                        "label": img["label"],
                        "sub_index": img["sub_index"],
                        "is_selected": False,
                        "rooms": []
                    }
                    res_diag = diagrams_coll.insert_one(new_diagram)
                    diagram_ids.append(res_diag.inserted_id)

            pages_coll.update_one(
                {"_id": page_id},
                {"$set": {"diagrams": diagram_ids}}
            )

        if project_source_id and page_ids:
            project_sources_coll.update_one(
                {"_id": project_source_id},
                {"$set": {"pages": page_ids}}
            )

        client.close()
    except Exception as e:
        print(f"[MongoDB] ❌ sync update failed: {e}")


def run_processing(job_id: str, pdf_path: str, dpi: int, min_area_pct: float):
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    jobs_coll = db["processing_jobs"]

    job = jobs_coll.find_one({"_id": ObjectId(job_id)})
    if not job:
        client.close();
        return

    job_dir = job.get("job_dir", "")
    temp_dir = os.path.join(job_dir, "temp")
    main_crops_dir = os.path.join(temp_dir, "main_crops")
    extracted_dir = os.path.join(job_dir, "extracted_diagrams")
    pdf_id = str(job.get("pdf_id", ""))
    pdf_suffix = _pdf_suffix_from_id(pdf_id)
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(main_crops_dir, exist_ok=True)
    os.makedirs(extracted_dir, exist_ok=True)

    try:
        _update_job(jobs_coll, job_id, status="processing", step="Step 1/3 — Converting PDF to images (300 DPI)",
                    progress=5)
        pdf_doc = fitz.open(pdf_path)
        total_pages = pdf_doc.page_count
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        page_paths = []
        for i, page in enumerate(pdf_doc):
            pix = page.get_pixmap(matrix=mat)
            name = os.path.join(temp_dir, f"page_{i + 1}_{dpi}dpi.png")
            pix.save(name)
            page_paths.append(name)
            prog = 5 + int(25 * (i + 1) / total_pages)
            _update_job(jobs_coll, job_id, progress=prog)
        pdf_doc.close()

        yolo_available = _yolo_model is not None
        if yolo_available:
            _update_job(jobs_coll, job_id, step="Step 2/3 — Extracting main areas with DocLayout-YOLO", progress=30)
        else:
            warn = _yolo_load_error or "doclayout_yolo not available"
            _update_job(jobs_coll, job_id, step=f"Step 2/3 — YOLO unavailable ({warn}), using full pages", progress=30)

        crop_paths = []
        for idx, img_path in enumerate(page_paths):
            out_path = os.path.join(main_crops_dir, f"main_p{idx + 1:03d}_{pdf_suffix}.png")
            if not yolo_available or not _yolo_crop_page(img_path, out_path):
                shutil.copy(img_path, out_path)
            crop_paths.append(out_path)
            prog = 30 + int(30 * (idx + 1) / len(page_paths))
            _update_job(jobs_coll, job_id, progress=prog)

        _update_job(jobs_coll, job_id, step="Step 3/3 — Detecting and splitting multiple diagrams", progress=62)
        min_area_ratio = min_area_pct / 100.0
        all_images = []

        for idx, crop_path in enumerate(crop_paths):
            page_num = idx + 1
            if not os.path.exists(crop_path):
                continue
            regions = _detect_multiple_diagrams(crop_path, min_area_ratio=min_area_ratio)
            if len(regions) == 1 and regions[0]["label"] == "full":
                filename_single = _diagram_filename(page_num, 0, pdf_suffix)
                dest = os.path.join(extracted_dir, filename_single)
                shutil.copy2(crop_path, dest)
                all_images.append({
                    "path": dest,
                    "filename": filename_single,
                    "label": "full",
                    "diagram_seq": "a",
                    "page_num": page_num,
                    "sub_index": 0,
                })
            else:
                created = _crop_regions(crop_path, page_num, regions, extracted_dir, pdf_suffix)
                for si, (out_path, filename, label, diagram_seq) in enumerate(created):
                    all_images.append({
                        "path": out_path,
                        "filename": filename,
                        "label": label,
                        "diagram_seq": diagram_seq,
                        "page_num": page_num,
                        "sub_index": si,
                    })
            prog = 62 + int(35 * (idx + 1) / len(crop_paths))
            _update_job(jobs_coll, job_id, progress=prog)

        # Update MongoDB project document/collections
        if job.get("project_id"):
            _sync_update_mongodb_project(job.get("project_id"), pdf_id, page_paths, all_images)

        _update_job(jobs_coll, job_id, status="done", step="Complete — all steps finished", progress=100)
    except Exception as e:
        _update_job(jobs_coll, job_id, status="error", error_msg=str(e), progress=0, step=f"Error: {str(e)}")
    finally:
        client.close()
