import { createSlice } from '@reduxjs/toolkit'
import { fetchItems, createItem, updateItem, deleteItem } from '../actions/items/itemActions'

const initialState = {
    items: [],
    total: 0,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    editingRowId: null,
    loading: false,
    error: null,
}

const itemsSlice = createSlice({
    name: 'items',
    initialState,
    reducers: {
        setSearch(state, action) {
            state.search = action.payload
        },
        setSortBy(state, action) {
            state.sortBy = action.payload
        },
        setSortOrder(state, action) {
            state.sortOrder = action.payload
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
            .addCase(fetchItems.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchItems.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload.items || []
                state.total = action.payload.total || 0
            })
            .addCase(fetchItems.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload || 'Failed to fetch items'
            })

            .addCase(createItem.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(createItem.fulfilled, (state) => {
                state.loading = false
            })
            .addCase(createItem.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload || 'Failed to create item'
            })

            .addCase(updateItem.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(updateItem.fulfilled, (state, action) => {
                state.loading = false
                const idx = state.items.findIndex((item) => item._id === action.payload._id)
                if (idx !== -1) {
                    state.items[idx] = action.payload
                }
            })
            .addCase(updateItem.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload || 'Failed to update item'
            })

            .addCase(deleteItem.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(deleteItem.fulfilled, (state, action) => {
                state.loading = false
                state.items = state.items.filter((item) => item._id !== action.payload)
            })
            .addCase(deleteItem.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload || 'Failed to delete item'
            })
    },
})

export const {
    setSearch,
    setSortBy,
    setSortOrder,
    setEditingRowId,
    clearError,
} = itemsSlice.actions

export default itemsSlice.reducer
