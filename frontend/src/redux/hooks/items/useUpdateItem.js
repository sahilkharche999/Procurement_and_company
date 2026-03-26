import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { updateItem } from '../../actions/items/itemActions'

export function useUpdateItem() {
    const dispatch = useDispatch()
    const { loading, error } = useSelector((state) => state.items)

    const update = useCallback(
        async (id, data) => dispatch(updateItem({ id, data })),
        [dispatch]
    )

    return { update, loading, error }
}
