import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  SelectRoot,
  SelectContent,
  SelectItem,
} from '../ui/select'
import { useGetAllItemType } from '../../redux/hooks/settings/itemtype/useGetAllItemType'

export function EditBudgetItemDialog({
  open,
  onOpenChange,
  onConfirm,
  item = {},
  rooms = [],
  vendors = [],
  isLoading = false,
}) {
  const { items: itemTypes } = useGetAllItemType()

  const [formData, setFormData] = useState({
    spec_no: '',
    description: '',
    qty: '1',
    unit_cost: '',
    room: '',
    type: 'FF&E',
    vendor: '',
  })

  const typeOptions = useMemo(() => {
    const fromSettings = itemTypes
      .map((t) => String(t?.name || '').trim())
      .filter(Boolean)

    const currentType = String(formData.type || '').trim()
    const defaults = ['FF&E', 'OFCI']

    const merged = [...fromSettings, ...defaults]
    if (currentType) merged.push(currentType)

    return Array.from(new Set(merged))
  }, [itemTypes, formData.type])

  useEffect(() => {
    if (open && item._id) {
      setFormData({
        spec_no: item.spec_no || '',
        description: item.description || '',
        qty: item.qty || '1',
        unit_cost: item.unit_cost || '',
        room: item.room || '',
        type: item.type || 'FF&E',
        vendor: item.vendor || '',
      })
    }
  }, [open, item])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.description && !formData.spec_no) {
      alert('Please enter at least a description or spec number')
      return
    }

    // For main items, room is required
    if (!formData.room) {
      alert('Please select a room')
      return
    }

    await onConfirm(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Budget Item</DialogTitle>
          <DialogDescription>Update the details for this budget item.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Spec No */}
          <div>
            <label className="text-sm font-medium block mb-1">Spec No</label>
            <Input
              value={formData.spec_no}
              onChange={(e) => handleChange('spec_no', e.target.value)}
              placeholder="e.g., ITEM-001"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium block mb-1">
              Description <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter item description"
              disabled={isLoading}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium block mb-1">Type</label>
            <SelectRoot value={formData.type} onChange={(e) => handleChange('type', e.target.value)} disabled={isLoading}>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectRoot>
          </div>

          {/* Qty */}
          <div>
            <label className="text-sm font-medium block mb-1">Quantity</label>
            <Input
              type="number"
              step="0.01"
              value={formData.qty}
              onChange={(e) => handleChange('qty', e.target.value)}
              placeholder="1"
              disabled={isLoading}
            />
          </div>

          {/* Unit Cost */}
          <div>
            <label className="text-sm font-medium block mb-1">Unit Cost</label>
            <Input
              type="number"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => handleChange('unit_cost', e.target.value)}
              placeholder="0.00"
              disabled={isLoading}
            />
          </div>

          {/* Room */}
          <div>
            <label className="text-sm font-medium block mb-1">
              Room <span className="text-destructive">*</span>
            </label>
            <SelectRoot value={formData.room} onChange={(e) => handleChange('room', e.target.value)} disabled={isLoading || rooms.length === 0}>
              <SelectItem value="">
                {rooms.length === 0 ? 'No rooms available' : 'Select a room'}
              </SelectItem>
              {rooms.length > 0 && rooms.map((room) => (
                <SelectItem key={room._id} value={room._id}>
                  {room.name || room._id}
                </SelectItem>
              ))}
            </SelectRoot>
            {rooms.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Please create a room first</p>
            )}
          </div>

          {/* Vendor */}
          <div>
            <label className="text-sm font-medium block mb-1">Vendor</label>
            <SelectRoot value={formData.vendor} onChange={(e) => handleChange('vendor', e.target.value)} disabled={isLoading}>
              <SelectItem value="">Select a vendor</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v._id} value={v._id}>
                  {v.company_name}
                </SelectItem>
              ))}
            </SelectRoot>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
