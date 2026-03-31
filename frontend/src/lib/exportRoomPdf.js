import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildServerUrl } from "../config";

const PREFERRED_KEYS = [
  "_id",
  "spec_no",
  "name",
  "description",
  "group_id",
  "type",
  "room",
  "room_name",
  "page_no",
  "page_id",
  "qty",
  "user_entered_qty",
  "unit_id",
  "unit_name",
  "unit_cost",
  "extended",
  "vendor",
  "vendor_name",
  "created_by",
  "order_index",
  "hidden_from_total",
  "is_sub_item",
  "created_at",
  "updated_at",
];

const EXPORT_COLUMNS = [
  "spec_no",
  "name",
  "description",
  "room_name",
  "page_no",
  "qty",
  "user_entered_qty",
  "unit_name",
  "unit_cost",
  "extended",
];

function sanitizeFileName(value) {
  return String(value || "room")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

async function fetchJson(path, fallbackError) {
  const res = await fetch(buildServerUrl(path));
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data?.detail || fallbackError);
    } catch {
      throw new Error(fallbackError);
    }
  }
  return res.json();
}

function flattenPolygon(raw) {
  if (!Array.isArray(raw)) return [];
  const flat = raw.flat(Infinity).map(Number).filter((n) => Number.isFinite(n));
  const points = [];
  for (let i = 0; i < flat.length - 1; i += 2) {
    points.push([flat[i], flat[i + 1]]);
  }
  return points;
}

function getMaskPolygons(mask) {
  const polygons = Array.isArray(mask?.polygons) ? mask.polygons : [];
  return polygons.map(flattenPolygon).filter((pts) => pts.length >= 3);
}

function calculateBounds(points) {
  if (!points.length) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function calculateMaskBounds(maskPolygons) {
  const allPoints = maskPolygons.flat();
  return calculateBounds(allPoints);
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read room image blob."));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load room image.");
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

async function fetchRoomImageDataUrl(roomId, directImageUrl) {
  if (!roomId) return fetchImageAsDataUrl(directImageUrl);

  const proxyUrl = buildServerUrl(`/rooms/${roomId}/image`);
  try {
    return await fetchImageAsDataUrl(proxyUrl);
  } catch {
    if (directImageUrl) {
      return fetchImageAsDataUrl(directImageUrl);
    }
    throw new Error("Failed to load room image.");
  }
}

function toPdfPoint(x, y, frame) {
  const fx = frame.sourceWidth > 0 ? x / frame.sourceWidth : 0;
  const fy = frame.sourceHeight > 0 ? y / frame.sourceHeight : 0;
  return [frame.x + fx * frame.width, frame.y + fy * frame.height];
}

function drawPolygon(doc, points, frame) {
  if (!points.length) return;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const [x1, y1] = toPdfPoint(current[0], current[1], frame);
    const [x2, y2] = toPdfPoint(next[0], next[1], frame);
    doc.line(x1, y1, x2, y2);
  }
}

function drawEditorStyleOverlays(doc, editorState, frame) {
  const masks = Array.isArray(editorState?.masks) ? editorState.masks : [];
  const groups = editorState?.groups || {};

  for (const mask of masks) {
    const maskPolygons = getMaskPolygons(mask);
    if (!maskPolygons.length) continue;

    const group = groups[String(mask.group_id)] || {};
    const groupCode = String(group.code || group.name || "N/A").slice(0, 36);
    const colorArray = Array.isArray(group.color) ? group.color : [59, 130, 246];
    const r = Number(colorArray[0] ?? 59);
    const g = Number(colorArray[1] ?? 130);
    const b = Number(colorArray[2] ?? 246);

    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.4);

    const isLabelMask = String(mask?.type || "").toLowerCase() === "label";
    const bounds = calculateMaskBounds(maskPolygons);

    if (isLabelMask && bounds) {
      const horizontalPadding = 14;
      const verticalPadding = 8;
      const estimatedTextWidth = Math.max(42, groupCode.length * 11);

      const tagWidth = Math.max(
        bounds.width + horizontalPadding * 2,
        estimatedTextWidth + horizontalPadding,
      );
      const tagHeight = Math.max(bounds.height + verticalPadding * 2, 32);
      const tagX = bounds.x + bounds.width / 2 - tagWidth / 2;
      const tagY = bounds.y + bounds.height / 2 - tagHeight / 2;

      const [pdfX, pdfY] = toPdfPoint(tagX, tagY, frame);
      const [pdfX2, pdfY2] = toPdfPoint(tagX + tagWidth, tagY + tagHeight, frame);
      const pdfW = Math.max(18, pdfX2 - pdfX);
      const pdfH = Math.max(12, pdfY2 - pdfY);
      const radius = Math.min(pdfH / 2, 10);

      doc.setFillColor(r, g, b);
      doc.roundedRect(pdfX, pdfY, pdfW, pdfH, radius, radius, "FD");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(Math.max(8, Math.min(13, pdfH * 0.58)));
      doc.text(groupCode, pdfX + pdfW / 2, pdfY + pdfH / 2 + 3, {
        align: "center",
      });
    } else {
      maskPolygons.forEach((poly) => drawPolygon(doc, poly, frame));

      if (bounds) {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const [pdfCX, pdfCY] = toPdfPoint(centerX, centerY, frame);
        doc.setFillColor(255, 255, 255);
        doc.circle(pdfCX, pdfCY, 10, "F");
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(groupCode.slice(0, 12), pdfCX, pdfCY + 3, { align: "center" });
      }
    }
  }
}

function formatCellValue(value, key) {
  if (value === null || value === undefined) return "";
  if (key === "unit_cost" || key === "extended") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : String(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function buildTableData(items) {
  const body = [];
  const rowKinds = [];

  for (const item of items) {
    body.push(
      EXPORT_COLUMNS.map((key) => formatCellValue(item?.[key], key)),
    );
    rowKinds.push("item");

    const subitems = Array.isArray(item?.subitems) ? item.subitems : [];
    for (const sub of subitems) {
      body.push(
        EXPORT_COLUMNS.map((key) => {
          const value = formatCellValue(sub?.[key], key);
          if (key === "name") return `↳ ${value || "Sub Item"}`;
          return value;
        }),
      );
      rowKinds.push("sub");
    }
  }

  return { columns: EXPORT_COLUMNS, body, rowKinds };
}

export async function exportRoomDetailsPdf({ projectId, room }) {
  const roomId = room?.id || room?._id;
  if (!projectId || !roomId) {
    throw new Error("Project ID or Room ID is missing.");
  }

  const roomName = room?.name || `Room_${roomId}`;

  const [budgetPayload, roomPayload] = await Promise.all([
    fetchJson(
      `/budget/${projectId}/rooms/${roomId}/items`,
      "Failed to fetch room budget items.",
    ),
    fetchJson(`/rooms/${roomId}`, "Failed to fetch room details."),
  ]);

  let editorState = { masks: [], groups: {} };
  try {
    editorState = await fetchJson(
      `/projects/${projectId}/rooms/${roomId}/editor-state`,
      "Failed to fetch room editor state.",
    );
  } catch {
    editorState = { masks: [], groups: {} };
  }

  const roomImagePath = room?.url || roomPayload?.room_image_url || roomPayload?.url || "";
  const roomImageUrl = roomImagePath ? buildServerUrl(roomImagePath) : "";
  const roomImageDataUrl = await fetchRoomImageDataUrl(roomId, roomImageUrl).catch(
    () => null,
  );

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 24;

  doc.setFontSize(16);
  doc.text(`Room Export: ${roomName}`, margin, 28);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Room ID: ${roomId}`, margin, 45);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 60);

  let currentY = 76;

  if (roomImageDataUrl) {
    const props = doc.getImageProperties(roomImageDataUrl);
    const maxW = pageW - margin * 2;
    const maxH = 280;
    const ratio = Math.min(maxW / props.width, maxH / props.height);
    const drawW = props.width * ratio;
    const drawH = props.height * ratio;
    const x = margin + (maxW - drawW) / 2;

    doc.addImage(roomImageDataUrl, "PNG", x, currentY, drawW, drawH, undefined, "FAST");

    const sourceWidth = Number(editorState?.image_width) || Number(props.width) || 1;
    const sourceHeight = Number(editorState?.image_height) || Number(props.height) || 1;
    drawEditorStyleOverlays(doc, editorState, {
      x,
      y: currentY,
      width: drawW,
      height: drawH,
      sourceWidth,
      sourceHeight,
    });

    currentY += drawH + 16;
  } else {
    doc.setTextColor(180, 30, 30);
    doc.setFontSize(10);
    doc.text("Room image could not be loaded for this export.", margin, currentY + 14);
    currentY += 24;
  }

  doc.setTextColor(20);
  doc.setFontSize(12);
  doc.text("Budget Items", margin, currentY);
  currentY += 6;

  const items = Array.isArray(budgetPayload?.items) ? budgetPayload.items : [];
  const { columns, body, rowKinds } = buildTableData(items);

  autoTable(doc, {
    startY: currentY,
    head: [columns],
    body: body.length
      ? body
      : [["", "No budget items found for this room.", "", "", "", "", "", "", "", ""]],
    styles: { fontSize: 6.5, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    theme: "grid",
    margin: { left: margin, right: margin },
    horizontalPageBreak: true,
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const kind = rowKinds[data.row.index];
      if (kind === "sub") {
        data.cell.styles.fillColor = [247, 248, 252];
        data.cell.styles.textColor = [60, 60, 60];
      } else {
        data.cell.styles.textColor = [25, 25, 25];
      }
      if (data.column.index === 1 && kind === "item") {
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      const footer = `Room: ${roomName}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(footer, margin, doc.internal.pageSize.getHeight() - 12);
    },
  });

  doc.save(`${sanitizeFileName(roomName)}_room_export.pdf`);
}
