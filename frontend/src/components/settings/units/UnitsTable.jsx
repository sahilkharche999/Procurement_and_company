import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Loader2 } from 'lucide-react'

import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'

import {
  setEditingRowId,
  setSearch,
} from '../../../redux/slices/settings/unitsSlice'
import { UnitRow } from './UnitRow'
import { useGetAllUnits } from '../../../redux/hooks/settings/units/useGetAllUnits'
import { useCreateUnit } from '../../../redux/hooks/settings/units/useCreateUnit'
import { useUpdateUnit } from '../../../redux/hooks/settings/units/useUpdateUnit'
import { useDeleteUnit } from '../../../redux/hooks/settings/units/useDeleteUnit'

export function UnitsTable() {
  const dispatch = useDispatch()
  const { items, total, loading, search, editingRowId, error } = useSelector(
    (state) => state.unitsSettings
  )

  useGetAllUnits()
  const { create } = useCreateUnit()
  const { update } = useUpdateUnit()
  const { remove } = useDeleteUnit()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const result = await create({
      name: newName.trim(),
      description: newDescription.trim(),
    })
    if (result?.meta?.requestStatus === 'fulfilled') {
      setNewName('')
      setNewDescription('')
      setCreateDialogOpen(false)
    }
  }

  const handleSave = async (id, local) => {
    const payload = {
      name: String(local.name || '').trim(),
      description: String(local.description || '').trim(),
    }
    if (!payload.name) return

    const result = await update(id, payload)
    if (result?.meta?.requestStatus === 'fulfilled') {
      dispatch(setEditingRowId(null))
    }
  }

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this unit?')
    if (!ok) return
    await remove(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
          placeholder="Search units..."
          className="md:max-w-sm"
        />

        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading units...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  No units found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              items.map((item) => (
                <UnitRow
                  key={item._id}
                  item={item}
                  isEditing={editingRowId === item._id}
                  onStartEdit={(id) => dispatch(setEditingRowId(id))}
                  onSave={handleSave}
                  onCancel={() => dispatch(setEditingRowId(null))}
                  onDelete={handleDelete}
                />
              ))}
          </TableBody>
        </Table>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {String(error)}
        </div>
      )}

      <div className="text-sm text-muted-foreground">Total units: {total}</div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) {
            setNewName('')
            setNewDescription('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Unit</DialogTitle>
            <DialogDescription>
              Create a custom unit (for example: Each, Yard, Meter, Square Feet, Linear Foot).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Each"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe this unit"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
