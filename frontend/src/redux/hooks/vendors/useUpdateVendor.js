import { useCallback, useState } from "react";
import { buildServerUrl } from "../../../config";

export function useUpdateVendor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (vendorId, vendorData) => {
    setLoading(true);
    setError(null);
    try {
      const url = buildServerUrl(`/vendors/${vendorId}`);
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      });
      if (!response.ok) throw new Error("Failed to update vendor");
      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}
