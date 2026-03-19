import cv2
import os

# Default (medium-range) target cell size
TARGET_CELL_W = 140.9
TARGET_CELL_H = 128.4


def get_target_cell_size(image_width, image_height):
    """
    Select target cell size by image dimensions.

    Rules:
    - if width and height are < 1500: (100, 100)
    - if width and height are between 1500 and 3000: (140.9, 128.4)
    - if width and height are > 3000: (160, 1160)
    """
    if image_width < 1500 and image_height < 1500:
        return 100, 100

    if 1500 <= image_width <= 3000 and 1500 <= image_height <= 3000:
        return 140.9, 128.4

    if image_width > 3000 and image_height > 3000:
        return 160, 1160

    # Fallback for mixed-dimension cases
    max_dim = max(image_width, image_height)
    if max_dim < 1500:
        return 100, 100
    if max_dim <= 3000:
        return 140.9, 128.4
    return 160, 1160


def calculate_optimal_grid(
    image_width,
    image_height,
    target_cell_width,
    target_cell_height,
    min_cells=1,
):
    """
    Calculates rows/cols so output cell size stays close to the target cell size.
    """
    cols = max(min_cells, int(round(image_width / target_cell_width)))
    rows = max(min_cells, int(round(image_height / target_cell_height)))
    return rows, cols


def draw_grid(
    image_path,
    rows=None,
    cols=None,
    color=(200, 200, 200),   # light gray (BGR)
    thickness=1,
    show_labels=True,
    font_scale=0.8,
    output_path="output_grid.png"
):
    """
    Draws a grid on the image with optional (row, col) labels.

    Args:
        image_path (str): Path to input image
        rows (int | None): Number of grid rows. If None, auto-computed.
        cols (int | None): Number of grid columns. If None, auto-computed.
        color (tuple): Grid color in BGR
        thickness (int): Line thickness
        show_labels (bool): Whether to draw (row, col) text
        font_scale (float): Size of label text
        output_path (str): Path to save output image
    """

    # -------------------------------
    # LOAD IMAGE
    # -------------------------------
    if not os.path.exists(image_path):
        raise ValueError(f"❌ Image not found: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("❌ Failed to load image")

    h, w, _ = img.shape

    # -------------------------------
    # AUTO-COMPUTE GRID FROM REFERENCE BOX SIZE
    # -------------------------------
    if rows is None or cols is None:
        target_cell_w, target_cell_h = get_target_cell_size(w, h)
        rows, cols = calculate_optimal_grid(
            image_width=w,
            image_height=h,
            target_cell_width=target_cell_w,
            target_cell_height=target_cell_h,
        )
        print(
            f"ℹ️ Auto grid selected -> rows={rows}, cols={cols}, "
            f"target_cell=({target_cell_w}, {target_cell_h})"
        )

    # -------------------------------
    # COMPUTE CELL SIZE
    # -------------------------------
    cell_w = w / cols
    cell_h = h / rows

    # -------------------------------
    # DRAW VERTICAL LINES
    # -------------------------------
    for c in range(1, cols):
        x = int(c * cell_w)
        cv2.line(img, (x, 0), (x, h), color, thickness)

    # -------------------------------
    # DRAW HORIZONTAL LINES
    # -------------------------------
    for r in range(1, rows):
        y = int(r * cell_h)
        cv2.line(img, (0, y), (w, y), color, thickness)

    # -------------------------------
    # DRAW LABELS (row, col)
    # -------------------------------
    if show_labels:
        font = cv2.FONT_HERSHEY_DUPLEX
        text_color = (170, 158, 158)  # Light gray color for text

        for r in range(rows):
            for c in range(cols):
                x = int(c * cell_w + 5)
                y = int(r * cell_h + 25)  # More margin from top

                label = f"({r},{c})"
                cv2.putText(
                    img,
                    label,
                    (x, y),
                    font,
                    font_scale,
                    text_color,
                    2,  # Bold thickness
                    cv2.LINE_AA
                )

    # -------------------------------
    # SAVE OUTPUT
    # -------------------------------
    cv2.imwrite(output_path, img)
    print(f"✅ Grid image saved at: {output_path}")

    # -------------------------------
    # SHOW IMAGE
    # -------------------------------
    # cv2.imshow("Grid Image", img)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()

    return img


def generate_grid_overlay(
    image_path,
    output_path,
    rows=None,
    cols=None,
    color=(135, 128, 128),
    thickness=1,
    show_labels=True,
    font_scale=0.8,
):
    """
    Draw grid overlay and return generation metadata.
    """
    if not os.path.exists(image_path):
        raise ValueError(f"❌ Image not found: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("❌ Failed to load image")
    h, w = img.shape[:2]

    resolved_rows, resolved_cols = rows, cols
    if resolved_rows is None or resolved_cols is None:
        target_cell_w, target_cell_h = get_target_cell_size(w, h)
        resolved_rows, resolved_cols = calculate_optimal_grid(
            image_width=w,
            image_height=h,
            target_cell_width=target_cell_w,
            target_cell_height=target_cell_h,
        )

    draw_grid(
        image_path=image_path,
        rows=resolved_rows,
        cols=resolved_cols,
        color=color,
        thickness=thickness,
        show_labels=show_labels,
        font_scale=font_scale,
        output_path=output_path,
    )

    return {
        "rows": resolved_rows,
        "cols": resolved_cols,
        "image_width": w,
        "image_height": h,
    }


# -------------------------------
# RUN SCRIPT
# -------------------------------
if __name__ == "__main__":
    image_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/input/1preprocessed.png"
    output_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/output/1preprocessed.png"
    draw_grid(
        image_path=image_path,   # 🔁 change this
        rows=None,                # Auto-calculate from reference
        cols=None,                # Auto-calculate from reference
        color=(135, 128, 128),   # light gray
        thickness=1,
        show_labels=True,
        output_path=output_path
    )