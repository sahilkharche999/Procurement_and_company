export const BUDGET_TABLE_COLUMNS = [
  { id: "specNo", label: "Spec No", headerClassName: "w-[100px]" },
  { id: "description", label: "Description", headerClassName: "max-w-[200px]" },
  { id: "type", label: "Type", headerClassName: "w-24" },
  { id: "room", label: "Room", headerClassName: "w-[120px]" },
  { id: "page", label: "Page", headerClassName: "w-[60px] text-center" },
  { id: "qty", label: "Qty", headerClassName: "w-[80px]" },
  { id: "unit", label: "Unit", headerClassName: "w-[100px]" },
  { id: "unitCost", label: "Unit Cost", headerClassName: "w-[100px] text-right" },
  { id: "extended", label: "Extended", headerClassName: "w-[100px] text-right" },
  { id: "vendor", label: "Vendor", headerClassName: "w-[120px]" },
  { id: "actions", label: "Actions", headerClassName: "w-[150px] text-right" },
]

export function getDefaultColumnVisibility() {
  return BUDGET_TABLE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = true
    return acc
  }, {})
}
