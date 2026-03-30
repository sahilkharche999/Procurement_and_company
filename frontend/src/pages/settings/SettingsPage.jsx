
import { Link } from 'react-router-dom'
import { SlidersHorizontal, ChevronRight } from 'lucide-react'

export function SettingsPage() {
    return (
        <div className="flex flex-col space-y-6 p-6 lg:p-8 max-w-300 mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure app preferences and master data.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                    to="/settings/item-types"
                    className="group rounded-lg border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <SlidersHorizontal className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">Item Types</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Manage customizable item types like FF&E, OFCI, and more.
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                </Link>
            </div>
        </div>
    )
}
