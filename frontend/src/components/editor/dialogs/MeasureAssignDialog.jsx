import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function MeasureAssignDialog({
  open,
  measuredFeet,
  groups,
  onClose,
  onAssign,
}) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState("");

  const options = useMemo(
    () =>
      Object.values(groups || {})
        .map((g) => ({ id: g.id, name: g.name, code: g.code }))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    [groups],
  );

  useEffect(() => {
    if (open) {
      setSelectedGroupId(options[0]?.id || "");
      setError("");
    }
  }, [open, options]);

  const handleAssign = () => {
    if (!selectedGroupId) {
      setError("Please select a group.");
      return;
    }
    onAssign(selectedGroupId);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>Assign Measured Size</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Measured length: <strong>{measuredFeet.toFixed(2)} ft</strong>
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Select Group</label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setError("");
              }}
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none cursor-pointer"
            >
              {options.length === 0 ? (
                <option value="">No groups found</option>
              ) : (
                options.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.code ? `(${g.code})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-none">
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={options.length === 0}
            className="rounded-none"
          >
            Save Size
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
