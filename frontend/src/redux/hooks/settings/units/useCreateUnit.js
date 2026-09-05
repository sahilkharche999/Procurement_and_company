import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createUnit as createUnitAction, fetchAllUnits } from '../../../actions/settings/unitActions'

export function useCreateUnit() {
  const dispatch = useDispatch()
  const { search, includeDeleted } = useSelector((state) => state.unitsSettings)

  const create = useCallback(
    (data) => {
      return dispatch(createUnitAction(data)).then((result) => {
        if (result?.meta?.requestStatus === 'fulfilled') {
          dispatch(fetchAllUnits({ search, includeDeleted }))
        }
        return result
      })
    },
    [dispatch, search, includeDeleted]
  )

  return { create }
}
