import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Trash2, Loader2, Undo2 } from "lucide-react";

/**
 * Confirms moving a project to the recycle bin.
 *
 * Deleting used to fire straight from the trash icon and permanently destroyed
 * the project's drawings, rooms and budget items along with its folder on disk.
 * It is now reversible, so this asks once and says plainly where the project goes.
 */
export function DeleteProjectDialog({ project, open, onOpenChange, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setBusy(false);
    setError("");
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError("");
    const result = await onConfirm(project);
    setBusy(false);
    if (result?.error) {
      setError(
        typeof result.payload === "string"
          ? result.payload
          : "Could not delete the project. Try again.",
      );
      return;
    }
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Delete this project?</DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {project?.name || "Untitled project"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-1">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 flex gap-2.5">
            <Undo2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              It moves to <strong className="text-foreground">Deleted</strong>,
              where you can restore it. Drawings, rooms and budget items are kept
              — nothing is erased.
            </p>
          </div>

          {error && (
            <p className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy}
            className="gap-2 bg-destructive hover:bg-destructive/90 text-white border-0"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
