import { useEffect, Fragment, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";

import { useGetBudgetItems } from "../../redux/hooks/budget/useGetBudgetItems";
import { useCreateBudgetItem } from "../../redux/hooks/budget/useCreateBudgetItem";
import { useUpdateBudgetItem } from "../../redux/hooks/budget/useUpdateBudgetItem";
import { useDeleteBudgetItem } from "../../redux/hooks/budget/useDeleteBudgetItem";
import { useSubItems } from "../../redux/hooks/budget/useSubItems";
import { useGetRooms } from "../../redux/hooks/project/useGetRooms";
import { useGetAllVendors } from "../../redux/hooks/vendors/useGetAllVendors";
import {
  setEditingRowId,
  setSearch,
  setPage,
  setPageSize,
  setRoomFilter,
  setGroupByPage,
  setGroupByRoom,
  setSection,
  setProjectId as setProjectIdAction,
} from "../../redux/slices/budgetSlice";

import { BudgetRow } from "./BudgetRow";
import { PaginationControls } from "./PaginationControls";
import { SearchInput } from "./SearchInput";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { CreateBudgetItemDialog } from "./CreateBudgetItemDialog";
import { BudgetColumnVisibilityControls } from "./BudgetColumnVisibilityControls";
import { ExportFileNameDialog } from "./ExportFileNameDialog";
import {
  BUDGET_TABLE_COLUMNS,
  getDefaultColumnVisibility,
} from "./budgetColumns";
import { formatCurrency } from "../../lib/utils";
import { exportToExcel, exportToPdf } from "./exportBudget";

/**
 * BudgetTable — requires a projectId prop (MongoDB _id string of the project).
 */
export function BudgetTable({ projectId: propProjectId, refreshKey }) {
  const dispatch = useDispatch();
  const {
    editingRowId,
    search,
    roomFilter,
    groupByPage,
    groupByRoom,
    section,
    projectId,
  } = useSelector((state) => state.budget);
  const effectiveProjectId = propProjectId || projectId || null;

  const {
    items,
    total,
    page,
    pageSize,
    totalSubtotal,
    roomTotals,
    loading,
    error,
    refetch,
  } = useGetBudgetItems();
  const { create } = useCreateBudgetItem();
  const { update } = useUpdateBudgetItem();
  const { remove } = useDeleteBudgetItem();
  const { addSub, updateSub, deleteSub, detachSub, assignSub } = useSubItems();
  const { rooms, loading: roomsLoading, error: roomsError, fetchRooms, createRoom } = useGetRooms(effectiveProjectId);
  const { vendors } = useGetAllVendors();
  const [exporting, setExporting] = useState(null);
  const [createRoomDialogOpen, setCreateRoomDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(
    getDefaultColumnVisibility,
  );
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  const [sortOrder, setSortOrder] = useState(null); // null, 'asc', 'desc'

  const sortedItems = useMemo(() => {
    if (!sortOrder) return items;
    return [...items].sort((a, b) => {
      const valA = String(a.spec_no || "");
      const valB = String(b.spec_no || "");
      if (sortOrder === "asc") {
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
  }, [items, sortOrder]);

  const toggleSort = () => {
    if (sortOrder === null) setSortOrder("asc");
    else if (sortOrder === "asc") setSortOrder("desc");
    else setSortOrder(null);
  };

  const visibleColumnIds = BUDGET_TABLE_COLUMNS.filter(
    (col) => columnVisibility[col.id],
  ).map((col) => col.id);
  const visibleColumnCount = Math.max(visibleColumnIds.length, 1);
  const hasColumn = (columnId) => visibleColumnIds.includes(columnId);

  const handleToggleColumn = (columnId) => {
    setColumnVisibility((prev) => {
      const currentlyVisible = BUDGET_TABLE_COLUMNS.filter(
        (col) => prev[col.id],
      ).length;
      if (prev[columnId] && currentlyVisible <= 1) return prev;
      return { ...prev, [columnId]: !prev[columnId] };
    });
  };

  const handleResetColumns = () => {
    setColumnVisibility(getDefaultColumnVisibility());
  };

  // Sync projectId from prop into Redux and fetch rooms
  useEffect(() => {
    if (effectiveProjectId) {
      dispatch(setProjectIdAction(effectiveProjectId));
    }
  }, [effectiveProjectId, dispatch]);

  // Fetch rooms when projectId is set
  useEffect(() => {
    if (effectiveProjectId) {
      fetchRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProjectId]);

  // Re-fetch items whenever the parent signals a refresh (e.g. after budget generation)
  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Handlers
  const handleStartEdit = (id) => dispatch(setEditingRowId(id));

  const handleSave = async (id, data) => {
    // Strip non-updatable fields
    const {
      _id,
      __v,
      section: _s,
      order_index: _oi,
      subitems: _sub,
      created_at: _ca,
      updated_at: _ua,
      project_id: _pid,
      ...updateData
    } = data;
    await update(id, updateData);
    dispatch(setEditingRowId(null));
    refetch();
  };

  const handleCancel = () => dispatch(setEditingRowId(null));

  const handleDelete = async (id) => {
    await remove(id);
  };

  const handleInsert = async (relativeToId, position) => {
    const newItem = {
      section,
      insert_relative_to: relativeToId,
      position,
      created_by: "user",
    };
    const result = await create(newItem);
    if (!result.error) {
      dispatch(setEditingRowId(result.payload._id));
      refetch();
    }
  };

  const handleCreateNew = () => {
    setCreateItemDialogOpen(true);
  };

  const handleToggleHide = async (id) => {
    const item = items.find((i) => i._id === id);
    if (!item) return;
    await update(id, { hidden_from_total: !item.hidden_from_total });
    refetch();
  };

  const handleSearchChange = (val) => dispatch(setSearch(val));
  const handlePageChange = (p) => dispatch(setPage(p));
  const handlePageSizeChange = (size) => dispatch(setPageSize(size));

  const handleToggleRoomFilter = (roomId) => {
    let newFilter = [...(roomFilter || [])];
    if (newFilter.includes(roomId)) {
      newFilter = newFilter.filter((id) => id !== roomId);
    } else {
      newFilter.push(roomId);
    }
    dispatch(setRoomFilter(newFilter));
  };

  const toggleGroupByPage = (v) => dispatch(setGroupByPage(v));
  const toggleGroupByRoom = (v) => dispatch(setGroupByRoom(v));

  // Export
  const handleExportClick = (format) => {
    setExportFormat(format);
    setIsExportDialogOpen(true);
  };

  const handleConfirmExport = async (fileName) => {
    if (!projectId) return;
    const format = exportFormat;
    setExporting(format);
    try {
      if (format === "excel") {
        await exportToExcel({
          projectId,
          section,
          groupByRoom,
          groupByPage,
          columnVisibility,
          fileName,
        });
      } else {
        // PDF still uses old way for now, or you can update it too.
        await exportToPdf(projectId, section, groupByRoom, groupByPage);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(null);
      setExportFormat(null);
    }
  };

  const renderSubtotalRow = (key, label, total, toneClassName) => {
    if (!hasColumn("extended")) {
      return (
        <TableRow key={key} className={toneClassName}>
          <TableCell colSpan={visibleColumnCount} className="py-2 px-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    const extendedIndex = visibleColumnIds.indexOf("extended");
    const beforeCount = Math.max(extendedIndex, 0);
    const afterCount = Math.max(visibleColumnCount - extendedIndex - 1, 0);

    return (
      <TableRow key={key} className={toneClassName}>
        {beforeCount > 0 && (
          <TableCell colSpan={beforeCount} className="py-2 pl-3 text-sm text-muted-foreground">
            {label}
          </TableCell>
        )}
        <TableCell className="py-2 pr-3 text-right font-bold text-primary text-sm">
          {formatCurrency(total)}
        </TableCell>
        {afterCount > 0 && <TableCell colSpan={afterCount} />}
      </TableRow>
    );
  };

  // ── Group headers + room subtotals ────────────────────────────────────────
  const buildRows = () => {
    const rows = [];
    let lastGroupKey = null;
    let lastTotal = null;

    sortedItems.forEach((item, idx) => {
      if (groupByPage) {
        const key = item.page_no;
        if (key !== lastGroupKey) {
          if (lastGroupKey !== null && lastTotal !== null) {
            rows.push(
              renderSubtotalRow(
                `subtotal-page-${lastGroupKey}`,
                `Page ${lastGroupKey} — Subtotal`,
                lastTotal,
                "bg-muted/40 border-t-2 font-semibold",
              ),
            );
          }
          rows.push(
            <TableRow
              key={`header-page-${key}`}
              className="bg-muted/60 hover:bg-muted/60"
            >
              <TableCell colSpan={visibleColumnCount} className="py-2 pl-3">
                <Badge variant="secondary" className="text-xs">
                  Page {key ?? "N/A"}
                </Badge>
              </TableCell>
            </TableRow>,
          );
          lastGroupKey = key;
          lastTotal = 0;
        }
        if (!item.hidden_from_total) lastTotal += item.extended || 0;
        if (Array.isArray(item.subitems)) {
          item.subitems.forEach((sub) => {
            if (!sub?.hidden_from_total) {
              lastTotal += sub?.extended || 0;
            }
          });
        }
      } else if (groupByRoom) {
        const roomId = typeof item.room === "object" ? item.room?._id : item.room;
        const roomObj = rooms.find((r) => r._id === roomId);
        const key =
          item.room_name ||
          (typeof item.room === "object" ? item.room?.name : null) ||
          roomObj?.name ||
          "Unknown Room";
        if (key !== lastGroupKey) {
          rows.push(
            <TableRow
              key={`header-room-${key}`}
              className="bg-muted/60 hover:bg-muted/60"
            >
              <TableCell colSpan={visibleColumnCount} className="py-2 pl-3">
                <Badge variant="secondary" className="text-xs">
                  {key}
                </Badge>
              </TableCell>
            </TableRow>,
          );
          lastGroupKey = key;
          lastTotal = roomTotals[key] ?? null;
        }
      }

      rows.push(
        <BudgetRow
          key={item._id}
          item={item}
          isEditing={editingRowId === item._id}
          onStartEdit={handleStartEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onInsert={handleInsert}
          onToggleHide={handleToggleHide}
          onAddSubItem={addSub}
          onUpdateSubItem={updateSub}
          onDeleteSubItem={deleteSub}
          onDetachSubItem={detachSub}
          onAssignSubItem={assignSub}
          rootItems={items}
          rooms={rooms}
          vendors={vendors}
          visibleColumns={columnVisibility}
        />,
      );
    });

    // Final group subtotal
    if (groupByPage && lastGroupKey !== null && lastTotal !== null) {
      rows.push(
        renderSubtotalRow(
          `subtotal-page-${lastGroupKey}-last`,
          `Page ${lastGroupKey} — Subtotal`,
          lastTotal,
          "bg-muted/40 border-t-2 font-semibold",
        ),
      );
    }
    if (groupByRoom) {
      const uniqueRooms = [
        ...new Set(
          items.map(
            (i) =>
              i.room_name ||
              (typeof i.room === "object" ? i.room?.name : null) ||
              rooms.find((r) => r._id === (typeof i.room === "object" ? i.room?._id : i.room))?.name ||
              "Unknown Room",
          ),
        ),
      ];
      uniqueRooms.forEach((room) => {
        if (roomTotals[room] != null) {
          rows.push(
            renderSubtotalRow(
              `subtotal-room-${room}`,
              `${room} — Merchandise Total`,
              roomTotals[room],
              "bg-primary/5 border-t-2 font-semibold",
            ),
          );
        }
      });
    }

    return rows;
  };

  if (!effectiveProjectId) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No project selected. Open a project to view its budget.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="group-page"
              checked={groupByPage}
              onCheckedChange={toggleGroupByPage}
              disabled={loading}
            />
            <label
              htmlFor="group-page"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Group by Page
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="group-room"
              checked={groupByRoom}
              onCheckedChange={toggleGroupByRoom}
              disabled={loading}
            />
            <label
              htmlFor="group-room"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Group by Room
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Total Budget:
            </span>
            <span className="text-xl font-bold">
              {formatCurrency(totalSubtotal)}
            </span>
          </div>
          <div className="h-6 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
                disabled={exporting != null || loading}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleExportClick("excel");
                }}
                className="gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Export as Excel</span>
                {exporting === "excel" && (
                  <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleExportClick("pdf");
                }}
                className="gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-red-500" />
                <span>Export as PDF</span>
                {exporting === "pdf" && (
                  <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by Spec No..."
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter Rooms
                {roomFilter?.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1 py-0 h-4 text-[10px] min-w-4 flex items-center justify-center rounded-full"
                  >
                    {roomFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {rooms.map((room) => (
                <DropdownMenuCheckboxItem
                  key={room._id}
                  checked={(roomFilter || []).includes(room._id)}
                  onCheckedChange={() => handleToggleRoomFilter(room._id)}
                >
                  {room.name || "Unnamed Room"}
                </DropdownMenuCheckboxItem>
              ))}
              {rooms.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground italic">
                  No rooms available
                </div>
              )}
              <DropdownMenuSeparator />
              <button
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-primary font-medium focus:bg-accent"
                onClick={() => setCreateRoomDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Room...
              </button>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleCreateNew}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <BudgetColumnVisibilityControls
        columns={BUDGET_TABLE_COLUMNS}
        visibility={columnVisibility}
        onToggle={handleToggleColumn}
        onReset={handleResetColumns}
      />

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {BUDGET_TABLE_COLUMNS.filter((col) => columnVisibility[col.id]).map((col) => (
                <TableHead key={col.id} className={col.headerClassName}>
                  {col.id === "specNo" ? (
                    <div
                      className="flex items-center gap-1 cursor-pointer select-none group"
                      onClick={toggleSort}
                    >
                      <span>{col.label}</span>
                      {sortOrder === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                      ) : sortOrder === "desc" ? (
                        <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
                  No budget items found.
                </TableCell>
              </TableRow>
            )}
            {buildRows()}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
      {/* Modals & Dialogs */}
      <CreateRoomDialog
        open={createRoomDialogOpen}
        onOpenChange={setCreateRoomDialogOpen}
        onCreateRoom={createRoom}
      />
      <CreateBudgetItemDialog
        open={createItemDialogOpen}
        onOpenChange={setCreateItemDialogOpen}
        onConfirm={async (formData) => {
          const newItem = {
            spec_no: formData.spec_no || "",
            name: formData.name || "",
            description: formData.description,
            type: formData.type || "FF&E",
            qty: formData.qty || "1",
            unit_id: formData.unit_id || null,
            unit_cost: parseFloat(formData.unit_cost) || 0,
            room: formData.room || "",
            vendor: formData.vendor || "",
            created_by: "user",
          };
          const result = await create(newItem);
          if (!result.error) {
            dispatch(setEditingRowId(result.payload._id));
            refetch();
            setCreateItemDialogOpen(false);
          }
        }}
        title="Add New Budget Item"
        description="Fill in the details for the new budget item."
        rooms={rooms}
        vendors={vendors}
        isSubItem={false}
        isLoading={false}
      />
      <ExportFileNameDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onConfirm={handleConfirmExport}
        defaultName={`budget_${section}_${new Date().toISOString().slice(0, 10)}`}
      />
    </div>
  );
}
