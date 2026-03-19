import os

import cv2
from bson import ObjectId
from pymongo import MongoClient

from config import MONGO_URI, MONGO_DB_NAME
from services.project_service import LOCAL_FILE_DB
from services.room_analysis.image_preprocessor import preprocess_floorplan_for_sam
from services.vlm_room_analysis.drawgrid import generate_grid_overlay
from services.vlm_room_analysis.analyse import analyze_floor_plan_to_file
from services.vlm_room_analysis.cell_to_pixel import convert_objects_cells_to_pixels
from services.vlm_room_analysis.masks_from_pixels_service import generate_masks_polygons_file


def update_room_analysis_status(room_id: str, status: str, progress: int, message: str = "", extra_fields: dict = None):
    """Utility to update the MongoDB room document with processing state"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        rooms_coll = db["rooms"]
        update_doc = {
            "analysis_status": status,
            "analysis_progress": progress,
            "analysis_message": message
        }
        if extra_fields:
            update_doc.update(extra_fields)

        rooms_coll.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": update_doc}
        )
        client.close()
    except Exception as e:
        print(f"[Orchestrator] Failed to update status for room {room_id}: {e}")


def run_room_analysis_pipeline(room_id: str, project_id: str, room_image_url: str):
    """
    Background Task: Executes the full SAM mask generation and grouping pipeline.
    """
    try:
        print(f"[Orchestrator] Starting analysis for room {room_id}")
        update_room_analysis_status(room_id, "preprocessing", 5, "Initializing analysis...")

        # 1. Setup paths
        # Ensure we have the physical path to the input image
        rel_img_path = room_image_url.replace("/local_file_db/", "").lstrip("/")
        input_image_path = os.path.join(LOCAL_FILE_DB, rel_img_path)

        if not os.path.exists(input_image_path):
            raise FileNotFoundError(f"Source image not found at {input_image_path}")

        # Create output directory for this room's analysis artifacts
        room_output_dir = os.path.join(LOCAL_FILE_DB, f"project_{project_id}", "rooms", str(room_id), "analysis")
        os.makedirs(room_output_dir, exist_ok=True)

        # Define output artifact paths (V2 VLM pipeline)
        preprocessed_img_path = os.path.join(room_output_dir, "preprocessed.png")
        grid_overlay_img_path = os.path.join(room_output_dir, "vlm_grid_overlay.png")
        objects_cells_json_path = os.path.join(room_output_dir, "vlm_objects_cells.json")
        objects_pixels_json_path = os.path.join(room_output_dir, "vlm_objects_pixels.json")
        masks_polygons_json_path = os.path.join(room_output_dir, "masks_polygons.json")

        base_url = f"/local_file_db/project_{project_id}/rooms/{room_id}/analysis"

        # 2. Preprocess Image
        update_room_analysis_status(room_id, "preprocessing", 10, "Preprocessing image for SAM...")
        img_bgr = cv2.imread(input_image_path)
        if img_bgr is None:
            raise ValueError(f"Could not read image using OpenCV: {input_image_path}")

        preprocessed_img_path = os.path.join(room_output_dir, "preprocessed.png")

        try:
            preprocess_floorplan_for_sam(
                img_bgr=img_bgr,
                save_output=True,
                output_dir=room_output_dir,
                output_name="preprocessed.png"
            )
        except Exception as e:
            print(f"[Orchestrator] Error during preprocessing: {e}")
            raise

        if not os.path.exists(preprocessed_img_path):
            raise ValueError(f"preprocess_floorplan_for_sam completed but file is missing at {preprocessed_img_path}")
        
        
        # 3. Draw adaptive grid on preprocessed image
        update_room_analysis_status(room_id, "drawing_grid", 25, "Drawing adaptive coordinate grid...")
        grid_meta = generate_grid_overlay(
            image_path=preprocessed_img_path,
            output_path=grid_overlay_img_path,
            rows=None,
            cols=None,
            color=(135, 128, 128),
            thickness=1,
            show_labels=True,
            font_scale=0.8,
        )

        # 4. VLM analysis → objects with cell coordinates
        update_room_analysis_status(room_id, "vlm_detect", 45, "Analyzing room with VLM...")
        analyze_floor_plan_to_file(
            image_path=grid_overlay_img_path,
            output_json_path=objects_cells_json_path,
        )

        # 5. Convert cell coordinates to pixel coordinates
        update_room_analysis_status(room_id, "cell_to_pixel", 65, "Converting detected cells to pixel coordinates...")
        convert_objects_cells_to_pixels(
            image_path=preprocessed_img_path,
            input_json_path=objects_cells_json_path,
            output_json_path=objects_pixels_json_path,
        )

        # 6. Generate masks_polygons.json from pixel coordinates
        update_room_analysis_status(room_id, "generating_masks", 85, "Generating masks polygons from VLM detections...")
        generate_masks_polygons_file(
            input_pixels_json_path=objects_pixels_json_path,
            output_masks_polygons_path=masks_polygons_json_path,
            image_path=preprocessed_img_path,
            room_id=room_id,
            project_id=project_id,
            default_group_type="FF&E",
            box_size=20,
        )

        # 7. Finalize Payload and Update MongoDB
        update_room_analysis_status(
            room_id=room_id,
            status="completed",
            progress=100,
            message="Room analysis successfully completed.",
            extra_fields={
                "masks_polygons_url": f"{base_url}/masks_polygons.json",
                "vlm_grid_overlay_url": f"{base_url}/vlm_grid_overlay.png",
                "vlm_objects_cells_url": f"{base_url}/vlm_objects_cells.json",
                "vlm_objects_pixels_url": f"{base_url}/vlm_objects_pixels.json",
                "analysis_pipeline": "vlm_v2",
                "grid_rows": grid_meta.get("rows"),
                "grid_cols": grid_meta.get("cols"),
            }
        )
        print(f"[Orchestrator] Successfully completed analysis for room {room_id}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Orchestrator] Error processing room {room_id}: {e}")
        update_room_analysis_status(room_id, "error", 0, f"Error: {str(e)}")
