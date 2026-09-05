import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useProjects } from "../../redux/hooks/project/useProjects";
import { Button } from "../../components/ui/button";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  ZoomIn,
  ChevronDown,
  Upload,
  Loader2,
  Images,
  Plus,
  Minus,
  Check,
  CheckSquare,
  Square,
  Download,
  Files,
  MoreHorizontal,
} from "lucide-react";
import { buildServerUrl } from "../../config";
import { ProjectDrawings } from "../../components/project/ProjectDrawings";
import { getProjectImages } from "../../lib/projectImages";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";

/* ══════════════════════════════════════════════════════════════════════════
   LIGHTBOX — full-screen image viewer, opened on double-click
══════════════════════════════════════════════════════════════════════════ */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const img = images[idx];
  const url = buildServerUrl(img.url);
  const hasPrev = idx > 0;
  const hasNext = idx < images.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setIdx((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono bg-white/10 rounded-full px-3 py-1">
        {idx + 1} / {images.length}
      </div>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={() => setIdx((i) => i - 1)}
          className="absolute left-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[86vh] flex flex-col items-center gap-3">
        <img
          key={url}
          src={url}
          alt={img.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs font-mono bg-white/[0.08] rounded-full px-3 py-1">
            {img.label || img.filename}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Open original
          </a>
        </div>
      </div>

      {/* Next */}
      {hasNext && (
        <button
          onClick={() => setIdx((i) => i + 1)}
          className="absolute right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DRAWING CARD — one extracted drawing
   • single-click  → select (for bulk actions)
   • double-click  → open lightbox
   • hover button  → add/remove this one immediately

   Selection is always neutral violet. It used to be green when adding and red
   when removing, so the same checkbox meant opposite things depending on which
   sub-tab you were in. The state now lives in a badge and the action in a verb.
══════════════════════════════════════════════════════════════════════════ */
function ThumbCard({
  img,
  inProject,
  checked,
  busy,
  onToggle,
  onQuickAction,
  onDoubleClick,
}) {
  const [err, setErr] = useState(false);
  const url = buildServerUrl(img.url);

  return (
    <div
      onClick={onToggle}
      onDoubleClick={(e) => {
        e.preventDefault();
        onDoubleClick?.();
      }}
      title={`${img.filename}\n(double-click to view full size)`}
      className={`relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 border-2 select-none flex flex-col
                ${
                  checked
                    ? "border-violet-500 shadow-lg shadow-violet-500/20 ring-2 ring-violet-500/30"
                    : inProject
                      ? "border-emerald-500/40 hover:border-emerald-500/70 hover:shadow-md"
                      : "border-border hover:border-violet-400/60 hover:shadow-md"
                }`}
    >
      {/* Image area */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden relative">
        {err ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <ImageOff className="h-8 w-8" />
            <span className="text-[10px]">Not found</span>
          </div>
        ) : (
          <img
            src={url}
            alt={img.filename}
            className="object-contain w-full h-full p-1 transition-transform duration-200 group-hover:scale-105"
            onError={() => setErr(true)}
          />
        )}

        {/* Double-click hint — inside image so it doesn't push layout */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
            <ZoomIn className="h-3 w-3 text-white/70" />
            <span className="text-[10px] text-white/70 font-medium">
              double-click
            </span>
          </div>
        </div>

        {/* State badge — always visible, so "in project" never has to be inferred */}
        {inProject && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 bg-emerald-500 text-white shadow-sm">
            <Check className="h-2.5 w-2.5" />
            In project
          </span>
        )}

        {/* Quick action — names the verb instead of relying on a colour code */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAction?.();
          }}
          disabled={busy}
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity
                      inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-lg disabled:opacity-60
                      ${
                        inProject
                          ? "bg-background/95 text-destructive hover:bg-destructive/10 border border-destructive/30"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : inProject ? (
            <Minus className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          {inProject ? "Remove" : "Add"}
        </button>

        {/* Select indicator */}
        <div className="absolute top-2 right-2">
          <div
            className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-sm transition-all duration-150
                        ${
                          checked
                            ? "bg-violet-500 border-violet-500"
                            : "bg-background/80 border-border group-hover:border-violet-400/60"
                        }`}
          >
            {checked && (
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer: filename + label — always visible below image ── */}
      <div
        className={`px-2.5 py-2 border-t flex items-center gap-1.5 min-w-0 transition-colors
                ${
                  checked
                    ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200/50"
                    : "bg-card border-border/50"
                }`}
      >
        {/* Filename — monospace, truncates with full name in tooltip */}
        <span
          className={`flex-1 min-w-0 text-[11px] font-semibold font-mono truncate leading-none
                        ${
                          checked
                            ? "text-violet-700 dark:text-violet-300"
                            : "text-foreground/80"
                        }`}
          title={img.filename}
        >
          {img.filename}
        </span>

        {/* Label badge */}
        <span
          className={`shrink-0 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 leading-none border
                    ${
                      img.label && img.label !== "full"
                        ? "bg-violet-500/10 text-violet-500 border-violet-500/20"
                        : "bg-muted text-muted-foreground border-border/60"
                    }`}
        >
          {img.label || "full"}
        </span>
      </div>
    </div>
  );
}

/* ── Collapsible page group ─────────────────────────────────────────────── */
function PageGroup({
  page,
  images,
  checked,
  busyFile,
  onToggle,
  onQuickAction,
  onImageDoubleClick,
}) {
  const [open, setOpen] = useState(true);
  const checkedCount = images.filter((img) => checked[img.filename]).length;
  const inProjectCount = images.filter((img) => img.inProject).length;
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left gap-3"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm">Page {page}</span>
          <span className="text-xs text-muted-foreground">
            {images.length} drawing{images.length !== 1 ? "s" : ""}
            {inProjectCount > 0 && ` · ${inProjectCount} in project`}
          </span>
        </div>
        {checkedCount > 0 && (
          <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 border text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50">
            {checkedCount} selected
          </span>
        )}
      </button>
      {open && (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img, i) => (
            <ThumbCard
              key={img.filename}
              img={img}
              inProject={!!img.inProject}
              checked={!!checked[img.filename]}
              busy={busyFile === img.filename}
              onToggle={() => onToggle(img.filename)}
              onQuickAction={() => onQuickAction(img)}
              onDoubleClick={() => onImageDoubleClick(images, i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Upload drop zone for external images ───────────────────────────────── */
function UploadZone({ projectId, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const fileRef = useRef(null);
  const [error, setError] = useState("");

  const doUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    let uploaded = 0;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page_number", pageNum);
      fd.append("label", "UPLOADED");
      try {
        const res = await fetch(buildServerUrl(`/projects/${projectId}/upload-image`), {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
        uploaded++;
      } catch (e) {
        setError(e.message);
      }
    }
    setUploading(false);
    if (uploaded > 0) onUploaded();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    doUpload(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Upload className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Upload an image</p>
          <p className="text-xs text-muted-foreground">
            Already have a floorplan image? It goes straight into the project.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Page&nbsp;
          </label>
          <input
            type="number"
            min={1}
            value={pageNum}
            onChange={(e) => setPageNum(Number(e.target.value) || 1)}
            className="w-16 text-xs text-center rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:border-violet-400/60"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-violet-500/25 text-violet-500 hover:bg-violet-500/10"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Browse Files
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => doUpload(Array.from(e.target.files))}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center py-10 gap-2 transition-colors cursor-pointer
                    ${dragging ? "bg-violet-500/10" : "hover:bg-muted/40"}`}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <div
              className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition-colors ${dragging ? "border-violet-400 bg-violet-500/15" : "border-dashed border-border"}`}
            >
              <Upload
                className={`h-6 w-6 transition-colors ${dragging ? "text-violet-400" : "text-muted-foreground/40"}`}
              />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {dragging ? "Drop images here" : "Drop image files here"}
            </p>
            <p className="text-xs text-muted-foreground/50">
              Supports PNG, JPG, JPEG, WEBP, GIF
            </p>
          </>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   SOURCE TAB
   Two steps, left to right:
     Documents — the PDFs and images you upload, and their extraction state
     Drawings  — every extracted drawing, each either in the project or not

   This used to be three tabs: Drawings / Saved Pages / Add Pages. Two of those
   were halves of one list, which made "saved" read as "the others didn't save"
   and left no way to see everything at once. One list with a state per drawing
   replaces both.
══════════════════════════════════════════════════════════════════════════ */
export function SourceTab({ project }) {
  const {
    availablePages,
    availableLoading,
    pagesUpdating,
    loadOne,
    loadAvailablePages,
    updatePages,
    clearPages,
    downloadMetadata,
  } = useProjects();

  // Documents first: a project starts empty and nothing can happen until a
  // drawing set is uploaded and extracted.
  const [subTab, setSubTab] = useState("documents");
  const [filter, setFilter] = useState("all"); // all | in | unused
  const [docFilter, setDocFilter] = useState(""); // "" = every document
  const [marked, setMarked] = useState({});
  const [busyFile, setBusyFile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const id = project._id ?? project.id;

  const allData = availablePages[id];
  useEffect(() => {
    if (subTab === "drawings" && !allData) loadAvailablePages(id);
  }, [subTab, id, allData, loadAvailablePages]);

  useEffect(() => {
    return () => clearPages(id);
  }, [id, clearPages]);

  // ── Every drawing in the project, with whether it is currently in use ──────
  // `available-pages` lists all diagrams; the project aggregation lists only the
  // ones in use. Merging gives one list with a state per item.
  const allDrawings = useMemo(() => {
    const fromServer = allData?.images ?? [];
    const inProject = getProjectImages(project);
    const inProjectNames = new Set(
      inProject.map((i) => i?.filename).filter(Boolean),
    );
    const seen = new Set(fromServer.map((i) => i?.filename).filter(Boolean));
    // Images uploaded before they became real diagrams exist only on the project.
    const legacyOnly = inProject.filter(
      (i) => i?.filename && !seen.has(i.filename),
    );
    return [...fromServer, ...legacyOnly].map((img) => ({
      ...img,
      page_number: img.page_number ?? img.page_num ?? 0,
      inProject: inProjectNames.has(img.filename),
    }));
  }, [allData, project]);

  const counts = useMemo(() => {
    const inCount = allDrawings.filter((d) => d.inProject).length;
    return {
      all: allDrawings.length,
      in: inCount,
      unused: allDrawings.length - inCount,
    };
  }, [allDrawings]);

  // Documents that actually produced drawings, for the "From" selector.
  const documents = useMemo(() => {
    const map = new Map();
    allDrawings.forEach((d) => {
      const key = d.pdf_id || "";
      if (!map.has(key)) map.set(key, d.pdf_name || "Uploaded images");
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [allDrawings]);

  const visibleDrawings = useMemo(
    () =>
      allDrawings.filter((d) => {
        if (filter === "in" && !d.inProject) return false;
        if (filter === "unused" && d.inProject) return false;
        if (docFilter && (d.pdf_id || "") !== docFilter) return false;
        return true;
      }),
    [allDrawings, filter, docFilter],
  );

  // Page numbers restart in every document, so group by document then page.
  // The document heading is omitted when there is only one, so single-document
  // projects look exactly as they did before.
  const groupedSets = useMemo(() => {
    const sets = new Map();
    for (const img of visibleDrawings) {
      const setName = img.pdf_name || "";
      if (!sets.has(setName)) sets.set(setName, {});
      const pagesInSet = sets.get(setName);
      const p = img.page_number ?? 0;
      if (!pagesInSet[p]) pagesInSet[p] = [];
      pagesInSet[p].push(img);
    }
    return Array.from(sets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([setName, pagesInSet]) => ({
        setName,
        pages: Object.keys(pagesInSet)
          .sort((a, b) => Number(a) - Number(b))
          .map((page) => ({ page, images: pagesInSet[page] })),
      }));
  }, [visibleDrawings]);

  const showSetHeadings = groupedSets.length > 1;

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleMark = (fn) =>
    setMarked((prev) => ({ ...prev, [fn]: !prev[fn] }));

  const markedList = useMemo(
    () =>
      Object.entries(marked)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [marked],
  );

  const visibleNames = useMemo(
    () => new Set(visibleDrawings.map((d) => d.filename)),
    [visibleDrawings],
  );

  // Only act on what is currently on screen, so a hidden filter can't be changed.
  const markedVisible = useMemo(
    () => markedList.filter((fn) => visibleNames.has(fn)),
    [markedList, visibleNames],
  );

  const inProjectNameSet = useMemo(
    () => new Set(allDrawings.filter((d) => d.inProject).map((d) => d.filename)),
    [allDrawings],
  );

  const markedToAdd = markedVisible.filter((fn) => !inProjectNameSet.has(fn));
  const markedToRemove = markedVisible.filter((fn) => inProjectNameSet.has(fn));

  const clearMarks = () => setMarked({});

  const selectAllVisible = () => {
    const next = {};
    visibleDrawings.forEach((img) => {
      next[img.filename] = true;
    });
    setMarked(next);
  };

  // Always fetch every drawing — the document filter is applied client-side, so
  // narrowing the request would make the "All" and "Unused" counts wrong.
  const refresh = async () => {
    await loadOne(id);
    await loadAvailablePages(id);
  };

  const applyChange = async (addNames, removeNames) => {
    if (!addNames.length && !removeNames.length) return;
    await updatePages({
      id,
      add_filenames: addNames,
      remove_filenames: removeNames,
    });
    await refresh();
    clearMarks();
  };

  // Single-card add/remove straight from the tile.
  const handleQuickAction = async (img) => {
    setBusyFile(img.filename);
    try {
      await applyChange(
        img.inProject ? [] : [img.filename],
        img.inProject ? [img.filename] : [],
      );
    } finally {
      setBusyFile(null);
    }
  };

  const handleDownload = async () => {
    setDownloadingId(id);
    await downloadMetadata(project);
    setDownloadingId(null);
  };

  // Jump from a document card into the drawings it produced.
  const handleReviewPdf = useCallback(
    (pdfId) => {
      setSubTab("drawings");
      setFilter("all");
      setDocFilter(pdfId || "");
      setMarked({});
      loadAvailablePages(id);
    },
    [id, loadAvailablePages],
  );

  const openLightbox = useCallback((imgs, startIdx) => {
    setLightbox({ images: imgs, startIndex: startIdx });
  }, []);

  const FILTERS = [
    { key: "all", label: "All", count: counts.all },
    { key: "in", label: "In project", count: counts.in },
    { key: "unused", label: "Unused", count: counts.unused },
  ];

  return (
    <div className="flex flex-col h-full">
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── Step bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border/50 shrink-0 bg-background">
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
          {[
            { key: "documents", icon: Files, label: "Documents", count: null },
            {
              key: "drawings",
              icon: Images,
              label: "Drawings",
              count: allData ? counts.all : null,
            },
          ].map(({ key, icon: Icon, label, count }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  subTab === key
                    ? "bg-background text-foreground shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count !== null && (
                <span className="text-xs rounded-full px-1.5 py-0.5 font-bold text-violet-500 bg-violet-500/10">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {subTab === "drawings" && counts.all > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1 text-muted-foreground"
              onClick={markedVisible.length ? clearMarks : selectAllVisible}
            >
              {markedVisible.length ? (
                <>
                  <Square className="h-3.5 w-3.5" /> Clear selection
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" /> Select all
                </>
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground"
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDownload}
                disabled={downloadingId === id}
              >
                {downloadingId === id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export project data (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Filter row — only where it applies ───────────────────────────── */}
      {subTab === "drawings" && counts.all > 0 && (
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border/40 shrink-0 bg-muted/10 flex-wrap">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                clearMarks();
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
                ${
                  filter === key
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-violet-400/40"
                }`}
            >
              {label}
              <span className="font-bold tabular-nums">{count}</span>
            </button>
          ))}

          {documents.length > 1 && (
            <div className="ml-auto flex items-center gap-2">
              <label
                htmlFor="doc-filter"
                className="text-xs text-muted-foreground"
              >
                From
              </label>
              <select
                id="doc-filter"
                value={docFilter}
                onChange={(e) => {
                  setDocFilter(e.target.value);
                  clearMarks();
                }}
                className="h-7 max-w-[220px] rounded-lg border border-border bg-background px-2 text-xs focus:outline-none focus:border-violet-400/60"
              >
                <option value="">All documents</option>
                {documents.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {subTab === "documents" ? (
          <>
            <ProjectDrawings
              projectId={id}
              onReview={handleReviewPdf}
              onExtracted={refresh}
            />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Or add a single image
              </p>
              <UploadZone
                projectId={id}
                onUploaded={async () => {
                  // An uploaded image becomes a drawing that is already in the
                  // project, so show it where it landed.
                  await refresh();
                  setFilter("all");
                  setSubTab("drawings");
                }}
              />
            </div>
          </>
        ) : availableLoading && !allData ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading drawings…</span>
          </div>
        ) : counts.all === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Images className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold mb-1">No drawings yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
              Upload an architectural PDF and extract floor plans from it. Every
              drawing it finds shows up here for you to pick from.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 gap-1.5"
              onClick={() => setSubTab("documents")}
            >
              <Files className="h-3.5 w-3.5" />
              Go to Documents
            </Button>
          </div>
        ) : visibleDrawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-16 text-center">
            <p className="text-sm font-semibold mb-1">
              {filter === "in"
                ? "No drawings in the project yet"
                : "Every drawing is already in the project"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {filter === "in"
                ? "Switch to Unused and add the drawings you want to work on."
                : "Nothing left to add from this filter."}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 text-xs"
              onClick={() => {
                setFilter("all");
                setDocFilter("");
              }}
            >
              Show all drawings
            </Button>
          </div>
        ) : (
          groupedSets.map(({ setName, pages: setPages }) => (
            <div key={setName || "__unset"} className="space-y-4">
              {showSetHeadings && (
                <div className="flex items-center gap-2 pt-1">
                  <Files className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                    {setName || "Uploaded images"}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              )}
              {setPages.map(({ page, images }) => (
                <PageGroup
                  key={`${setName}-${page}`}
                  page={page}
                  images={images}
                  checked={marked}
                  busyFile={busyFile}
                  onToggle={toggleMark}
                  onQuickAction={handleQuickAction}
                  onImageDoubleClick={openLightbox}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Bulk action bar — only when something is selected ─────────────── */}
      {subTab === "drawings" && markedVisible.length > 0 && (
        <div className="shrink-0 px-6 py-3 border-t border-border/60 bg-background flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">
            {markedVisible.length} selected
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={clearMarks}
          >
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {markedToAdd.length > 0 && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={pagesUpdating}
                onClick={() => applyChange(markedToAdd, [])}
              >
                {pagesUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add {markedToAdd.length} to project
              </Button>
            )}
            {markedToRemove.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                disabled={pagesUpdating}
                onClick={() => applyChange([], markedToRemove)}
              >
                {pagesUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                Remove {markedToRemove.length} from project
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Status line ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-2.5 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {subTab === "documents"
            ? "Upload a PDF, then extract floor plans from it"
            : counts.all === 0
              ? "Nothing extracted yet"
              : `${counts.all} drawing${counts.all !== 1 ? "s" : ""} · ${counts.in} in project`}
        </p>
        <p className="text-xs text-muted-foreground/40">
          Drawings in the project are available in Room Separator
        </p>
      </div>
    </div>
  );
}
