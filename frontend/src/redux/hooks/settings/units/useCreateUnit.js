import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { createUnit as createUnitAction } from '../../../actions/settings/unitActions'

export function useCreateUnit() {
  const dispatch = useDispatch()

  const create = useCallback(
    (data) => {
      return dispatch(createUnitAction(data))
    },
    [dispatch]
  )

  return { create }
}
