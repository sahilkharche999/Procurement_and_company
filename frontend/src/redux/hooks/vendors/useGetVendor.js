import { useCallback, useState } from "react";
import { buildServerUrl } from "../../../config";

export function useGetVendor() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (vendorId) => {
    setLoading(true);
    setError(null);
    try {
      const url = buildServerUrl(`/vendors/${vendorId}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch vendor");
      const data = await response.json();
      setVendor(data);
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { vendor, loading, error, fetch };
}
