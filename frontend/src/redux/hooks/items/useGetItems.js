import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect } from 'react'
import { fetchItems } from '../../actions/items/itemActions'

export function useGetItems() {
    const dispatch = useDispatch()
    const { items, total, search, sortBy, sortOrder, loading, error } =
        useSelector((state) => state.items)

    const fetch = useCallback(() => {
        dispatch(fetchItems({ search, sortBy, sortOrder }))
    }, [dispatch, search, sortBy, sortOrder])

    useEffect(() => {
        fetch()
    }, [fetch])

    return { items, total, search, sortBy, sortOrder, loading, error, refetch: fetch }
}
