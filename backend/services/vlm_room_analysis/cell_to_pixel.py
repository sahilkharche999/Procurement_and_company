import cv2
import os
import json

try:
    from services.vlm_room_analysis.drawgrid import (
        get_target_cell_size,
        calculate_optimal_grid,
    )
except Exception:
    # Fallback for direct script execution
    from drawgrid import get_target_cell_size, calculate_optimal_grid


def infer_image_path_from_json(json_path):
    """
    Infer source image path from JSON name.

    Examples:
    - 2preprocessed.ffe.json -> input/2preprocessed.png
    - 2preprocessed_with_pixels.json -> input/2preprocessed.png
    """
    base_name = os.path.basename(json_path)

    if base_name.endswith(".ffe.json"):
        stem = base_name[: -len(".ffe.json")]
    elif base_name.endswith("_with_pixels.json"):
        stem = base_name[: -len("_with_pixels.json")]
    elif base_name.endswith(".json"):
        stem = base_name[: -len(".json")]
    else:
        stem = base_name

    myexp_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(myexp_dir, "input", f"{stem}.png")
    return candidate


def cell_to_pixel_center(
    image_path,
    cell_row,
    cell_col,
):
    """
    Converts grid cell coordinates (x, y) to image pixel coordinates of the cell center.

    Args:
        image_path (str): Path to the image
        cell_row (int): Row index (0-based)
        cell_col (int): Column index (0-based)

    Returns:
        tuple: (pixel_x, pixel_y) - center point of the cell in image coordinates

    Example:
        If image is 2000x2000 with 20x20 grid (100x100 cells),
        cell_to_pixel_center(image, 0, 0) -> (50, 50)  # top-left cell center
        cell_to_pixel_center(image, 0, 1) -> (150, 50) # first row, second column
    """
    # Load image
    if not os.path.exists(image_path):
        raise ValueError(f"❌ Image not found: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("❌ Failed to load image")

    img_height, img_width, _ = img.shape

    # Get target cell size based on image dimensions
    target_cell_w, target_cell_h = get_target_cell_size(img_width, img_height)

    # Calculate rows and cols for this image
    rows, cols = calculate_optimal_grid(
        image_width=img_width,
        image_height=img_height,
        target_cell_width=target_cell_w,
        target_cell_height=target_cell_h,
    )

    # Calculate actual cell dimensions
    actual_cell_w = img_width / cols
    actual_cell_h = img_height / rows

    # Validate cell coordinates
    if cell_col < 0 or cell_col >= cols:
        raise ValueError(
            f"❌ cell_col={cell_col} out of range [0, {cols-1}]"
        )
    if cell_row < 0 or cell_row >= rows:
        raise ValueError(
            f"❌ cell_row={cell_row} out of range [0, {rows-1}]"
        )

    # Calculate center point of the cell
    pixel_x = int((cell_col + 0.5) * actual_cell_w)
    pixel_y = int((cell_row + 0.5) * actual_cell_h)

    return pixel_x, pixel_y


def load_and_convert_json(image_path, json_path):
    """
    Load a JSON file with cell coordinates and convert all coordinates to pixel centers.

    Args:
        image_path (str): Path to the image
        json_path (str): Path to the JSON file with cell coordinates

    Returns:
        list: Updated JSON structure with pixel coordinates added
    """
    if not os.path.exists(json_path):
        raise ValueError(f"❌ JSON file not found: {json_path}")

    with open(json_path, 'r') as f:
        data = json.load(f)

    for item in data:
        if 'similar_objects_cell' in item:
            item['similar_objects_pixel'] = []
            for cell in item['similar_objects_cell']:
                # IMPORTANT:
                # Source JSON uses x=row and y=column for cell indexing.
                cell_row = int(cell['x'])
                cell_col = int(cell['y'])
                pixel_x, pixel_y = cell_to_pixel_center(image_path, cell_row, cell_col)
                item['similar_objects_pixel'].append({
                    'pixel_x': pixel_x,
                    'pixel_y': pixel_y,
                })

    return data


def convert_json_file(image_path, input_json_path, output_json_path):
    """
    Convert cell coordinates JSON to pixel coordinates JSON and save to disk.
    """
    updated_data = load_and_convert_json(image_path, input_json_path)
    with open(output_json_path, 'w') as f:
        json.dump(updated_data, f, indent=2)
    return updated_data


def convert_objects_cells_to_pixels(image_path, input_json_path, output_json_path):
    """Pipeline-friendly alias for converting cell coordinates to pixel coordinates."""
    return convert_json_file(
        image_path=image_path,
        input_json_path=input_json_path,
        output_json_path=output_json_path,
    )


# =====================================
# DRIVER CODE FOR MANUAL TESTING
# =====================================
if __name__ == "__main__":
    # Test 1: Simple manual test
    print("=" * 60)
    print("TEST 1: Simple cell-to-pixel conversion")
    print("=" * 60)

    image_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/input/2preprocessed.png"
    
    try:
        # Test cell (0, 0)
        px, py = cell_to_pixel_center(image_path, 0, 0)
        print(f"Cell (x=0, y=0) -> Pixel ({px}, {py})")

        # Test cell row=5, col=4
        px, py = cell_to_pixel_center(image_path, 5, 4)
        print(f"Cell (x=5, y=4) -> Pixel ({px}, {py})")

        # Test cell row=6, col=5
        px, py = cell_to_pixel_center(image_path, 6, 5)
        print(f"Cell (x=6, y=5) -> Pixel ({px}, {py})")

        print("\n✅ Test 1 passed!\n")
    except Exception as e:
        print(f"❌ Test 1 failed: {e}\n")

    # Test 2: Convert JSON file
    print("=" * 60)
    print("TEST 2: JSON conversion")
    print("=" * 60)

    json_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/output/2preprocessed.ffe.json"
    output_json_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/output/2preprocessed_with_pixels.json"

    # Safety: if image path is not set correctly, infer from json filename
    inferred_image = infer_image_path_from_json(json_path)
    if os.path.exists(inferred_image) and os.path.basename(inferred_image) != os.path.basename(image_path):
        print(f"⚠️ Using inferred image for better alignment: {inferred_image}")
        image_path = inferred_image

    try:
        updated_data = convert_json_file(image_path, json_path, output_json_path)

        print(f"✅ Converted JSON saved to: {output_json_path}\n")
        print("Sample output:")
        print(json.dumps(updated_data[0], indent=2))

    except Exception as e:
        print(f"❌ Test 2 failed: {e}\n")
