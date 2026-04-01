import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DeleteRowDialog } from "./DeleteRowDialog";
import { SubItemRow } from "./SubItemRow";
import { AssignParentDialog } from "./AssignParentDialog";
import { CreateBudgetItemDialog } from "./CreateBudgetItemDialog";
import { EditBudgetItemDialog } from "./EditBudgetItemDialog";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/utils";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

/** Extract leading number from qty strings like "1", "2.5", "1 Ea." */
function parseQtyNumber(qty) {
  if (!qty) return 1;
  const match = String(qty).match(/^[\s]*([0-9]+(?:\.[0-9]*)?)/);
  return match ? parseFloat(match[1]) : 1;
}

function formatQtyDisplay(qty) {
  if (qty === null || qty === undefined || qty === "") return "-";
  const match = String(qty).match(/^[\s]*([0-9]+(?:\.[0-9]*)?)/);
  if (!match) return String(qty);
  const n = Number(match[1]);
  return Number.isInteger(n) ? String(n) : String(n);
}

export function BudgetRow({
  item,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onInsert,
  onToggleHide,
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
  onDetachSubItem,
  onAssignSubItem,
  rootItems = [],
  rooms = [],
  vendors = [],
  visibleColumns = {},
}) {
  const [localItem, setLocalItem] = useState({ ...item });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subExpanded, setSubExpanded] = useState(false);
  const [qtyEdited, setQtyEdited] = useState(false);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState(null); // 'above' or 'below'
  const [subItemDialogOpen, setSubItemDialogOpen] = useState(false);
  const [addingSubItem, setAddingSubItem] = useState(false);
  const [newSub, setNewSub] = useState({
    spec_no: "",
    description: "",
    qty: "1",
    unit_cost: "",
  });

  const subitems = item.subitems || [];
  const hasSubitems = subitems.length > 0;

  // Reset local state when item prop changes or editing mode changes
  useEffect(() => {
    setLocalItem({ ...item });
    setQtyEdited(false);
  }, [item, isEditing]);

  // Auto-expand when subitems exist
  useEffect(() => {
    if (hasSubitems) setSubExpanded(true);
  }, [hasSubitems]);

  const handleChange = (field, value) => {
    setLocalItem((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "qty") {
        setQtyEdited(true);
        updated.user_entered_qty = value;
      }

      const activeQtyForMath =
        field === "qty"
          ? value
          : (updated.user_entered_qty ?? updated.qty);
      const qtyNum = parseQtyNumber(activeQtyForMath);

      if (field === "unit_cost" || field === "qty") {
        const unitCost =
          field === "unit_cost"
            ? parseFloat(value) || 0
            : parseFloat(updated.unit_cost) || 0;
        updated.extended = parseFloat((qtyNum * unitCost).toFixed(2));
      } else if (field === "extended") {
        const extVal = parseFloat(value) || 0;
        updated.unit_cost =
          qtyNum > 0 ? parseFloat((extVal / qtyNum).toFixed(2)) : 0;
      }
      return updated;
    });
  };

  const handleSave = () => {
    const payload = { ...localItem };

    if (qtyEdited) {
      payload.qty =
        localItem.user_entered_qty !== undefined &&
        localItem.user_entered_qty !== null
          ? String(localItem.user_entered_qty)
          : String(localItem.qty ?? "");
    } else {
      delete payload.qty;
      delete payload.user_entered_qty;
    }

    onSave(item._id, payload);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  };

  const handleAddSubItemSave = async () => {
    if (!newSub.description && !newSub.spec_no) return;
    await onAddSubItem(item._id, {
      ...newSub,
      unit_cost: newSub.unit_cost !== "" ? Number(newSub.unit_cost) : null,
      created_by: "user",
    });
    setNewSub({ spec_no: "", description: "", qty: "1", unit_cost: "" });
    setAddingSubItem(false);
    setSubExpanded(true);
  };

  const isHidden = item.hidden_from_total;
  const hasUserEnteredQty =
    item.user_entered_qty !== undefined &&
    item.user_entered_qty !== null &&
    String(item.user_entered_qty).trim() !== "";
  const effectiveQty = hasUserEnteredQty ? item.user_entered_qty : item.qty;
  const isVisible = (columnId) => visibleColumns[columnId] !== false;
  const parentRoomId =
    typeof item.room === "object"
      ? item.room?._id || ""
      : item.room || "";

  return (
    <>
      {/* ── Main item row ── */}
      <tr
        className={`border-b transition-colors hover:bg-muted/50 ${isEditing ? "bg-muted/30 ring-1 ring-inset ring-muted-foreground/20" : ""} ${isHidden ? "opacity-60" : ""}`}
      >
        {/* Spec No — with sub-item expand toggle */}
        {isVisible("specNo") && <td className="p-2 align-middle font-medium w-[100px]">
          <div className="flex items-center gap-1">
            {hasSubitems ? (
              <button
                onClick={() => setSubExpanded((s) => !s)}
                className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={subExpanded ? "Collapse subitems" : "Expand subitems"}
              >
                {subExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            {item.spec_no}
          </div>
        </td>}

        {/* Name */}
        {isVisible("name") && <td
          className="p-2 align-middle max-w-35 truncate"
          title={item.name}
        >
          <span className="truncate block">{item.name || "-"}</span>
        </td>}

        {/* Description */}
        {isVisible("description") && <td
          className="p-2 align-middle max-w-[200px] truncate"
          title={item.description}
        >
          <div className="flex items-center gap-2">
            <span className="truncate block" style={{ maxWidth: "85%" }}>
              {item.description}
            </span>
            {item.created_by === "system" && (
              <Badge
                variant="outline"
                className="border-violet-500/50 text-violet-500 bg-violet-500/10 px-1 py-0 h-4 text-[9px] rounded-sm shrink-0"
              >
                AI
              </Badge>
            )}
          </div>
        </td>}

        {/* Type */}
        {isVisible("type") && <td className="p-2 align-middle w-24">
          <Badge variant="outline" className="text-xs">
            {item.type || "FF&E"}
          </Badge>
        </td>}

        {/* Room */}
        {isVisible("room") && <td className="p-2 align-middle w-[120px]">
          {item.room_name ||
            "Unknown Room"}
        </td>}

        {/* Page No */}
        {isVisible("page") && <td className="p-2 align-middle w-[60px] text-center">
          {item.page_no}
        </td>}

        {/* Qty */}
        {isVisible("qty") && <td className="p-2 align-middle w-[80px]">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                hasUserEnteredQty ? "bg-yellow-400" : "bg-emerald-500",
              )}
              title={
                hasUserEnteredQty
                  ? "User-entered quantity"
                  : "Auto quantity from masks"
              }
            />
            <span>{formatQtyDisplay(effectiveQty)}</span>
          </div>
        </td>}

        {/* Unit */}
        {isVisible("unit") && <td className="p-2 align-middle w-[100px]">
          {item.unit_name || "-"}
        </td>}

        {/* Unit Cost */}
        {isVisible("unitCost") && <td className="p-2 align-middle w-[100px] text-right">
          {formatCurrency(item.unit_cost)}
        </td>}

        {/* Extended */}
        {isVisible("extended") && <td className="p-2 align-middle w-[100px] text-right font-medium">
          <span className={isHidden ? "line-through text-muted-foreground" : ""}>
            {formatCurrency(item.extended)}
          </span>
        </td>}
        {isVisible("vendor") && <td className="p-2 align-middle w-[120px] truncate" title={item.vendor_name}>
          {item.vendor_name || "-"}
        </td>}

        {/* Actions */}
        {isVisible("actions") && <td className="p-2 align-middle w-[150px]">
          <div className="flex items-center gap-0.5 justify-end">
            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditDialogOpen(true)}
              title="Edit row"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* Hide from totals */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleHide(item._id)}
              title={isHidden ? "Show in totals" : "Hide from totals"}
            >
              {isHidden ? (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>

            {/* Insert / Add subitem */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setInsertPosition("above");
                    setInsertDialogOpen(true);
                  }}
                >
                  Insert Row Above
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setInsertPosition("below");
                    setInsertDialogOpen(true);
                  }}
                >
                  Insert Row Below
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setSubItemDialogOpen(true);
                    setSubExpanded(true);
                  }}
                >
                  <Layers className="h-4 w-4 mr-2 text-violet-400" />
                  Add Sub-Item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setAssignDialogOpen(true)}>
                  Assign to Parent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>}
      </tr>

      {/* ── Sub-items ── */}
      {subExpanded &&
        subitems.map((sub) => (
          <SubItemRow
            key={sub._id}
            subitem={sub}
            rooms={rooms}
            parentRoomId={parentRoomId}
            onUpdate={(subId, data) => onUpdateSubItem(item._id, subId, data)}
            onDelete={(subId) => onDeleteSubItem(item._id, subId)}
            onDetach={(subId) => onDetachSubItem(item._id, subId)}
            vendors={vendors}
            visibleColumns={visibleColumns}
          />
        ))}

      {/* ── Add subitem inline form ── */}
      {addingSubItem && (
        <tr className="bg-violet-500/5 border-b border-violet-500/20">
          <td className="p-2 align-middle" colSpan={2}>
            <div className="flex items-center gap-1 pl-6">
              <span className="text-xs text-muted-foreground mr-1">
                Sub-item:
              </span>
              <Input
                placeholder="Spec No"
                value={newSub.spec_no}
                onChange={(e) =>
                  setNewSub((s) => ({ ...s, spec_no: e.target.value }))
                }
                className="h-7 text-xs w-24"
              />
              <Input
                placeholder="Description"
                value={newSub.description}
                onChange={(e) =>
                  setNewSub((s) => ({ ...s, description: e.target.value }))
                }
                className="h-7 text-xs flex-1"
              />
            </div>
          </td>
          <td className="p-2 align-middle" colSpan={4}>
            <div className="flex gap-1">
              <Input
                placeholder="Qty"
                type="number"
                step="0.01"
                value={newSub.qty}
                onChange={(e) =>
                  setNewSub((s) => ({ ...s, qty: e.target.value }))
                }
                className="h-7 text-xs w-20"
              />
              <Input
                placeholder="Unit $"
                type="number"
                value={newSub.unit_cost}
                onChange={(e) =>
                  setNewSub((s) => ({ ...s, unit_cost: e.target.value }))
                }
                className="h-7 text-xs w-24"
              />
            </div>
          </td>
          <td className="p-2 align-middle" colSpan={3}>
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                className="h-7 text-xs bg-violet-500 hover:bg-violet-600 text-white"
                onClick={handleAddSubItemSave}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setAddingSubItem(false)}
              >
                Cancel
              </Button>
            </div>
          </td>
        </tr>
      )}

      {/* ── Insert Row Dialog ── */}
      <CreateBudgetItemDialog
        open={insertDialogOpen}
        onOpenChange={setInsertDialogOpen}
        onConfirm={async (formData) => {
          const newItem = {
            ...formData,
            section: item.section,
            name: formData.name || "",
            insert_relative_to: item._id,
            position: insertPosition,
            room: formData.room || "",
            unit_id: formData.unit_id || null,
            vendor: formData.vendor || "",
            created_by: "user",
          };
          const result = await onInsert(item._id, insertPosition);
          if (!result?.error) {
            // The insert API call returns the created item
            // We need to update it with the form data from the dialog
            const createdId = result?.payload?._id || result?._id;
            if (createdId) {
              await onSave(createdId, newItem);
            }
          }
        }}
        title={`Insert Row ${insertPosition === "above" ? "Above" : "Below"}`}
        description={`Fill in the details for the new budget item to be inserted ${insertPosition} the current row.`}
        rooms={rooms}
        vendors={vendors}
        isSubItem={false}
      />

      {/* ── Add Sub-Item Dialog ── */}
      <CreateBudgetItemDialog
        open={subItemDialogOpen}
        onOpenChange={setSubItemDialogOpen}
        onConfirm={async (formData) => {
          const subItemData = {
            spec_no: formData.spec_no,
            name: formData.name || "",
            description: formData.description,
            type: formData.type || item.type || "FF&E",
            qty: formData.qty,
            unit_id: formData.unit_id || null,
            unit_cost:
              formData.unit_cost !== "" ? parseFloat(formData.unit_cost) : null,
            room: formData.room || parentRoomId,
            vendor: formData.vendor || "",
            created_by: "user",
          };
          await onAddSubItem(item._id, subItemData);
          setSubExpanded(true);
        }}
        title="Add Sub-Item"
        description="Fill in the details for the new sub-item."
        rooms={rooms}
        initialValues={{
          room: parentRoomId,
          type: item.type || "FF&E",
          unit_id:
            (typeof item.unit_id === "object"
              ? item.unit_id?._id || ""
              : item.unit_id) ||
            (typeof item.unit === "object" ? item.unit?._id || "" : item.unit) ||
            "",
        }}
        isSubItem={true}
        vendors={vendors}
      />

      <DeleteRowDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          onDelete(item._id);
          setDeleteDialogOpen(false);
        }}
        itemName={item.description || "this item"}
      />

      <AssignParentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onConfirm={async (parentId) => {
          if (onAssignSubItem) {
            await onAssignSubItem(item._id, parentId);
          }
        }}
        itemName={item.description || item.spec_no || "this item"}
        rootItems={rootItems}
        itemId={item._id}
      />

      <EditBudgetItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onConfirm={async (formData) => {
          const updatedItem = {
            spec_no: formData.spec_no,
            name: formData.name || "",
            description: formData.description,
            type: formData.type || "FF&E",
            qty: formData.qty || "1",
            unit_id: formData.unit_id || null,
            unit_cost: parseFloat(formData.unit_cost) || 0,
            room: formData.room,
            vendor: formData.vendor || "",
          };
          await onSave(item._id, updatedItem);
          setEditDialogOpen(false);
        }}
        item={item}
        rooms={rooms}
        vendors={vendors}
        isLoading={false}
      />
    </>
  );
}
