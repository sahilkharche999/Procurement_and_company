import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect } from 'react'
import { fetchAllUnits } from '../../../actions/settings/unitActions'

export function useGetAllUnits() {
  const dispatch = useDispatch()
  const { items, total, search, includeDeleted, loading, error } =
    useSelector((state) => state.unitsSettings)

  const fetch = useCallback(() => {
    dispatch(fetchAllUnits({ search, includeDeleted }))
  }, [dispatch, search, includeDeleted])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    items,
    total,
    search,
    includeDeleted,
    loading,
    error,
    refetch: fetch,
  }
}
