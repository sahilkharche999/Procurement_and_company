import { useCallback, useState, useEffect } from "react";
import { buildServerUrl } from "../../../config";

export function useGetAllVendors() {
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildServerUrl(
        `/vendors?search=${encodeURIComponent(search)}&limit=${pageSize}&skip=${page * pageSize}`
      );
      console.log("[useGetAllVendors] Fetching from:", url);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("[useGetAllVendors] API Error:", response.status, errorData);
        throw new Error(`Failed to fetch vendors: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[useGetAllVendors] Data received:", data);
      setVendors(data.vendors || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("[useGetAllVendors] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return {
    vendors,
    total,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    refetch: fetchVendors,
  };
}
