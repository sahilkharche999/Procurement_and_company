import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/apiClient";

/**
 * The architectural PDFs belonging to one project, with their extraction state.
 *
 * Polls only while at least one drawing is extracting, and polls the whole list
 * with a single interval rather than one per card.
 */
export function useProjectPdfs(projectId) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  // Avoids a spinner flash on every poll tick.
  const loadedOnceRef = useRef(false);

  const fetchPdfs = useCallback(
    async ({ silent = false } = {}) => {
      if (!projectId) return [];
      if (!silent && !loadedOnceRef.current) setLoading(true);
      try {
        const res = await api.get(`/projects/${projectId}/pdfs`);
        const list = res.data?.pdfs ?? [];
        setPdfs(list);
        setError("");
        loadedOnceRef.current = true;
        return list;
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
        return [];
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    loadedOnceRef.current = false;
    fetchPdfs();
  }, [fetchPdfs]);

  // Keep polling while anything is mid-extraction, then stop.
  const isProcessing = pdfs.some((p) => p.extraction_status === "processing");
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!isProcessing) return undefined;
    pollRef.current = setInterval(() => fetchPdfs({ silent: true }), 2000);
    return () => clearInterval(pollRef.current);
  }, [isProcessing, fetchPdfs]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const upload = useCallback(
    async (file) => {
      if (!projectId || !file) return { error: "No file" };
      const form = new FormData();
      form.append("file", file);
      form.append("project_id", projectId);
      try {
        const res = await api.post("/pdf/upload", form, {
          headers: { "Content-Type": undefined },
        });
        await fetchPdfs({ silent: true });
        return { data: res.data };
      } catch (err) {
        return { error: err.response?.data?.detail || err.message };
      }
    },
    [projectId, fetchPdfs],
  );

  const extract = useCallback(
    async (pdfId) => {
      const form = new FormData();
      form.append("pdf_id", pdfId);
      form.append("dpi", 300);
      form.append("min_area_pct", 5.0);
      try {
        const res = await api.post("/floorplan/processing-jobs", form, {
          headers: { "Content-Type": undefined },
        });
        await fetchPdfs({ silent: true });
        return { data: res.data };
      } catch (err) {
        return { error: err.response?.data?.detail || err.message };
      }
    },
    [fetchPdfs],
  );

  const remove = useCallback(
    async (pdfId) => {
      try {
        const res = await api.delete(`/pdf/${pdfId}`);
        await fetchPdfs({ silent: true });
        return { data: res.data };
      } catch (err) {
        return { error: err.response?.data?.detail || err.message };
      }
    },
    [fetchPdfs],
  );

  return {
    pdfs,
    loading,
    error,
    isProcessing,
    refetch: fetchPdfs,
    upload,
    extract,
    remove,
  };
}
