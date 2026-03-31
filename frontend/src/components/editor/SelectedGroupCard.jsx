import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useGetAllItemType } from "../../redux/hooks/settings/itemtype/useGetAllItemType";
import { useGetAllUnits } from "../../redux/hooks/settings/units/useGetAllUnits";

// ─── Hex ↔ RGB helpers ────────────────────────────────────────────────────────
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function SelectedGroupCard({
  group, // { id, name, code, color }
  masks, // all masks
  selectedMaskIds, // currently selected mask ids
  onUpdate, // (updatedGroup) => void
  onMaskClick, // (maskId) => void — highlights the mask on canvas
  setEditorMode, // to ensure we're in group mode when mask is clicked
}) {
  const [isOpen, setIsOpen] = useState(false); // mask dropdown
  const [editName, setEditName] = useState(group.name);
  const [editCode, setEditCode] = useState(group.code || "");
  const [editUserEnteredQty, setEditUserEnteredQty] = useState(
    group.user_entered_qty || "",
  );
  const [editColor, setEditColor] = useState(rgbToHex(group.color));
  const [editType, setEditType] = useState(group.type || "FF&E");
  const [editUnitId, setEditUnitId] = useState(group.unit_id || "");
  const [editDescription, setEditDescription] = useState(group.description || "");
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState("");
  const colorInputRef = useRef(null);
  const { items: configuredItemTypes = [] } = useGetAllItemType();
  const { items: configuredUnits = [] } = useGetAllUnits();

  const typeOptions = useMemo(() => {
    const fromSettings = configuredItemTypes
      .map((t) => String(t?.name || "").trim())
      .filter(Boolean);
   
    const currentType = String(editType || "").trim();

    const merged = [...fromSettings];
    if (currentType) merged.push(currentType);

    return Array.from(new Set(merged));
  }, [configuredItemTypes, editType]);

  const unitOptions = useMemo(() => {
    const fromSettings = configuredUnits
      .map((u) => ({ id: String(u?._id || ""), name: String(u?.name || "").trim() }))
      .filter((u) => u.id && u.name);

    return fromSettings;
  }, [configuredUnits]);

  // ── Sync fields whenever the selected group changes ──────────────────────────
  useEffect(() => {
    setEditName(group.name);
    setEditCode(group.code || "");
    setEditUserEnteredQty(group.user_entered_qty || "");
    setEditColor(rgbToHex(group.color));
    setEditType(group.type || "FF&E");
    setEditUnitId(group.unit_id || "");
    setEditDescription(group.description || "");
    setIsDirty(false);
    setSaveError("");
    setIsOpen(false); // collapse mask list on group switch
  }, [group.id, group.type, group.description, group.unit_id]); // keyed on id — fires only when a different group is chosen

  // Masks that belong to this group
  const groupMasks = masks.filter((m) => m.group_id === group.id);

  const colorStyle = {
    backgroundColor: `rgb(${group.color[0]}, ${group.color[1]}, ${group.color[2]})`,
  };

  // ── Field change helpers ────────────────────────────────────────────────────
  const handleNameChange = (e) => {
    setEditName(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  const handleCodeChange = (e) => {
    setEditCode(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  const handleColorChange = (e) => {
    setEditColor(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  const handleTypeChange = (e) => {
    setEditType(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  const handleUserEnteredQtyChange = (e) => {
    setEditUserEnteredQty(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  const handleUnitChange = (e) => {
    setEditUnitId(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  const handleDescriptionChange = (e) => {
    setEditDescription(e.target.value);
    setIsDirty(true);
    setSaveError("");
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editName.trim()) {
      setSaveError("Group name is required.");
      return;
    }
    const result = await onUpdate({
      ...group,
      name: editName.trim(),
      code: editCode.trim(),
      user_entered_qty: editUserEnteredQty.trim() || null,
      color: hexToRgb(editColor),
      type: editType,
      unit_id: editUnitId || null,
      description: editDescription.trim(),
    });

    if (result === true || result?.ok) {
      setIsDirty(false);
      setSaveError("");
      return;
    }

    setSaveError(result?.error || "Failed to update group. Please try again.");
  };

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    setEditName(group.name);
    setEditCode(group.code || "");
    setEditUserEnteredQty(group.user_entered_qty || "");
    setEditColor(rgbToHex(group.color));
    setEditType(group.type || "FF&E");
    setEditUnitId(group.unit_id || "");
    setEditDescription(group.description || "");
    setIsDirty(false);
    setSaveError("");
  };

  // ── Mask click ──────────────────────────────────────────────────────────────
  const handleMaskClick = (maskId) => {
    setEditorMode("group"); // ensure group mode so highlighting kicks in
    onMaskClick(maskId);
  };

  return (
    <div className="mx-3 mt-4 mb-3 border border-blue-200 bg-blue-50/40 text-sm font-sans">
      {/* ── Card header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-100">
        {/* Colour swatch — click opens native color picker */}
        <button
          onClick={() => colorInputRef.current?.click()}
          title="Change colour"
          className="w-4 h-4 shrink-0 ring-1 ring-black/15 hover:scale-125 transition-transform"
          style={colorStyle}
        />
        {/* Hidden native color input */}
        <input
          ref={colorInputRef}
          type="color"
          value={editColor}
          onChange={handleColorChange}
          className="sr-only"
        />

        <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-widest">
          Selected Group
        </span>
      </div>

      {/* ── Editable fields ──────────────────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-1 space-y-2">
        {/* Name */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Name
          </label>
          <input
            value={editName}
            onChange={handleNameChange}
            placeholder="Group name"
            className="w-full text-xs px-2 py-1 border border-gray-200 bg-white focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Code */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Code
          </label>
          <input
            value={editCode}
            onChange={handleCodeChange}
            placeholder="Group code"
            className="w-full text-xs px-2 py-1 border border-gray-200 bg-white font-mono focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Type */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Type
          </label>
          <select
            value={editType}
            onChange={handleTypeChange}
            className="w-full text-xs px-2 py-1 border border-gray-200 bg-white focus:outline-none focus:border-blue-400 transition-colors cursor-pointer"
          >
            {typeOptions.map((typeName) => (
              <option key={typeName} value={typeName}>
                {typeName}
              </option>
            ))}
          </select>
        </div>

        {/* User Entered Qty */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            User Entered Qty
          </label>
          <input
            value={editUserEnteredQty}
            onChange={handleUserEnteredQtyChange}
            placeholder="Quantity override"
            className="w-full text-xs px-2 py-1 border border-gray-200 bg-white font-mono focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Unit */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Unit
          </label>
          <select
            value={editUnitId}
            onChange={handleUnitChange}
            className="w-full text-xs px-2 py-1 border border-gray-200 bg-white focus:outline-none focus:border-blue-400 transition-colors cursor-pointer"
          >
            <option value="">No Unit</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Description
          </label>
          <textarea
            value={editDescription}
            onChange={handleDescriptionChange}
            placeholder="Group description"
            rows={2}
            className="w-full text-xs px-2 py-1 border border-gray-200 bg-white focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Colour preview row */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            Colour
          </label>
          <button
            onClick={() => colorInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-2 py-1 border border-gray-200 bg-white text-left hover:border-blue-400 transition-colors"
          >
            <span
              className="inline-block w-3.5 h-3.5 shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: editColor }}
            />
            <span className="text-xs font-mono text-gray-600">
              {editColor.toUpperCase()}
            </span>
            <span className="ml-auto text-[9px] text-gray-400">
              Click to change
            </span>
          </button>
        </div>
      </div>

      {/* ── Save / Cancel ────────────────────────────────────────────────────── */}
      {isDirty && (
        <div className="px-3 pb-2 space-y-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              className="flex-1 py-1 text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-1 text-[11px] font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {saveError && (
            <p className="text-[10px] text-red-600 font-medium">{saveError}</p>
          )}
        </div>
      )}

      {/* ── Masks dropdown ────────────────────────────────────────────────────── */}
      <div className="border-t border-blue-100">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-gray-600 hover:bg-blue-50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3 h-3 text-blue-500"
            >
              <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9Z" />
            </svg>
            <span>Masks</span>
            <span className="bg-blue-100 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5">
              {groupMasks.length}
            </span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={cn(
              "w-3 h-3 text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          >
            <path
              fillRule="evenodd"
              d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Mask list */}
        {isOpen && (
          <div className="max-h-44 overflow-y-auto border-t border-blue-100/60">
            {groupMasks.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-gray-400 text-center">
                No masks in this group
              </p>
            ) : (
              groupMasks.map((mask) => {
                const isSelected = selectedMaskIds?.includes(mask.id);
                return (
                  <button
                    key={mask.id}
                    onClick={() => handleMaskClick(mask.id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors border-b border-blue-50 last:border-none",
                      isSelected
                        ? "bg-red-50 text-red-700 font-medium"
                        : "text-gray-600 hover:bg-blue-50",
                    )}
                  >
                    {/* Selection indicator */}
                    <span
                      className={cn(
                        "inline-block w-1.5 h-1.5 shrink-0",
                        isSelected
                          ? "bg-red-500"
                          : "bg-transparent border border-gray-300",
                      )}
                    />
                    <span className="font-mono truncate">Mask #{mask.id}</span>
                    {mask.source === "user" && (
                      <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-bold rounded uppercase tracking-wider ml-1">
                        User Drawn
                      </span>
                    )}
                    {isSelected && (
                      <span className="ml-auto text-[9px] text-red-400 font-semibold uppercase tracking-wide">
                        selected
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
