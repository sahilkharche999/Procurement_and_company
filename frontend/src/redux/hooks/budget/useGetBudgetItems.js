import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect } from 'react'
import { fetchBudgetItems } from '../../actions/budget/budgetActions'

export function useGetBudgetItems() {
    const dispatch = useDispatch()
    const {
        projectId, items, total,
        totalSubtotal, roomTotals, loading, error,
        search, roomFilter, groupByPage, groupByRoom, section,
    } = useSelector((state) => state.budget)

    const fetch = useCallback(() => {
        if (!projectId) return
        dispatch(fetchBudgetItems({ projectId, section, search, roomFilter, groupByPage, groupByRoom }))
    }, [dispatch, projectId, section, search, roomFilter, groupByPage, groupByRoom])

    useEffect(() => {
        fetch()
    }, [fetch])

    return { items, total, totalSubtotal, roomTotals, loading, error, refetch: fetch }
}
