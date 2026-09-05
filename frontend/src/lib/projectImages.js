/**
 * The images a project can show: extracted diagrams plus manually uploaded ones.
 *
 * Both lists have to be merged, not chosen between. `project.diagrams` is always
 * an array (the aggregation initialises it to `[]`), and an empty array is
 * truthy, so the old `project.diagrams || project.selected_diagram_metadata?.images`
 * always resolved to `diagrams` — the fallback was unreachable and uploaded
 * images never appeared anywhere.
 *
 * Uploads now create real diagram documents, so they arrive through `diagrams`.
 * The metadata list is still merged for images uploaded before that change.
 */
/**
 * What to call a drawing on screen.
 *
 * `display_name` is a cosmetic override; `filename` stays the identifier used
 * for selection keys, add/remove payloads and the backend's room-extraction
 * lookup, so it is never replaced — only hidden behind a friendlier label.
 */
export function drawingLabel(img) {
  const custom = String(img?.display_name || "").trim();
  if (custom) return custom;
  return img?.filename || "Untitled drawing";
}

export function getProjectImages(project) {
  const diagrams = Array.isArray(project?.diagrams) ? project.diagrams : [];
  const metaImages = Array.isArray(project?.selected_diagram_metadata?.images)
    ? project.selected_diagram_metadata.images
    : [];

  const seen = new Set(diagrams.map((d) => d?.filename).filter(Boolean));

  const legacyUploads = metaImages.filter((img) => {
    if (!img?.filename || seen.has(img.filename)) return false;
    // Entries that reference a diagram are represented by `diagrams` already;
    // anything left without one only exists in this metadata list.
    const hasDiagram = !!(img.id || img.diagram_id);
    return !hasDiagram || img.source === "uploaded";
  });

  return diagrams.concat(legacyUploads);
}
