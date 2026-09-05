import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { createItemType, fetchAllItemTypes } from '../../../actions/settings/itemTypeActions'

export function useCreateItemType() {
  const dispatch = useDispatch()
  const { search, includeDeleted, loading, error } = useSelector((state) => state.itemTypesSettings)

  const create = useCallback(
    async (data) => {
      const result = await dispatch(createItemType(data))
      if (result?.meta?.requestStatus === 'fulfilled') {
        dispatch(fetchAllItemTypes({ search, includeDeleted }))
      }
      return result
    },
    [dispatch, search, includeDeleted]
  )

  return { create, loading, error }
}

export const userCreateItemType = useCreateItemType
