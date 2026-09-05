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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FolderPlus, Loader2 } from "lucide-react";

/**
 * Names and creates an empty project.
 *
 * Creating a project no longer uploads anything — drawings are added from inside
 * the project once it exists, so a project always starts with a name the user
 * chose rather than an upload timestamp.
 */
export function CreateProjectDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cleared on every close path — Cancel, Escape, overlay click and success —
  // so the dialog always reopens empty without an effect watching `open`.
  const close = () => {
    setName("");
    setDescription("");
    setError("");
    setSaving(false);
    onOpenChange(false);
  };

  const trimmed = name.trim();

  const handleCreate = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    setError("");
    const result = await onCreate({
      name: trimmed,
      description: description.trim(),
    });
    setSaving(false);

    if (result?.error) {
      setError(
        typeof result.payload === "string"
          ? result.payload
          : "Could not create the project. Try again.",
      );
      return;
    }
    close();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && trimmed && !saving) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <FolderPlus className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <DialogTitle>New Project</DialogTitle>
              <DialogDescription className="mt-0.5">
                Add drawings after it&apos;s created.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder="e.g. Residence Inn Orlando Airport"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="project-description"
              placeholder="e.g. CD set issued for construction"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!trimmed || saving}
            className="gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
