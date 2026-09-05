import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { createItem, fetchItems } from '../../actions/items/itemActions'

export function useCreateItem() {
    const dispatch = useDispatch()
    const { search, sortBy, sortOrder, loading, error } = useSelector((state) => state.items)

    const create = useCallback(
        async (data) => {
            const result = await dispatch(createItem(data))
            if (!result.error) {
                dispatch(fetchItems({ search, sortBy, sortOrder }))
            }
            return result
        },
        [dispatch, search, sortBy, sortOrder]
    )

    return { create, loading, error }
}
