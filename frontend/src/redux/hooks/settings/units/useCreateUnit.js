import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createUnit as createUnitAction, fetchAllUnits } from '../../../actions/settings/unitActions'

export function useCreateUnit() {
  const dispatch = useDispatch()
  const { page, pageSize, search, includeDeleted } = useSelector((state) => state.unitsSettings)

  const create = useCallback(
    (data) => {
      return dispatch(createUnitAction(data)).then((result) => {
        if (result?.meta?.requestStatus === 'fulfilled') {
          dispatch(fetchAllUnits({ page, pageSize, search, includeDeleted }))
        }
        return result
      })
    },
    [dispatch, page, pageSize, search, includeDeleted]
  )

  return { create }
}
