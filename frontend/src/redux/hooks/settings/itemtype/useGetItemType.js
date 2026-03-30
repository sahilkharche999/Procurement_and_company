import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { fetchItemType } from '../../../actions/settings/itemTypeActions'

export function useGetItemType() {
  const dispatch = useDispatch()
  const { selected, loading, error } = useSelector((state) => state.itemTypesSettings)

  const fetch = useCallback(
    async (id) => dispatch(fetchItemType(id)),
    [dispatch]
  )

  return { itemType: selected, loading, error, fetch }
}

export const userGetItemType = useGetItemType
