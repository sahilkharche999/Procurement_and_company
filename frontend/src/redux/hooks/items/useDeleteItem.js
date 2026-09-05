import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { deleteItem, fetchItems } from '../../actions/items/itemActions'

export function useDeleteItem() {
    const dispatch = useDispatch()
    const { search, sortBy, sortOrder, loading, error } = useSelector((state) => state.items)

    const remove = useCallback(
        async (id) => {
            const result = await dispatch(deleteItem(id))
            if (!result.error) {
                dispatch(fetchItems({ search, sortBy, sortOrder }))
            }
            return result
        },
        [dispatch, search, sortBy, sortOrder]
    )

    return { remove, loading, error }
}
