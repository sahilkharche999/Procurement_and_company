import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect } from 'react'
import { fetchAllUnits } from '../../../actions/settings/unitActions'

export function useGetAllUnits() {
  const dispatch = useDispatch()
  const { items, total, page, pageSize, search, loading, error } =
    useSelector((state) => state.unitsSettings)

  const fetch = useCallback(() => {
    dispatch(fetchAllUnits({ page, pageSize, search }))
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
