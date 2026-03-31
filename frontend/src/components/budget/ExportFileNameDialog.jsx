
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function ExportFileNameDialog({ open, onOpenChange, onConfirm, defaultName = 'budget_export' }) {
  const [fileName, setFileName] = useState(defaultName)

  const handleConfirm = () => {
    if (!fileName.trim()) return
    onConfirm(fileName.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter File Name</DialogTitle>
          <DialogDescription>
            Type the name of the Excel file you want to download.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="File name"
            className="flex-1"
          />
          <span className="text-sm font-medium text-muted-foreground">.xlsx</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
