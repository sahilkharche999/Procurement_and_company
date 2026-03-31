import { createSlice } from '@reduxjs/toolkit'
import {
  fetchAllUnits,
  fetchUnit,
  createUnit,
  updateUnit,
  deleteUnit,
} from '../../actions/settings/unitActions'

const initialState = {
  items: [],
  selected: null,
  total: 0,
  page: 1,
  pageSize: 50,
  search: '',
  editingRowId: null,
  loading: false,
  error: null,
}

const unitsSlice = createSlice({
  name: 'unitsSettings',
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
    setEditingRowId(state, action) {
      state.editingRowId = action.payload
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUnits.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllUnits.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items || []
        state.total = action.payload.total || 0
        state.page = action.payload.page || 1
        state.pageSize = action.payload.page_size || state.pageSize
      })
      .addCase(fetchAllUnits.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch units'
      })

      .addCase(fetchUnit.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUnit.fulfilled, (state, action) => {
        state.loading = false
        state.selected = action.payload
      })
      .addCase(fetchUnit.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch unit'
      })

      .addCase(createUnit.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createUnit.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload?._id) {
          state.items = [action.payload, ...state.items]
          state.total = (state.total || 0) + 1
        }
      })
      .addCase(createUnit.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to create unit'
      })

      .addCase(updateUnit.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateUnit.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.items.findIndex((item) => item._id === action.payload._id)
        if (idx !== -1) {
          state.items[idx] = action.payload
        }
        if (state.selected?._id === action.payload?._id) {
          state.selected = action.payload
        }
      })
      .addCase(updateUnit.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update unit'
      })

      .addCase(deleteUnit.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteUnit.fulfilled, (state, action) => {
        state.loading = false
        state.items = state.items.filter((item) => item._id !== action.payload)
      })
      .addCase(deleteUnit.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to delete unit'
      })
  },
})

export const { setPage, setPageSize, setSearch, setEditingRowId, clearError } =
  unitsSlice.actions

export default unitsSlice.reducer
