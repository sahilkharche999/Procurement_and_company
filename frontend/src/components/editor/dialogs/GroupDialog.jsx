// export { default } from "../GroupDialog";


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function GroupDialog({
  open,
  onClose,
  groups,
  onCreateGroup,
  assignGroup,
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const filteredGroups = Object.values(groups).filter((g) => {
    const query = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(query) ||
      (g.code && g.code.toLowerCase().includes(query))
    );
  });

  const handleAssignExisting = (groupId) => {
    assignGroup(groupId);
    onClose();
  };

  const reset = () => {
    setSearchQuery("");
    setSelectedGroupId(null);
    setName("");
    setCode("");
    setDescription("");
    setColor("#3b82f6");
  };

  const handleCreate = async () => {
    const created = await onCreateGroup({
      name,
      code,
      description,
      color: hexToRgb(color),
      type: "FF&E",
    });
    if (!created?.id) return;
    assignGroup(created.id);
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-none border border-gray-200 shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-base font-semibold text-gray-900 tracking-tight">
            Assign or Create Group
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Select an existing group or create a new one to assign to your masks.
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <Input
            placeholder="Search group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
          />

          <ScrollArea className="h-48 border rounded-sm border-gray-200">
            <div className="p-1 space-y-1">
              {filteredGroups.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  No groups found
                </div>
              ) : (
                filteredGroups.map((g) => {
                  const rgbColor = Array.isArray(g.color)
                    ? `rgb(${g.color.join(",")})`
                    : g.color;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleAssignExisting(g.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 text-left text-xs transition-colors rounded-sm",
                        "hover:bg-gray-100 text-gray-700",
                      )}
                    >
                      <div
                        className="w-3 h-3 shrink-0 shadow-sm border border-black/10"
                        style={{ backgroundColor: rgbColor }}
                      />
                      <span className="truncate">
                        {g.name} {g.code ? `(${g.code})` : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700">Create New Group</p>
            <Input
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <Input
              placeholder="Code (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Color:</label>
              <input
                type="color"
                className="h-8 w-12 border border-gray-300 rounded-sm cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-none text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="rounded-none text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create & Assign
          </Button>
        </DialogFooter>
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
