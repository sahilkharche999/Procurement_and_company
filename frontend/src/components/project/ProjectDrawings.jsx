import { useRef, useState } from "react";
import { useProjectPdfs } from "../../redux/hooks/project/useProjectPdfs";
import { ProjectPdfCard } from "./ProjectPdfCard";
import { Button } from "../ui/button";
import {
  FolderOpen,
  Loader2,
  Upload,
  X,
  FileText,
  Files,
  RefreshCw,
} from "lucide-react";

/**
 * Upload and extraction for one project's architectural PDFs.
 *
 * Uploading and extracting are two deliberate steps: a PDF is stored against
 * this project first, then extracted from its own card. Neither step can reach
 * another project's drawings.
 */
export function ProjectDrawings({ projectId, onReview, onExtracted }) {
  const { pdfs, loading, error, refetch, upload, extract, remove } =
    useProjectPdfs(projectId);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const pickFile = (selected) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files can be uploaded.");
      return;
    }
    setUploadError("");
    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const result = await upload(file);
    setUploading(false);
    if (result?.error) {
      setUploadError(result.error);
      return;
    }
    clearFile();
  };

  const handleExtract = async (pdfId) => {
    const result = await extract(pdfId);
    if (!result?.error) onExtracted?.();
    return result;
  };

  const handleDelete = async (pdfId) => {
    const result = await remove(pdfId);
    if (!result?.error) onExtracted?.();
    return result;
  };

  const hasPdfs = pdfs.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Files className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">
            PDF documents
            {hasPdfs && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({pdfs.length})
              </span>
            )}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => refetch()}
          disabled={loading}
          title="Refresh drawing list"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Cards */}
      {loading && !hasPdfs ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading drawings…
        </div>
      ) : hasPdfs ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {pdfs.map((pdf) => (
            <ProjectPdfCard
              key={pdf.id}
              pdf={pdf}
              onExtract={handleExtract}
              onDelete={handleDelete}
              onReview={onReview}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-violet-500/60" />
          </div>
          <p className="text-sm font-semibold">No drawings yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
            Upload an architectural PDF below, then extract floor plans from it.
            Rooms, masks and budget items all start from a drawing.
          </p>
        </div>
      )}

      {/* Upload */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {hasPdfs ? "Add another PDF" : "Upload an architectural PDF"}
        </p>

        {!file ? (
          <div
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1.5 py-7 px-4 text-center ${
              dragging
                ? "border-violet-400 bg-violet-500/10"
                : "border-border hover:border-violet-400/60 hover:bg-violet-500/5"
            }`}
          >
            <FolderOpen
              className={`h-5 w-5 ${dragging ? "text-violet-400" : "text-muted-foreground"}`}
            />
            <p className="text-sm font-medium">Drop a PDF here</p>
            <p className="text-xs text-muted-foreground">
              or{" "}
              <span className="text-violet-500 underline underline-offset-2">
                click to browse
              </span>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-violet-500" />
            </div>
            <span
              className="text-xs text-muted-foreground truncate flex-1 min-w-0"
              title={file.name}
            >
              {file.name}
            </span>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
              className="h-8 gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </>
              )}
            </Button>
            <button
              onClick={clearFile}
              disabled={uploading}
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => pickFile(e.target.files?.[0])}
          className="hidden"
        />

        {uploadError && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1.5">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
