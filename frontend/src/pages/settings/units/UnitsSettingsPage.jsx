import { AlertCircle, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '../../../components/ui/button'
import { Switch } from '../../../components/ui/switch'
import { UnitsTable } from '../../../components/settings/units/UnitsTable'
import { setIncludeDeleted } from '../../../redux/slices/settings/unitsSlice'

export function UnitsSettingsPage() {
  const dispatch = useDispatch()
  const includeDeleted = useSelector((state) => state.unitsSettings.includeDeleted)

  return (
    <div className="flex flex-col space-y-6 p-6 lg:p-8 max-w-350 mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Units Settings</h1>
            <p className="text-sm text-muted-foreground">
              Create, update, and remove configurable units.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-md border px-3 py-2 ">
            <div className="flex flex-col leading-tight">
              <label htmlFor="include-deleted-units" className="text-sm font-medium text-foreground">
                show deleted
              </label>
           
            </div>
            <Switch
              id="include-deleted-units"
              checked={!!includeDeleted}
              onCheckedChange={(checked) => dispatch(setIncludeDeleted(checked))}
            />
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link to="/settings">
              <AlertCircle className="h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
        </div>
      </div>

      <UnitsTable />
    </div>
  )
}
