import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { deleteItemType, fetchAllItemTypes } from '../../../actions/settings/itemTypeActions'

export function useDeleteItemType() {
  const dispatch = useDispatch()
  const { page, pageSize, search, includeDeleted, loading, error } = useSelector((state) => state.itemTypesSettings)

  const remove = useCallback(
    async (id) => {
      const result = await dispatch(deleteItemType(id))
      if (result?.meta?.requestStatus === 'fulfilled') {
        dispatch(fetchAllItemTypes({ page, pageSize, search, includeDeleted }))
      }
      return result
    },
    [dispatch, page, pageSize, search, includeDeleted]
  )

  return { remove, loading, error }
}

export const userDeleteItemType = useDeleteItemType
