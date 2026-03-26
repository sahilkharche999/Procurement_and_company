import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'

export function PriceRegisterPaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
            <div className="text-sm text-muted-foreground">
                Showing {from} to {to} of {total} entries
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Rows per page</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="flex h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                        {[10, 12, 20, 50, 100].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
