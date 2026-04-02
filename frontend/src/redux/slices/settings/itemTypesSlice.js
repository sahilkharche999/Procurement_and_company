import { createSlice } from '@reduxjs/toolkit'
import {
  fetchAllItemTypes,
  fetchItemType,
  createItemType,
  updateItemType,
  deleteItemType,
} from '../../actions/settings/itemTypeActions'

const initialState = {
  items: [],
  selected: null,
  total: 0,
  page: 1,
  pageSize: 50,
  search: '',
  includeDeleted: false,
  editingRowId: null,
  loading: false,
  error: null,
}

const itemTypesSlice = createSlice({
  name: 'itemTypesSettings',
  initialState,
  reducers: {
    setPage(state, action) {
      state.page = action.payload
    },
    setPageSize(state, action) {
      state.pageSize = action.payload
      state.page = 1
    },
    setSearch(state, action) {
      state.search = action.payload
      state.page = 1
    },
    setIncludeDeleted(state, action) {
      state.includeDeleted = !!action.payload
      state.page = 1
    },
    setEditingRowId(state, action) {
      state.editingRowId = action.payload
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllItemTypes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllItemTypes.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items || []
        state.total = action.payload.total || 0
        state.page = action.payload.page || 1
        state.pageSize = action.payload.page_size || state.pageSize
      })
      .addCase(fetchAllItemTypes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch item types'
      })

      .addCase(fetchItemType.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchItemType.fulfilled, (state, action) => {
        state.loading = false
        state.selected = action.payload
      })
      .addCase(fetchItemType.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch item type'
      })

      .addCase(createItemType.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createItemType.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload?._id) {
          state.items = [action.payload, ...state.items]
          state.total = (state.total || 0) + 1
        }
      })
      .addCase(createItemType.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to create item type'
      })

      .addCase(updateItemType.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateItemType.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.items.findIndex((item) => item._id === action.payload._id)
        if (idx !== -1) {
          state.items[idx] = action.payload
        }
        if (state.selected?._id === action.payload?._id) {
          state.selected = action.payload
        }
      })
      .addCase(updateItemType.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update item type'
      })

      .addCase(deleteItemType.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteItemType.fulfilled, (state, action) => {
        state.loading = false
        state.items = state.items.filter((item) => item._id !== action.payload)
      })
      .addCase(deleteItemType.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to delete item type'
      })
  },
})

export const {
  setPage,
  setPageSize,
  setSearch,
  setIncludeDeleted,
  setEditingRowId,
  clearError,
} = itemTypesSlice.actions

export default itemTypesSlice.reducer
