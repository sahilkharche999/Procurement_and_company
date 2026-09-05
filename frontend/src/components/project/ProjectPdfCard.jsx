import { useState } from "react";
import { Button } from "../ui/button";
import {
  FileText,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Layers,
  Lock,
} from "lucide-react";

function formatSize(bytes) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_META = {
  not_extracted: {
    label: "Not extracted",
    className: "border-border bg-muted/50 text-muted-foreground",
    Icon: FileText,
  },
  processing: {
    label: "Extracting",
    className:
      "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    Icon: Loader2,
  },
  extracted: {
    label: "Extracted",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    Icon: AlertCircle,
  },
};

/**
 * One architectural PDF in a project, with its own extraction state.
 *
 * Extraction is offered only while nothing has been built on the drawing yet —
 * re-extracting recreates the diagrams that existing rooms are traced on, so the
 * backend refuses it too. The button is not the guard, only the signpost.
 */
export function ProjectPdfCard({ pdf, onExtract, onDelete, onReview }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const status = pdf.extraction_status || "not_extracted";
  const meta = STATUS_META[status] ?? STATUS_META.not_extracted;
  const StatusIcon = meta.Icon;

  const job = pdf.job;
  const progress = status === "processing" ? (job?.progress ?? 0) : 0;
  const hasDependants = pdf.room_count > 0 || pdf.budget_count > 0;

  const run = async (fn) => {
    setBusy(true);
    setError("");
    const result = await fn();
    setBusy(false);
    if (result?.error) setError(result.error);
    return result;
  };

  const handleExtract = () => run(() => onExtract(pdf.id));

  const handleDelete = async () => {
    const result = await run(() => onDelete(pdf.id));
    if (!result?.error) setConfirmingDelete(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Header — file identity */}
      <div className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-violet-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            title={pdf.original_name || pdf.filename}
          >
            {pdf.original_name || pdf.filename}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pdf.page_count ? `${pdf.page_count} pages · ` : ""}
            {formatSize(pdf.file_size)} · {formatDate(pdf.uploaded_at)}
          </p>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${meta.className}`}
        >
          <StatusIcon
            className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`}
          />
          {meta.label}
        </span>
      </div>

      {/* Progress — only while a job is running */}
      {status === "processing" && (
        <div className="px-4 pb-3 space-y-1.5">
          <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground truncate">
              {job?.step || "Queued…"}
            </p>
            <span className="text-[11px] font-semibold tabular-nums text-violet-500 shrink-0">
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Extracted summary */}
      {status === "extracted" && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong className="text-foreground font-semibold">
                {pdf.diagram_count}
              </strong>{" "}
              {pdf.diagram_count === 1 ? "drawing" : "drawings"} found
              {pdf.selected_diagram_count > 0 && (
                <> · {pdf.selected_diagram_count} in project</>
              )}
              {pdf.room_count > 0 && (
                <>
                  {" "}
                  · {pdf.room_count} {pdf.room_count === 1 ? "room" : "rooms"}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Failure detail */}
      {status === "failed" && job?.error_msg && (
        <div className="px-4 pb-3">
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1.5">
            {job.error_msg}
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1.5">
            {error}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto border-t border-border/60 bg-muted/20 px-3 py-2.5 flex items-center gap-2">
        {status === "not_extracted" && (
          <Button
            size="sm"
            onClick={handleExtract}
            disabled={busy}
            className="gap-1.5 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Extract Floor Plans
          </Button>
        )}

        {status === "failed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExtract}
            disabled={busy}
            className="gap-1.5 h-8"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Retry
          </Button>
        )}

        {status === "extracted" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReview(pdf.id)}
            className="gap-1.5 h-8"
          >
            <Layers className="h-3.5 w-3.5" />
            View its drawings
          </Button>
        )}

        {status === "processing" && (
          <span className="text-xs text-muted-foreground px-1">
            Extraction running — this can take a few minutes.
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasDependants ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground pr-1"
              title={`${pdf.room_count} room(s) and ${pdf.budget_count} budget item(s) depend on this drawing`}
            >
              <Lock className="h-3 w-3" />
              In use
            </span>
          ) : confirmingDelete ? (
            <>
              <span className="text-[11px] text-muted-foreground">
                Delete this drawing?
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </>
          ) : (
            status !== "processing" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmingDelete(true)}
                title="Delete this drawing"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
