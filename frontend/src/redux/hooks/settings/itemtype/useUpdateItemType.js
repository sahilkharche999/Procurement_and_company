import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { updateItemType } from '../../../actions/settings/itemTypeActions'

export function useUpdateItemType() {
  const dispatch = useDispatch()
  const { loading, error } = useSelector((state) => state.itemTypesSettings)

  const update = useCallback(
    async (id, data) => {
      const result = await dispatch(updateItemType({ id, data }))
      return result
    },
    [dispatch]
  )

  return { update, loading, error }
}

export const userUpdateItemType = useUpdateItemType
