import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowDownAZ, ArrowUpAZ, Loader2, PlusCircle } from 'lucide-react'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
    setEditingRowId,
    setPage,
    setPageSize,
    setSearch,
    setSortOrder,
} from '../../redux/slices/itemsSlice'
import { useGetItems } from '../../redux/hooks/items/useGetItems'
import { useCreateItem } from '../../redux/hooks/items/useCreateItem'
import { useUpdateItem } from '../../redux/hooks/items/useUpdateItem'
import { useDeleteItem } from '../../redux/hooks/items/useDeleteItem'
import { PriceRegisterSearchInput } from './PriceRegisterSearchInput'
import { PriceRegisterPaginationControls } from './PriceRegisterPaginationControls'
import { PriceRegisterRow } from './PriceRegisterRow'

const DEFAULT_NEW_ITEM = {
    name: '',
    code: '',
    type: 'FF&E',
    description: '',
    price: 0,
    extended_price: 0,
}

export function PriceRegisterTable() {
    const dispatch = useDispatch()
    const {
        items,
        total,
        page,
        pageSize,
        search,
        sortOrder,
        loading,
        error,
        refetch,
    } = useGetItems()
    const { create } = useCreateItem()
    const { update } = useUpdateItem()
    const { remove } = useDeleteItem()
    const { editingRowId } = useSelector((state) => state.items)

    const [newItem, setNewItem] = useState(DEFAULT_NEW_ITEM)
    const [creating, setCreating] = useState(false)

    const handleCreate = async () => {
        if (!newItem.name.trim()) return
        setCreating(true)
        const payload = {
            ...newItem,
            name: newItem.name.trim(),
            code: newItem.code.trim(),
            description: newItem.description.trim(),
            price: Number(newItem.price || 0),
            extended_price: Number(newItem.extended_price || 0),
        }
        const result = await create(payload)
        if (!result.error) {
            setNewItem(DEFAULT_NEW_ITEM)
            dispatch(setEditingRowId(null))
        }
        setCreating(false)
    }

    const handleSave = async (id, data) => {
        const {
            _id,
            created_at,
            updated_at,
            ...updatePayload
        } = data
        await update(id, updatePayload)
        dispatch(setEditingRowId(null))
        refetch()
    }

    const handleDelete = async (id) => {
        await remove(id)
    }

    const toggleNameSort = () => {
        dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'))
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <PriceRegisterSearchInput
                    value={search}
                    onChange={(value) => dispatch(setSearch(value))}
                />

                <Button
                    variant="outline"
                    onClick={toggleNameSort}
                    className="gap-2"
                    disabled={loading}
                >
                    {sortOrder === 'asc' ? (
                        <ArrowDownAZ className="h-4 w-4" />
                    ) : (
                        <ArrowUpAZ className="h-4 w-4" />
                    )}
                    Sort by Name ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                </Button>
            </div>

            <div className="rounded-md border bg-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <Input
                        placeholder="Name *"
                        value={newItem.name}
                        onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
                    />
                    <Input
                        placeholder="Code"
                        value={newItem.code}
                        onChange={(e) => setNewItem((s) => ({ ...s, code: e.target.value }))}
                    />
                    <select
                        value={newItem.type}
                        onChange={(e) => setNewItem((s) => ({ ...s, type: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="FF&E">FF&E</option>
                        <option value="OFCI">OFCI</option>
                    </select>
                    <Input
                        placeholder="Description"
                        value={newItem.description}
                        onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))}
                    />
                    <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={newItem.price}
                        onChange={(e) => setNewItem((s) => ({ ...s, price: e.target.value }))}
                    />
                    <Input
                        type="number"
                        step="0.01"
                        placeholder="Extended Price"
                        value={newItem.extended_price}
                        onChange={(e) => setNewItem((s) => ({ ...s, extended_price: e.target.value }))}
                    />
                </div>

                <div className="mt-3 flex justify-end">
                    <Button onClick={handleCreate} className="gap-2" disabled={creating || loading}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        Create Record
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-45">Name</TableHead>
                            <TableHead className="min-w-30">Code</TableHead>
                            <TableHead className="w-30">Type</TableHead>
                            <TableHead className="min-w-65">Description</TableHead>
                            <TableHead className="w-30 text-right">Price</TableHead>
                            <TableHead className="w-35 text-right">Extended Price</TableHead>
                            <TableHead className="w-40 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No records found.
                                </TableCell>
                            </TableRow>
                        )}

                        {items.map((item) => (
                            <PriceRegisterRow
                                key={item._id}
                                item={item}
                                isEditing={editingRowId === item._id}
                                onStartEdit={(id) => dispatch(setEditingRowId(id))}
                                onCancel={() => dispatch(setEditingRowId(null))}
                                onSave={handleSave}
                                onDelete={handleDelete}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>

            <PriceRegisterPaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => dispatch(setPage(p))}
                onPageSizeChange={(size) => dispatch(setPageSize(size))}
            />
        </div>
    )
}
