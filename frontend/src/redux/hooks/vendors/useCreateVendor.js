import { useCallback, useState } from "react";
import { buildServerUrl } from "../../../config";

export function useCreateVendor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (vendorData) => {
    setLoading(true);
    setError(null);
    try {
      const url = buildServerUrl("/vendors");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      });
      if (!response.ok) throw new Error("Failed to create vendor");
      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}
