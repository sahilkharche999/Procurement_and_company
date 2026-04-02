import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect } from 'react'
import { fetchAllItemTypes } from '../../../actions/settings/itemTypeActions'

export function useGetAllItemType() {
  const dispatch = useDispatch()
  const { items, total, page, pageSize, search, includeDeleted, loading, error } =
    useSelector((state) => state.itemTypesSettings)

  const fetch = useCallback(() => {
    dispatch(fetchAllItemTypes({ page, pageSize, search, includeDeleted }))
  }, [dispatch, page, pageSize, search, includeDeleted])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    items,
    total,
    page,
    pageSize,
    search,
    includeDeleted,
    loading,
    error,
    refetch: fetch,
  }
}

export const userGetAllItemType = useGetAllItemType
