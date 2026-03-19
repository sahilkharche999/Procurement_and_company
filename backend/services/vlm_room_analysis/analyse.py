"""
CAD FF&E Analyzer — Civil/Architectural Floor Plan Object Detection.

Reusable VLM service for room analysis pipeline.
"""

import json
import os
import re
import sys
from pathlib import Path

import google.generativeai as genai
from PIL import Image

# ─── Configuration ────────────────────────────────────────────────────────────

DEFAULT_MODEL = "gemini-3.1-pro-preview"
FALLBACK_API_KEY = "AIzaSyD-C2TLORhCwnMyA31EtNLtbUIkI1sGzDk"

# ─── Prompt ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are an expert architectural CAD drawing analyst specialising in FF&E 
(Furniture, Fixtures & Equipment) detection from floor plan drawings.

You will be given a floor plan image that has been overlaid with a coordinate 
grid. Each cell in the grid is labelled (row, col) — for example (0,0) is 
top-left, (1,2) is row 1 column 2, etc.

═══════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════
Identify every FF&E object drawn in the floor plan and return a structured 
JSON list describing each UNIQUE type/variant of object.

FF&E OBJECTS TO DETECT (include these):
  • Chair / seating (any style — round, square, office, lounge)
  • Table / desk / reception counter
  • Sofa / couch / bench
  • Bed / mattress
  • Wardrobe / cabinet / storage unit
  • Sink / basin
  • Toilet / WC
  • Bathtub / shower tray
  • Kitchen appliance (fridge, oven, hob)
  • Workstation / computer desk
  • Any other clearly identifiable furniture or equipment symbol

IGNORE COMPLETELY (do not mention):
  • Walls, partitions, and structural elements
  • Doors, windows, and their swing arcs
  • Dimension lines, leader lines, hatching
  • Text labels, room names, grid coordinates
  • North arrows, scale bars, title blocks
  • Any CAD annotation that is not a physical object

═══════════════════════════════════════════════
CODE LABELS IN THE DRAWING
═══════════════════════════════════════════════
The drawing may contain object-code labels (e.g. CH-112, TC-113, CH-113).
These are pill/bubble-shaped text annotations connected to the object by a 
leader line. When present, read the code and assign it to the correct object.
Multiple instances of the same code mean those objects are identical — group 
them together under one entry.

═══════════════════════════════════════════════
OUTPUT FORMAT  (strict JSON, nothing else)
═══════════════════════════════════════════════
Return ONLY a valid JSON array. No markdown, no explanation, no extra text.

[
  {
    "name": "<generic object type, lowercase>",
    "description": "<concise visual description of shape/style, e.g. 'squarish office chair'>",
    "code": "<CAD code label if present, else null>",
    "similar_objects_cell": [
      { "x": "<row index as string>", "y": "<col index as string>" },
      ...
    ]
  },
  ...
]


FIELD RULES:
• "name"  — use simple English: "chair", "table", "sofa", "sink", etc.
• "description" — describe the CAD symbol shape so a human can recognise it.
• "code"  — copy the alphanumeric code exactly as drawn (e.g. "CH-113").
             If no code label exists for this object, use null.
• "similar_objects_cell" — list ONE representative grid cell (x=row, y=col)
  per physical instance of this object. For large objects spanning multiple 
  cells, pick any single cell that clearly lies on the object.
  x = row number (0-based, top-down)
  y = column number (0-based, left-right)

GROUPING RULE:
Objects that share the same code label OR are visually identical symbols 
(same shape, same size) should be grouped into a SINGLE entry with multiple 
cells listed in "similar_objects_cell".

═══════════════════════════════════════════════
EXAMPLE OUTPUT (for reference only)
═══════════════════════════════════════════════
[
  {
    "name": "chair",
    "description": "small square chair symbol with rounded corners",
    "code": "CH-113",
    "similar_objects_cell": [
      { "x": "5", "y": "5" },
      { "x": "6", "y": "5" }
    ]
  },
  {
    "name": "table",
    "description": "L-shaped reception counter",
    "code": "TC-113",
    "similar_objects_cell": [
      { "x": "6", "y": "3" }
    ]
  },
  {
    "name": "chair",
    "description": "small square chair symbol with rounded corners",
    "code": "CH-112",
    "similar_objects_cell": [
      { "x": "5", "y": "2" }
    ]
  }
]

Remember: return ONLY the JSON array — no markdown fences, no preamble.
""".strip()

# ─── Core function ─────────────────────────────────────────────────────────────

def _resolve_api_key(api_key: str | None = None) -> str:
  resolved = api_key or os.getenv("GEMINI_API_KEY") or FALLBACK_API_KEY
  if not resolved:
    raise ValueError("GEMINI API key is missing. Set GEMINI_API_KEY or pass api_key.")
  return resolved


def analyze_floor_plan(
  image_path: str,
  api_key: str | None = None,
  model_name: str = DEFAULT_MODEL,
) -> list[dict]:
    """
    Send a grid-annotated floor plan image to Gemini and return
    a list of detected FF&E objects with their grid coordinates.
    """

    # 1. Configure Gemini
    genai.configure(api_key=_resolve_api_key(api_key))
    model = genai.GenerativeModel(model_name)

    # 2. Load image
    img_path = Path(image_path)
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    image = Image.open(img_path)
    print(f"[INFO] Loaded image: {img_path.name}  ({image.size[0]}×{image.size[1]} px)")

    # 3. Call the VLM
    print(f"[INFO] Sending to {model_name} …")
    response = model.generate_content(
        [SYSTEM_PROMPT, image],
        generation_config=genai.GenerationConfig(
            temperature=0.1,       # low temperature → more deterministic / accurate
            max_output_tokens=4096,
        ),
    )

    raw_text = response.text.strip()
    print("[INFO] Raw model response:\n", raw_text[:500], "…\n" if len(raw_text) > 500 else "\n")

    # 4. Parse JSON (strip any accidental markdown fences)
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    try:
        objects = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model did not return valid JSON.\nError: {e}\nRaw:\n{raw_text}") from e

    if not isinstance(objects, list):
      raise ValueError("Model response JSON must be an array of objects.")

    return objects


def analyze_floor_plan_to_file(
    image_path: str,
    output_json_path: str,
    api_key: str | None = None,
    model_name: str = DEFAULT_MODEL,
) -> list[dict]:
    """
    Analyze a grid image and persist detected FF&E objects JSON.
    """
    results = analyze_floor_plan(
        image_path=image_path,
        api_key=api_key,
        model_name=model_name,
    )

    out_path = Path(output_json_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[INFO] Results saved to: {out_path}")
    return results


# ─── CLI entry point ───────────────────────────────────────────────────────────

def main():
    image_path = "/Users/consultadd/Desktop/My project/procurement/Procurement_and_company/backend/MYEXP/output/1preprocessed.png"
    output_json_path = str(Path(image_path).with_suffix(".ffe.json"))

    try:
        results = analyze_floor_plan_to_file(
            image_path=image_path,
            output_json_path=output_json_path,
        )
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    # Pretty-print the result
    print("=" * 60)
    print("DETECTED FF&E OBJECTS")
    print("=" * 60)
    print(json.dumps(results, indent=2, ensure_ascii=False))

    print(f"\n[INFO] Results saved to: {output_json_path}")


if __name__ == "__main__":
    main()