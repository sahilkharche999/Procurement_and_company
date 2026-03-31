import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { ItemTypesTable } from '../../../components/settings/item-type/ItemTypesTable'

export function ItemTypesSettingsPage() {
  return (
    <div className="flex flex-col space-y-6 p-6 lg:p-8 max-w-350 mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Item Types Settings</h1>
            <p className="text-sm text-muted-foreground">
              Create, update, and remove configurable item types.
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="gap-2">
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <ItemTypesTable />
    </div>
  )
}
