import { Checkbox } from "../ui/checkbox"
import { Button } from "../ui/button"

export function BudgetColumnVisibilityControls({
  columns,
  visibility,
  onToggle,
  onReset,
}) {
  const visibleCount = columns.filter((col) => visibility[col.id]).length

  return (
    <div className="rounded-md border bg-card px-3 py-1">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Visible Columns</p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onReset}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-4  md:grid-cols-4 lg:grid-cols-12">
        {columns.map((col) => {
          const checked = !!visibility[col.id]
          const disableUncheck = checked && visibleCount === 1

          return (
            <label key={col.id} className="flex items-center gap-2
            
            text-xs text-foreground">
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(col.id)}
                disabled={disableUncheck}
              />
              <span>{col.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
