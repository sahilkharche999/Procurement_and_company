import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect } from 'react'
import { fetchAllItemTypes } from '../../../actions/settings/itemTypeActions'

export function useGetAllItemType() {
  const dispatch = useDispatch()
  const { items, total, page, pageSize, search, loading, error } =
    useSelector((state) => state.itemTypesSettings)

  const fetch = useCallback(() => {
    dispatch(fetchAllItemTypes({ page, pageSize, search }))
  }, [dispatch, page, pageSize, search])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    items,
    total,
    page,
    pageSize,
    search,
    loading,
    error,
    refetch: fetch,
  }
}

export const userGetAllItemType = useGetAllItemType
