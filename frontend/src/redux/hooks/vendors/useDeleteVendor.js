import { useCallback, useState } from "react";
import { buildServerUrl } from "../../../config";

export function useDeleteVendor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = useCallback(async (vendorId) => {
    setLoading(true);
    setError(null);
    try {
      const url = buildServerUrl(`/vendors/${vendorId}`);
      const response = await fetch(url, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete vendor");
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}
