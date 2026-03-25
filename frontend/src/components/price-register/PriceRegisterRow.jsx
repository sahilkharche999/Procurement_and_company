import { useEffect, useState } from 'react'
import { Pencil, Save, X, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function PriceRegisterRow({ item, isEditing, onStartEdit, onCancel, onSave, onDelete }) {
    const [localItem, setLocalItem] = useState({ ...item })

    useEffect(() => {
        setLocalItem({ ...item })
    }, [item, isEditing])

    const handleChange = (field, value) => {
        setLocalItem((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        onSave(item._id, {
            ...localItem,
            price: Number(localItem.price || 0),
            extended_price: Number(localItem.extended_price || 0),
        })
    }

    return (
        <tr className={`border-b transition-colors hover:bg-muted/50 ${isEditing ? 'bg-muted/30 ring-1 ring-inset ring-muted-foreground/20' : ''}`}>
            <td className="p-2 align-middle min-w-45">
                {isEditing ? (
                    <Input
                        value={localItem.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="h-8"
                    />
                ) : (
                    <span className="font-medium">{item.name}</span>
                )}
            </td>

            <td className="p-2 align-middle min-w-30">
                {isEditing ? (
                    <Input
                        value={localItem.code || ''}
                        onChange={(e) => handleChange('code', e.target.value)}
                        className="h-8"
                    />
                ) : (
                    item.code || '-'
                )}
            </td>

            <td className="p-2 align-middle w-30">
                {isEditing ? (
                    <select
                        value={localItem.type || 'FF&E'}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                        <option value="FF&E">FF&E</option>
                        <option value="OFCI">OFCI</option>
                    </select>
                ) : (
                    item.type
                )}
            </td>

            <td className="p-2 align-middle min-w-65 max-w-90">
                {isEditing ? (
                    <Input
                        value={localItem.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="h-8"
                    />
                ) : (
                    <span className="truncate block" title={item.description}>{item.description || '-'}</span>
                )}
            </td>

            <td className="p-2 align-middle w-30 text-right">
                {isEditing ? (
                    <Input
                        type="number"
                        step="0.01"
                        value={localItem.price ?? 0}
                        onChange={(e) => handleChange('price', e.target.value)}
                        className="h-8 text-right"
                    />
                ) : (
                    Number(item.price || 0).toFixed(2)
                )}
            </td>

            <td className="p-2 align-middle w-35 text-right">
                {isEditing ? (
                    <Input
                        type="number"
                        step="0.01"
                        value={localItem.extended_price ?? 0}
                        onChange={(e) => handleChange('extended_price', e.target.value)}
                        className="h-8 text-right"
                    />
                ) : (
                    Number(item.extended_price || 0).toFixed(2)
                )}
            </td>

            <td className="p-2 align-middle w-40">
                <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
                                <Save className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
                                <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStartEdit(item._id)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(item._id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </td>
        </tr>
    )
}
