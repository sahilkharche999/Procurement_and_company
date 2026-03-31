import { useEffect, useState } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Pencil, Save, X, Trash2 } from 'lucide-react'

export function UnitRow({
  item,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  const [local, setLocal] = useState({ ...item })

  useEffect(() => {
    setLocal({ ...item })
  }, [item, isEditing])

  return (
    <tr className="border-b hover:bg-muted/40 transition-colors">
      <td className="p-2 align-middle w-56">
        {isEditing ? (
          <Input
            className="h-8"
            value={local.name || ''}
            onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))}
          />
        ) : (
          <span className="font-medium">{item.name}</span>
        )}
      </td>

      <td className="p-2 align-middle">
        {isEditing ? (
          <Input
            className="h-8"
            value={local.description || ''}
            onChange={(e) =>
              setLocal((p) => ({ ...p, description: e.target.value }))
            }
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {item.description || '-'}
          </span>
        )}
      </td>

      <td className="p-2 align-middle w-36 text-right">
        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onSave(item._id, local)}
                title="Save"
              >
                <Save className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onCancel}
                title="Cancel"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onStartEdit(item._id)}
                title="Edit"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(item._id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
