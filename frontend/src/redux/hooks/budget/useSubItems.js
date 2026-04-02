import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { addSubItem, updateSubItem, deleteSubItem, detachSubItem, assignToParent, fetchBudgetItems } from '../../actions/budget/budgetActions'

export function useSubItems() {
    const dispatch = useDispatch()
    const {
        projectId,
        section,
        page,
        pageSize,
        search,
        roomFilter,
        groupByPage,
        groupByRoom,
    } = useSelector((state) => state.budget)

    const refetchBudget = useCallback(() => {
        dispatch(
            fetchBudgetItems({
                projectId,
                section,
                page,
                pageSize,
                search,
                roomFilter,
                groupByPage,
                groupByRoom,
            })
        )
    }, [dispatch, projectId, section, page, pageSize, search, roomFilter, groupByPage, groupByRoom])

    const addSub = useCallback(
        async (itemId, data) => {
            const res = await dispatch(addSubItem({ projectId, itemId, data }))
            if (res?.meta?.requestStatus === 'fulfilled') {
                refetchBudget()
            }
            return res
        },
        [dispatch, projectId, refetchBudget]
    )

    const updateSub = useCallback(
        async (itemId, subId, data) => {
            const res = await dispatch(updateSubItem({ projectId, itemId, subId, data }))
            if (res?.meta?.requestStatus === 'fulfilled') {
                refetchBudget()
            }
            return res
        },
        [dispatch, projectId, refetchBudget]
    )

    const deleteSub = useCallback(
        async (itemId, subId) => {
            const res = await dispatch(deleteSubItem({ projectId, itemId, subId }))
            if (res?.meta?.requestStatus === 'fulfilled') {
                refetchBudget()
            }
            return res
        },
        [dispatch, projectId, refetchBudget]
    )

    const detachSub = useCallback(
        async (itemId, subId) => {
            const res = await dispatch(detachSubItem({ projectId, itemId, subId }))
            if (res?.meta?.requestStatus === 'fulfilled') {
                refetchBudget()
            }
            return res
        },
        [dispatch, projectId, refetchBudget]
    )

    const assignSub = useCallback(
        async (itemId, parentId) => {
            const res = await dispatch(assignToParent({ projectId, itemId, parentId }))
            if (res?.meta?.requestStatus === 'fulfilled') {
                refetchBudget()
            }
            return res
        },
        [dispatch, projectId, refetchBudget]
    )

    return { addSub, updateSub, deleteSub, detachSub, assignSub }
}
