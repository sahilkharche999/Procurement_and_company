import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function GroupDialog({
  open,
  onClose,
  groups,
  onCreateGroup,
  assignGroup,
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleCreate = async () => {
    const created = await onCreateGroup({
      name,
      code,
      color: hexToRgb(color),
      type: "FF&E",
    });
    if (!created?.id) return;

    assignGroup(created.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        hideOverlay
        className="max-w-md border border-slate-300 bg-slate-100 p-0 gap-0 rounded-none"
      >
        <DialogHeader className="px-4 py-3 border-b border-slate-300 bg-slate-50">
          <DialogTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
            Change / Create Group
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2">
              Assign Existing
            </h3>
            <div className="max-h-52 overflow-y-auto border border-slate-300 bg-white">
              {Object.values(groups).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-200 last:border-b-0 text-left hover:bg-blue-50 transition-colors"
                  onClick={() => {
                    assignGroup(g.id);
                    onClose();
                  }}
                >
                  <span className="text-sm text-slate-800">{g.name}</span>
                  <span className="text-xs text-slate-500">{g.code || "-"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-300 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2">
              Create New Group
            </h3>
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border-slate-300 rounded-none"
            />
            <Input
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2 bg-white border-slate-300 rounded-none"
            />
            <input
              type="color"
              className="mt-2 w-full h-10 border border-slate-300 bg-white"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />

            <Button
              className="mt-3 w-full rounded-none"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create & Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
  ];
}
