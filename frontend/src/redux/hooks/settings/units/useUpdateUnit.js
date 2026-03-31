import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { updateUnit as updateUnitAction } from '../../../actions/settings/unitActions'

export function useUpdateUnit() {
  const dispatch = useDispatch()

  const update = useCallback(
    (id, data) => {
      return dispatch(updateUnitAction({ id, data }))
    },
    [dispatch]
  )

  return { update }
}
