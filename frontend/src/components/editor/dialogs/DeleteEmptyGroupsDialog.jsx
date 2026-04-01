import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteEmptyGroupsDialog({
  open,
  groups = [],
  isDeleting = false,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>Delete Empty Groups</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The following empty groups will be deleted:
          </p>

          <div className="max-h-56 overflow-y-auto border border-gray-200 bg-gray-50 p-2">
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No empty groups found.</p>
            ) : (
              <ul className="space-y-1.5">
                {groups.map((group) => (
                  <li key={group.id} className="text-sm text-gray-800 flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-gray-500" />
                    <div>
                      <span className="font-medium">{group.name || "Untitled group"}</span>
                      {group.code ? (
                        <span className="text-gray-500"> ({group.code})</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-sm text-amber-700 font-medium bg-amber-50 border border-amber-200 px-3 py-2">
            Warning: Deleting groups will remove these items from budget. Groups with entered quantities will be preserved.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-none" disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="rounded-none"
            disabled={isDeleting || groups.length === 0}
          >
            {isDeleting ? "Deleting..." : "OK, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
