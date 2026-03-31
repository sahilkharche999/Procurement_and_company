import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SetScaleDialog({
  open,
  pixelDistance,
  onClose,
  onConfirm,
}) {
  const [knownFeet, setKnownFeet] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setKnownFeet("");
      setError("");
    }
  }, [open]);

  const handleConfirm = () => {
    const value = Number(knownFeet);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Please enter a valid distance in feet.");
      return;
    }
    onConfirm(value);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>Set Drawing Scale</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Drawn line length on image: <strong>{pixelDistance.toFixed(2)} px</strong>
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Actual length (feet)
            </label>
            <Input
              value={knownFeet}
              onChange={(e) => {
                setKnownFeet(e.target.value);
                setError("");
              }}
              placeholder="e.g. 12"
              type="number"
              min="0"
              step="0.01"
              className="rounded-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-none">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="rounded-none">
            Save Scale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
