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
} from '../../../redux/slices/settings/itemTypesSlice'
import { ItemTypeRow } from './ItemTypeRow'
import { useGetAllItemType } from '../../../redux/hooks/settings/itemtype/useGetAllItemType'
import { useCreateItemType } from '../../../redux/hooks/settings/itemtype/useCreateItemType'
import { useUpdateItemType } from '../../../redux/hooks/settings/itemtype/useUpdateItemType'
import { useDeleteItemType } from '../../../redux/hooks/settings/itemtype/useDeleteItemType'

export function ItemTypesTable() {
  const dispatch = useDispatch()
  const { items, total, loading, search, editingRowId, error } = useSelector(
    (state) => state.itemTypesSettings
  )

  useGetAllItemType()
  const { create } = useCreateItemType()
  const { update } = useUpdateItemType()
  const { remove } = useDeleteItemType()

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
    const ok = window.confirm('Delete this item type?')
    if (!ok) return
    await remove(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
          placeholder="Search item types..."
          className="md:max-w-sm"
        />

        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Type
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
                    Loading item types...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  No item types found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              items.map((item) => (
                <ItemTypeRow
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

      <div className="text-sm text-muted-foreground">Total types: {total}</div>

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
            <DialogTitle>Add Item Type</DialogTitle>
            <DialogDescription>
              Create a custom item type (for example: FF&E, OFCI, Procurement, Owner Supplied).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. FF&E"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe this type"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
