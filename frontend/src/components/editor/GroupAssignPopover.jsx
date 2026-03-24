import { useState, useEffect, useLayoutEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const POP_W = 280;
const POP_H = 340; // approx max height
const OFFSET = 10; // distance from cursor

export default function GroupAssignPopover({
  position, // { x, y } — raw cursor coords
  groups, // groups map { [id]: group }
  selectedCount, // number of masks being reassigned
  onAssign, // (groupId) => void
  onClose, // () => void
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [popStyle, setPopStyle] = useState({ opacity: 0 }); // hidden until positioned
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
  });

  // ── Smart viewport-aware positioning ──────────────────────────────────────
  useLayoutEffect(() => {
    let left = position.x + OFFSET;
    let top = position.y + OFFSET;

    if (left + POP_W > window.innerWidth - 8)
      left = position.x - POP_W - OFFSET;
    if (top + POP_H > window.innerHeight - 8) top = position.y - POP_H - OFFSET;

    setPopStyle({ position: "fixed", left, top, zIndex: 9999, opacity: 1 });
  }, [position]);

  // ── Draggable popover ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      const nextLeft = dragRef.current.originLeft + (e.clientX - dragRef.current.startX);
      const nextTop = dragRef.current.originTop + (e.clientY - dragRef.current.startY);

      const clampedLeft = Math.min(
        Math.max(8, nextLeft),
        window.innerWidth - POP_W - 8,
      );
      const clampedTop = Math.min(
        Math.max(8, nextTop),
        window.innerHeight - POP_H - 8,
      );

      setPopStyle((prev) => ({
        ...prev,
        left: clampedLeft,
        top: clampedTop,
      }));
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  const startDrag = (e) => {
    if (e.button !== 0) return;

    e.preventDefault();
    const currentLeft = Number(popStyle.left) || 0;
    const currentTop = Number(popStyle.top) || 0;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: currentLeft,
      originTop: currentTop,
    };
    setIsDragging(true);
  };

  // ── Auto-focus search on mount ────────────────────────────────────────────
  useEffect(() => {
    // Small delay so the popover is visible before focusing
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Dismiss on outside click or Escape ───────────────────────────────────
  useEffect(() => {
    const onMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // ── Filtered group list ───────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();
  const filteredGroups = q
    ? Object.values(groups).filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.code && g.code.toLowerCase().includes(q)),
      )
    : Object.values(groups);

  // ── Highlight matching text ───────────────────────────────────────────────
  const highlight = (text) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div
      ref={wrapperRef}
      style={popStyle}
      className="w-70 border border-slate-300 bg-slate-100 shadow-2xl shadow-black/20 font-sans select-none transition-opacity duration-75"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        className={`px-3 py-2.5 border-b border-slate-300 bg-slate-50 flex items-center justify-between ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div>
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.14em]">
            Assign to Group
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {selectedCount} mask{selectedCount !== 1 ? "s" : ""} selected
          </p>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
          title="Close (Esc)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="px-2 pt-2 pb-2 border-b border-slate-300">
        <div className="flex items-center gap-2 border border-slate-300 bg-white px-2.5 py-2 focus-within:border-blue-400 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5 text-slate-400 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or code..."
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Group list ───────────────────────────────────────────────────────── */}
      <div className="max-h-60 overflow-y-auto overscroll-contain">
        {filteredGroups.length === 0 ? (
          <div className="py-5 text-center text-sm text-slate-500">
            No groups match &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => onAssign(g.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-slate-200 last:border-none group"
            >
              {/* Colour swatch */}
              <span
                className="inline-block w-4 h-4 shrink-0 ring-1 ring-black/10"
                style={{
                  backgroundColor: g.color
                    ? `rgb(${g.color[0]},${g.color[1]},${g.color[2]})`
                    : "#ccc",
                }}
              />
              {/* Name + code */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-base text-slate-800 group-hover:text-blue-700 truncate leading-tight transition-colors">
                  {highlight(g.name)}
                </span>
                {g.code && (
                  <span className="text-sm text-slate-500 truncate">
                    {highlight(g.code)}
                  </span>
                )}
              </div>
              {/* Arrow hint on hover */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
              >
                <path
                  fillRule="evenodd"
                  d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ))
        )}
      </div>

      {/* ── Footer hint ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-slate-300 bg-slate-50">
        <p className="text-[11px] text-slate-500">
          Press{" "}
          <kbd className="font-mono bg-slate-200 px-1 py-0.5 text-slate-600 border border-slate-300">
            Esc
          </kbd>{" "}
          to cancel
        </p>
      </div>
    </div>
  );
}
