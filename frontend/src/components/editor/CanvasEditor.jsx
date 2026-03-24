import {
  Stage,
  Layer,
  Line,
  Image as KonvaImage,
  Rect,
  Circle,
  Group,
  Transformer,
  Text,
} from "react-konva";
import { useState, useRef, useEffect } from "react";
import useImage from "use-image";
// import defaultFloorImage from "../../data/floorplan.png";

// Helper function to calculate bounding box of a polygon
const calculatePolygonBounds = (polygon) => {
  if (!polygon || polygon.length === 0) {
    return null;
  }
  const flatPoints = Array.isArray(polygon[0]) ? polygon.flat() : polygon;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (let i = 0; i < flatPoints.length; i += 2) {
    minX = Math.min(minX, flatPoints[i]);
    maxX = Math.max(maxX, flatPoints[i]);
    minY = Math.min(minY, flatPoints[i + 1]);
    maxY = Math.max(maxY, flatPoints[i + 1]);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// Helper function to calculate bounding box of all polygons in a mask
const calculateMaskBounds = (mask) => {
  if (!mask.polygons || mask.polygons.length === 0) {
    return null;
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  mask.polygons.forEach((polygon) => {
    const bounds = calculatePolygonBounds(polygon);
    if (bounds) {
      minX = Math.min(minX, bounds.x);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      minY = Math.min(minY, bounds.y);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
  });

  if (minX === Infinity) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export default function CanvasEditor({
  groups,
  masks,
  selectedMaskIds,
  setSelectedMaskIds,
  selectedGroupId,
  setSelectedGroupId,
  editorMode,
  changeGroupMode, // boolean — reassign mode is active
  toggleMaskSelection, // (id, isShift) => void
  setContextMenu,
  onCtrlClickMask, // (maskId, { x, y }) => void — Ctrl+Click in reassign mode
  isDrawMode,
  isLabelDrawMode,
  onSaveNewMask, // (polygonArray) => void
  onCreateLabelMask, // (polygonArray) => void
  onUpdateMaskPosition, // (maskId, dx, dy) => void
  onUpdateMaskPolygons, // (maskId, newPolygons) => void
  bgImageUrl,
}) {
  const [image] = useImage(bgImageUrl);
  const stageRef = useRef(null);
  const trRef = useRef(null);
  const maskRefs = useRef({});

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // ── Shift-drag selection box ───────────────────────────────────────────────
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const selectionStartRef = useRef(null);

  // ── Drawing state ────────────────────────────────────────────────────────
  const [currentPolygon, setCurrentPolygon] = useState([]); // Array of {x, y, isCurve}
  const [mousePos, setMousePos] = useState(null);

  useEffect(() => {
    if (trRef.current) {
      if (changeGroupMode || isDrawMode || isLabelDrawMode) {
        trRef.current.nodes([]);
      } else {
        const nodes = (selectedMaskIds || [])
          .map((id) => maskRefs.current[id])
          .filter(Boolean);
        trRef.current.nodes(nodes);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedMaskIds, masks, changeGroupMode, isDrawMode, isLabelDrawMode]);

  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    if (isDrawMode || isLabelDrawMode) {
      container.style.cursor = "crosshair";
      return;
    }
    container.style.cursor = "default";
  }, [isDrawMode, isLabelDrawMode]);

  useEffect(() => {
    if (!isDrawMode) {
      setCurrentPolygon([]);
      setMousePos(null);
    }
  }, [isDrawMode]);

  useEffect(() => {
    if (!isDrawMode) return;
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        if (currentPolygon.length >= 3) {
          const flatPoints = generateSmoothPolygon([...currentPolygon], true);
          onSaveNewMask([flatPoints]);
        }
        setCurrentPolygon([]);
        setMousePos(null);
      } else if (e.key === "Escape") {
        setCurrentPolygon([]);
        setMousePos(null);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        setCurrentPolygon((prev) =>
          prev.length >= 1 ? prev.slice(0, -1) : prev,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawMode, currentPolygon, onSaveNewMask]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    const oldScale = scale;
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.08 : oldScale * 1.08;
    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // ── Shift-drag mouse handlers ─────────────────────────────────────────────
  const handleMouseDown = (e) => {
    if (isLabelDrawMode) return;

    if (e.evt.shiftKey) {
      // In reassign mode: Shift+Click on a MASK should toggle selection (handled
      // by the Line's onClick). Only start a drag-selection box when clicking the
      // background (stage itself). Without this guard, isSelecting gets set to
      // true before the click event fires, blocking handleMaskClick.
      const isBackgroundClick = e.target === e.target.getStage();
      if (changeGroupMode && editorMode === "group" && !isBackgroundClick) {
        return; // Let the Line's onClick handle this Shift+Click
      }

      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();
      selectionStartRef.current = pos;
      setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    if (isDrawMode && currentPolygon.length > 0) {
      setMousePos({ x: pos.x, y: pos.y });
    }

    if (!isSelecting) return;
    e.evt.preventDefault();
    const start = selectionStartRef.current;
    setSelectionBox({
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      width: Math.abs(pos.x - start.x),
      height: Math.abs(pos.y - start.y),
    });
  };

  const handleMouseUp = (e) => {
    if (!isSelecting) return;

    if (selectionBox) {
      const box = selectionBox;
      const selectedIds = [];

      masks.forEach((mask) => {
        if (!mask.polygons) return;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        mask.polygons.forEach((polygon) => {
          polygon.flat().forEach((v, i) => {
            if (i % 2 === 0) {
              minX = Math.min(minX, v);
              maxX = Math.max(maxX, v);
            } else {
              minY = Math.min(minY, v);
              maxY = Math.max(maxY, v);
            }
          });
        });
        const maskBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
        if (
          maskBox.x >= box.x &&
          maskBox.x + maskBox.width <= box.x + box.width &&
          maskBox.y >= box.y &&
          maskBox.y + maskBox.height <= box.y + box.height
        ) {
          selectedIds.push(mask.id);
        }
      });

      if (setSelectedMaskIds) setSelectedMaskIds(selectedIds);
    }

    setSelectionBox(null);
    setIsSelecting(false);
  };

  // ── Per-mask click handler ────────────────────────────────────────────────
  const handleMaskClick = (e, mask) => {
    if (isLabelDrawMode) {
      e.cancelBubble = true;
      return;
    }

    if (isSelecting) return; // drag-select in progress, ignore clicks

    const isShift = e.evt.shiftKey;
    const isCtrl = e.evt.ctrlKey || e.evt.metaKey;

    if (changeGroupMode && editorMode === "group") {
      // ────────────────────────────────────────────────────────────────────
      // REASSIGN MODE
      // Ctrl+Click → add to selection (if needed) then show group popover
      // Shift+Click → toggle in/out of multi-selection
      // Plain click → deselect all, select only this mask
      // ────────────────────────────────────────────────────────────────────
      if (isCtrl) {
        onCtrlClickMask?.(mask.id, { x: e.evt.clientX, y: e.evt.clientY });
      } else {
        toggleMaskSelection(mask.id, isShift);
      }
    } else {
      // ────────────────────────────────────────────────────────────────────
      // NORMAL MODE — existing behaviour
      // ────────────────────────────────────────────────────────────────────
      toggleMaskSelection?.(mask.id, isShift);
      if (editorMode === "group" && setSelectedGroupId) {
        setSelectedGroupId(mask.group_id);
      }
    }
  };

  // ── Canvas opacity logic ──────────────────────────────────────────────────
  const getMaskOpacity = (mask) => {
    const isActiveGroup = mask.group_id === selectedGroupId;

    if (editorMode !== "group") return 0.4; // show-all mode

    if (changeGroupMode) {
      // In reassign mode: raise opacity of all masks so users can see / click them.
      // Active group stays brighter; others visible but dimmed.
      return isActiveGroup ? 0.65 : 0.3;
    }

    // Normal group mode
    if (!selectedGroupId) return 0.2;
    return isActiveGroup ? 0.7 : 0.05;
  };

  // ── Stroke colour for selected masks ─────────────────────────────────────
  const getMaskStroke = (isSelected) => {
    if (!isSelected) return "black";
    // Amber in reassign mode to visually distinguish from normal selection
    return changeGroupMode ? "#f97316" : "red";
  };

  // Compute Cubic Bezier handles for curve nodes
  const computeHandles = (rawNodes, close = false) => {
    const numParams = rawNodes.length;
    if (numParams === 0) return [];

    const getPrev = (i) =>
      close
        ? rawNodes[(i - 1 + numParams) % numParams]
        : rawNodes[Math.max(i - 1, 0)];
    const getNext = (i) =>
      close
        ? rawNodes[(i + 1) % numParams]
        : rawNodes[Math.min(i + 1, numParams - 1)];

    return rawNodes.map((n, i) => {
      if (!n.isCurve) {
        return {
          ...n,
          handleIn: { x: n.x, y: n.y },
          handleOut: { x: n.x, y: n.y },
        };
      }

      const prev = getPrev(i);
      const next = getNext(i);

      let vx = next.x - prev.x;
      let vy = next.y - prev.y;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;

      vx /= len;
      vy /= len;

      const tension = 0.3; // Magic number for nice smooth curves
      const dPrev = Math.sqrt(
        Math.pow(n.x - prev.x, 2) + Math.pow(n.y - prev.y, 2),
      );
      const dNext = Math.sqrt(
        Math.pow(next.x - n.x, 2) + Math.pow(next.y - n.y, 2),
      );

      return {
        ...n,
        handleIn: {
          x: n.x - vx * dPrev * tension,
          y: n.y - vy * dPrev * tension,
        },
        handleOut: {
          x: n.x + vx * dNext * tension,
          y: n.y + vy * dNext * tension,
        },
      };
    });
  };

  const generateSmoothPolygon = (rawNodes, close = false) => {
    if (rawNodes.length === 0) return [];
    if (rawNodes.length === 1) return [rawNodes[0].x, rawNodes[0].y];

    const computedNodes = computeHandles(rawNodes, close);
    const numParams = computedNodes.length;

    const out = [];
    out.push(computedNodes[0].x, computedNodes[0].y);

    const numSegments = close ? numParams : numParams - 1;
    for (let i = 0; i < numSegments; i++) {
      const p1 = computedNodes[i];
      const p2 = computedNodes[(i + 1) % numParams];

      if (!p1.isCurve && !p2.isCurve) {
        // Straight line
        out.push(p2.x, p2.y);
      } else {
        // Cubic Bezier Segment
        const cp1 = p1.isCurve ? p1.handleOut : { x: p1.x, y: p1.y };
        const cp2 = p2.isCurve ? p2.handleIn : { x: p2.x, y: p2.y };

        const segmentSteps = 20;
        for (let t = 1; t <= segmentSteps; t++) {
          const u = t / segmentSteps;
          const invU = 1 - u;
          const b0 = invU * invU * invU;
          const b1 = 3 * invU * invU * u;
          const b2 = 3 * invU * u * u;
          const b3 = u * u * u;

          const x = b0 * p1.x + b1 * cp1.x + b2 * cp2.x + b3 * p2.x;
          const y = b0 * p1.y + b1 * cp1.y + b2 * cp2.y + b3 * p2.y;
          out.push(x, y);
        }
      }
    }
    return out;
  };

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth - 300}
      height={window.innerHeight}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      draggable={!isSelecting && !isDrawMode && !isLabelDrawMode}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragStart={(e) => {
        if (isSelecting) e.target.stopDrag();
      }}
      onDragMove={(e) => {
        if (
          !isSelecting &&
          !isDrawMode &&
          !isLabelDrawMode &&
          e.target === e.target.getStage()
        ) {
          setPosition({ x: e.target.x(), y: e.target.y() });
        }
      }}
      onWheel={handleWheel}
      // Background click → drawing action or deselect
      onClick={(e) => {
        if (isDrawMode) {
          if (e.evt.button === 0) {
            const pos = e.target.getStage().getRelativePointerPosition();
            setCurrentPolygon((prev) => [
              ...prev,
              { x: pos.x, y: pos.y, isCurve: false },
            ]);
          }
          return;
        }

        if (isLabelDrawMode) {
          if (e.evt.button !== 0) return;
          const pos = e.target.getStage().getRelativePointerPosition();
          const labelSize = 20;
          const half = labelSize / 2;
          const polygon = [
            pos.x - half,
            pos.y - half,
            pos.x + half,
            pos.y - half,
            pos.x + half,
            pos.y + half,
            pos.x - half,
            pos.y + half,
            pos.x - half,
            pos.y - half,
          ];
          onCreateLabelMask?.([polygon]);
          return;
        }

        // Deselect masks when clicking on empty stage area
        if (e.target === e.target.getStage()) {
          setSelectedMaskIds?.([]);
        }
      }}
      onContextMenu={(e) => {
        if (isLabelDrawMode) {
          e.evt.preventDefault();
          return;
        }

        if (isDrawMode) {
          e.evt.preventDefault();
          const pos = e.target.getStage().getRelativePointerPosition();
          setCurrentPolygon((prev) => [
            ...prev,
            { x: pos.x, y: pos.y, isCurve: true },
          ]);
          return;
        }

        e.evt.preventDefault();
        if (selectedMaskIds?.length > 0) {
          setContextMenu({ x: e.evt.clientX, y: e.evt.clientY });
        }
      }}
    >
      {/* Floor plan image */}
      <Layer>{image && <KonvaImage image={image} />}</Layer>

      {/* Masks */}
      <Layer>
        {masks.map((mask) => {
          const isSelected = selectedMaskIds?.includes(mask.id) ?? false;
          const opacity = getMaskOpacity(mask);
          const groupData = groups?.[mask.group_id] ?? null;
          const fillColor = groupData
            ? `rgba(${groupData.color[0]},${groupData.color[1]},${groupData.color[2]},${opacity})`
            : `rgba(200,200,200,${opacity})`;
          const strokeColor = getMaskStroke(isSelected);
          const strokeWidth = isSelected ? 3 : 1;
          const bounds = calculateMaskBounds(mask);
          if (!bounds) return null;

          // Only render as label pill if type === 'label', otherwise as polygon
          const isLabelMask = mask.type === "label";

          if (isLabelMask) {
            // Render as pill-shaped tag with group code
            const groupCode = String(groupData?.code || "N/A");
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
            const tagCornerRadius = tagHeight / 2;

            return (
              <Group
                key={`mask-group-${mask.id}`}
                name={`mask-group-${mask.id}`}
                ref={(node) => {
                  maskRefs.current[mask.id] = node;
                }}
                draggable={
                  isSelected &&
                  !isDrawMode &&
                  !isLabelDrawMode &&
                  !changeGroupMode
                }
                onClick={(e) => handleMaskClick(e, mask)}
                onDragEnd={(e) => {
                  const node = maskRefs.current[mask.id];
                  if (!node) return;
                  const dx = node.x();
                  const dy = node.y();
                  node.x(0);
                  node.y(0);
                  if (onUpdateMaskPosition) {
                    onUpdateMaskPosition(mask.id, dx, dy);
                  }
                }}
                onTransformEnd={(e) => {
                  const node = maskRefs.current[mask.id];
                  if (!node) return;
                  const transform = node.getTransform();
                  const newPolygons = mask.polygons.map((poly) => {
                    const flatPoly = poly.flat();
                    const res = [];
                    for (let i = 0; i < flatPoly.length; i += 2) {
                      const pt = { x: flatPoly[i], y: flatPoly[i + 1] };
                      const newPt = transform.point(pt);
                      res.push(newPt.x, newPt.y);
                    }
                    return res;
                  });

                  node.x(0);
                  node.y(0);
                  node.scaleX(1);
                  node.scaleY(1);
                  node.rotation(0);
                  node.skewX(0);
                  node.skewY(0);

                  if (onUpdateMaskPolygons) {
                    onUpdateMaskPolygons(mask.id, newPolygons);
                  }
                }}
                onMouseEnter={(e) => {
                  if (isSelected && !isDrawMode && !changeGroupMode) {
                    const container = e.target.getStage().container();
                    container.style.cursor = "move";
                  }
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage().container();
                  container.style.cursor = "default";
                }}
              >
                <Rect
                  x={tagX}
                  y={tagY}
                  width={tagWidth}
                  height={tagHeight}
                  cornerRadius={tagCornerRadius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  listening={!isDrawMode && !isLabelDrawMode}
                />

                <Text
                  x={tagX}
                  y={tagY}
                  width={tagWidth}
                  height={tagHeight}
                  text={groupCode}
                  fontSize={18}
                  fontFamily="Arial"
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  fill="#111827"
                  listening={false}
                />
              </Group>
            );
          } else {
            // Render custom masks as polygon outlines
            return (
              <Group
                key={`mask-group-${mask.id}`}
                name={`mask-group-${mask.id}`}
                ref={(node) => {
                  maskRefs.current[mask.id] = node;
                }}
                draggable={
                  isSelected &&
                  !isDrawMode &&
                  !isLabelDrawMode &&
                  !changeGroupMode
                }
                onClick={(e) => handleMaskClick(e, mask)}
                onDragEnd={(e) => {
                  const node = maskRefs.current[mask.id];
                  if (!node) return;
                  const dx = node.x();
                  const dy = node.y();
                  node.x(0);
                  node.y(0);
                  if (onUpdateMaskPosition) {
                    onUpdateMaskPosition(mask.id, dx, dy);
                  }
                }}
                onTransformEnd={(e) => {
                  const node = maskRefs.current[mask.id];
                  if (!node) return;
                  const transform = node.getTransform();
                  const newPolygons = mask.polygons.map((poly) => {
                    const flatPoly = poly.flat();
                    const res = [];
                    for (let i = 0; i < flatPoly.length; i += 2) {
                      const pt = { x: flatPoly[i], y: flatPoly[i + 1] };
                      const newPt = transform.point(pt);
                      res.push(newPt.x, newPt.y);
                    }
                    return res;
                  });

                  node.x(0);
                  node.y(0);
                  node.scaleX(1);
                  node.scaleY(1);
                  node.rotation(0);
                  node.skewX(0);
                  node.skewY(0);

                  if (onUpdateMaskPolygons) {
                    onUpdateMaskPolygons(mask.id, newPolygons);
                  }
                }}
                onMouseEnter={(e) => {
                  if (isSelected && !isDrawMode && !changeGroupMode) {
                    const container = e.target.getStage().container();
                    container.style.cursor = "move";
                  }
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage().container();
                  container.style.cursor = "default";
                }}
              >
                {mask.polygons.map((polygon, polyIndex) => (
                  <Line
                    key={`polygon-${polyIndex}`}
                    points={polygon.flat()}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    closed
                    listening={!isDrawMode && !isLabelDrawMode}
                  />
                ))}

                {/* Group code label for custom masks */}
                <Text
                  x={bounds.x + bounds.width / 2}
                  y={bounds.y + bounds.height / 2}
                  text={String(groupData?.code || "N/A")}
                  fontSize={18}
                  fontFamily="Arial"
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  fill="#111827"
                  listening={false}
                  offsetX={bounds.width / 4}
                  offsetY={10}
                />
              </Group>
            );
          }
        })}

        {/* Shift-drag selection rectangle */}
        {selectionBox && (
          <Rect
            x={selectionBox.x}
            y={selectionBox.y}
            width={selectionBox.width}
            height={selectionBox.height}
            fill="rgba(0,161,255,0.15)"
            stroke="#3b82f6"
            strokeWidth={1 / scale}
            listening={false}
          />
        )}

        {/* Transformer (bounding box + rotation handles) */}
        {!isDrawMode && !isLabelDrawMode && !changeGroupMode && (
          <Transformer
            ref={trRef}
            flipEnabled={false}
            borderDash={[5, 5]}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </Layer>

      {/* Drawing Layer */}
      {isDrawMode && (
        <Layer>
          {currentPolygon.length > 0 && (
            <Line
              points={generateSmoothPolygon(
                mousePos
                  ? [
                      ...currentPolygon,
                      { x: mousePos.x, y: mousePos.y, isCurve: false },
                    ]
                  : currentPolygon,
                false,
              )}
              stroke="#10b981"
              strokeWidth={3 / scale}
              closed={false}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {currentPolygon.map((p, i) => (
            <Circle
              key={i}
              x={p.x}
              y={p.y}
              radius={4 / scale}
              fill={p.isCurve ? "#f59e0b" : "#3b82f6"} // Amber for curve, blue for straight
              hitStrokeWidth={0}
            />
          ))}

          {isDrawMode &&
            (() => {
              const previewNodes = mousePos
                ? [
                    ...currentPolygon,
                    { x: mousePos.x, y: mousePos.y, isCurve: false },
                  ]
                : currentPolygon;
              const computedNodes = computeHandles(previewNodes, false);
              return computedNodes.flatMap((p, i) => {
                if (!p.isCurve) return [];
                const items = [];
                if (p.handleIn) {
                  items.push(
                    <Line
                      key={`hL1-${i}`}
                      points={[p.x, p.y, p.handleIn.x, p.handleIn.y]}
                      stroke="#f59e0b"
                      strokeWidth={1 / scale}
                      dash={[4 / scale, 4 / scale]}
                      opacity={0.5}
                    />,
                  );
                  items.push(
                    <Circle
                      key={`hC1-${i}`}
                      x={p.handleIn.x}
                      y={p.handleIn.y}
                      radius={2.5 / scale}
                      fill="#f59e0b"
                      opacity={0.5}
                    />,
                  );
                }
                if (p.handleOut) {
                  items.push(
                    <Line
                      key={`hL2-${i}`}
                      points={[p.x, p.y, p.handleOut.x, p.handleOut.y]}
                      stroke="#f59e0b"
                      strokeWidth={1 / scale}
                      dash={[4 / scale, 4 / scale]}
                      opacity={0.5}
                    />,
                  );
                  items.push(
                    <Circle
                      key={`hC2-${i}`}
                      x={p.handleOut.x}
                      y={p.handleOut.y}
                      radius={2.5 / scale}
                      fill="#f59e0b"
                      opacity={0.5}
                    />,
                  );
                }
                return items;
              });
            })()}
        </Layer>
      )}
    </Stage>
  );
}
