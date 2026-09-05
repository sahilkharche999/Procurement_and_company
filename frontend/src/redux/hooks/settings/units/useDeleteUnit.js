import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteUnit as deleteUnitAction, fetchAllUnits } from '../../../actions/settings/unitActions'

export function useDeleteUnit() {
  const dispatch = useDispatch()
  const { search, includeDeleted } = useSelector((state) => state.unitsSettings)

  const remove = useCallback(
    async (id) => {
      const result = await dispatch(deleteUnitAction(id))
      if (result?.meta?.requestStatus === 'fulfilled') {
        dispatch(fetchAllUnits({ search, includeDeleted }))
      }
      return result
    },
    [dispatch, search, includeDeleted]
  )

  return { remove }
}
