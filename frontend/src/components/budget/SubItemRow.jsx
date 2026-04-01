import { useState } from "react";
import { TableRow, TableCell } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { EditBudgetItemDialog } from "./EditBudgetItemDialog";
import {
  Pencil,
  Trash2,
  CornerDownRight,
  ArrowUpFromLine,
  EyeOff,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/utils";

/**
 * SubItemRow — renders one nested sub-item inside a budget item row.
 *
 * Props:
 *   subitem       — subitem data object
 *   onUpdate      — (subId, data) => void
 *   onDelete      — (subId) => void
 *   onDetach      — (subId) => void   — promote to top-level
 *   colSpanTotal  — total number of columns in the table (for alignment)
 */
export function SubItemRow({
  subitem,
  onUpdate,
  onDelete,
  onDetach,
  rooms = [],
  parentRoomId = "",
  vendors = [],
  visibleColumns = {},
  colSpanTotal = 11,
}) {
  const toDisplayQty = (qty) => {
    if (qty === null || qty === undefined || qty === "") return "-";
    const match = String(qty).match(/^[\s]*([0-9]+(?:\.[0-9]*)?)/);
    if (!match) return String(qty);
    const n = Number(match[1]);
    return Number.isInteger(n) ? String(n) : String(n);
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detaching, setDetaching] = useState(false);
  const [initialQty, setInitialQty] = useState(String(subitem.qty || '1'));

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(subitem._id);
    setDeleting(false);
  };

  const handleDetach = async () => {
    setDetaching(true);
    await onDetach(subitem._id);
    setDetaching(false);
  };

  const handleToggleHide = async () => {
    await onUpdate(subitem._id, {
      hidden_from_total: !subitem.hidden_from_total,
    });
  };

  const cellCls = "py-1.5 pl-2 pr-1 text-xs border-b border-border/30";
  const mutedRow = subitem.hidden_from_total ? "opacity-50" : "";
  const roomId =
    typeof subitem.room === "object"
      ? subitem.room?._id || ""
      : subitem.room || parentRoomId || "";
  const resolvedRoomName =
    subitem.room_name || rooms.find((r) => r?._id === roomId)?.name || "—";
  const unitId =
    (typeof subitem.unit_id === "object"
      ? subitem.unit_id?._id || ""
      : subitem.unit_id) ||
    (typeof subitem.unit === "object"
      ? subitem.unit?._id || ""
      : subitem.unit) ||
    "";
  const resolvedUnitName = subitem.unit_name || "-";
  const isVisible = (columnId) => visibleColumns[columnId] !== false;

  return (
    <TableRow
      className={`bg-muted/20 hover:bg-muted/30 transition-colors ${mutedRow}`}
    >
      {/* Indent indicator */}
      {isVisible("specNo") && <TableCell className={`${cellCls} w-25`}>
        <div className="flex items-center gap-1 text-muted-foreground/50">
          <CornerDownRight className="h-3 w-3 shrink-0" />
          <span className="font-mono text-[11px] text-muted-foreground">
            {subitem.spec_no || "—"}
          </span>
        </div>
      </TableCell>}

      {/* Name */}
      {isVisible("name") && <TableCell className={`${cellCls} max-w-35 truncate`}>
        <span>{subitem.name || "-"}</span>
      </TableCell>}

      {/* Description */}
      {isVisible("description") && <TableCell className={`${cellCls} max-w-50 truncate`}>
        <span>{subitem.description}</span>
      </TableCell>}

      {/* Type */}
      {isVisible("type") && <TableCell className={`${cellCls} w-24`}>
        <Badge variant="outline" className="text-[11px] px-1.5 py-0.5">
          {subitem.type || "—"}
        </Badge>
      </TableCell>}

      {/* Room */}
      {isVisible("room") && <TableCell className={`${cellCls} w-30`}>
        <span className="truncate block">{resolvedRoomName}</span>
      </TableCell>}

      {/* Page — empty */}
      {isVisible("page") && <TableCell className={`${cellCls} w-15 text-center`} />}

      {/* Qty */}
      {isVisible("qty") && <TableCell className={`${cellCls} w-20`}>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full shrink-0",
              subitem.user_entered_qty ? "bg-yellow-400" : "bg-emerald-500",
            )}
            title={
              subitem.user_entered_qty
                ? "User-entered quantity"
                : "System-generated quantity"
            }
          />
          <span>{toDisplayQty(subitem.qty)}</span>
        </div>
      </TableCell>}

      {/* Unit */}
      {isVisible("unit") && <TableCell className={`${cellCls} w-25`}>
        {resolvedUnitName}
      </TableCell>}

      {/* Unit Cost */}
      {isVisible("unitCost") && <TableCell className={`${cellCls} w-25 text-right`}>
        {formatCurrency(subitem.unit_cost)}
      </TableCell>}

      {/* Extended */}
      {isVisible("extended") && <TableCell className={`${cellCls} w-25 text-right font-medium`}>
        <span
          className={
            subitem.hidden_from_total
              ? "line-through text-muted-foreground"
              : ""
          }
        >
          {formatCurrency(subitem.extended)}
        </span>
      </TableCell>}

      {isVisible("vendor") && <TableCell className={`${cellCls} w-30 truncate`} title={subitem.vendor_name}>
        {subitem.vendor_name || "-"}
      </TableCell>}

      {/* Actions */}
      {isVisible("actions") && <TableCell className={`${cellCls} w-37.5 text-right`}>
        <div className="flex items-center justify-end gap-0.5">
          {/* Hide from totals */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title={
              subitem.hidden_from_total
                ? "Show in totals"
                : "Hide from totals"
            }
            onClick={handleToggleHide}
          >
            {subitem.hidden_from_total ? (
              <Eye className="h-3 w-3 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          {/* Edit */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setEditDialogOpen(true)}
            title="Edit sub-item"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
          {/* Detach → promote */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleDetach}
            disabled={detaching}
            title="Promote to top-level item"
          >
            {detaching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUpFromLine className="h-3 w-3 text-blue-400" />
            )}
          </Button>
          {/* Delete */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleDelete}
            disabled={deleting}
            title="Remove sub-item"
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3 text-destructive" />
            )}
          </Button>
        </div>
      </TableCell>}

      <EditBudgetItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onConfirm={async (formData) => {
          try {
            setUpdating(true);
            const payload = {
              spec_no: formData.spec_no,
              name: formData.name || "",
              description: formData.description,
              type: formData.type || "FF&E",
              unit_id: formData.unit_id || null,
              unit_cost:
                formData.unit_cost !== "" ? Number(formData.unit_cost) : null,
              room: formData.room || roomId,
              vendor: formData.vendor || "",
            };

            if (String(formData.qty ?? "").trim() !== String(initialQty ?? "").trim()) {
              payload.qty = formData.qty || "1";
            }

            await onUpdate(subitem._id, {
              ...payload,
            });
            setEditDialogOpen(false);
          } finally {
            setUpdating(false);
          }
        }}
        item={{
          ...subitem,
          room: roomId,
          unit_id: unitId,
        }}
        rooms={rooms}
        vendors={vendors}
        isLoading={updating}
      />
    </TableRow>
  );
}
