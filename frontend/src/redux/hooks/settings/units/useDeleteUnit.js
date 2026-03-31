import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { deleteUnit as deleteUnitAction } from '../../../actions/settings/unitActions'

export function useDeleteUnit() {
  const dispatch = useDispatch()

  const remove = useCallback(
    (id) => {
      return dispatch(deleteUnitAction(id))
    },
    [dispatch]
  )

  return { remove }
}
