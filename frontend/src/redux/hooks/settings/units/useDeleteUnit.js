import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteUnit as deleteUnitAction, fetchAllUnits } from '../../../actions/settings/unitActions'

export function useDeleteUnit() {
  const dispatch = useDispatch()
  const { page, pageSize, search, includeDeleted } = useSelector((state) => state.unitsSettings)

  const remove = useCallback(
    async (id) => {
      const result = await dispatch(deleteUnitAction(id))
      if (result?.meta?.requestStatus === 'fulfilled') {
        dispatch(fetchAllUnits({ page, pageSize, search, includeDeleted }))
      }
      return result
    },
    [dispatch, page, pageSize, search, includeDeleted]
  )

  return { remove }
}
