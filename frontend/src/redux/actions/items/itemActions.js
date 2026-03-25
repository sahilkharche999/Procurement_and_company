import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/apiClient'

export const fetchItems = createAsyncThunk(
    'items/fetchItems',
    async ({ page, pageSize, search, sortBy, sortOrder }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams({
                page: String(page || 1),
                page_size: String(pageSize || 12),
                search: search || '',
                sort_by: sortBy || 'name',
                sort_order: sortOrder || 'asc',
            })
            const res = await api.get(`/items?${params}`)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const createItem = createAsyncThunk(
    'items/createItem',
    async (data, { rejectWithValue }) => {
        try {
            const res = await api.post('/items', data)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const updateItem = createAsyncThunk(
    'items/updateItem',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/items/${id}`, data)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const deleteItem = createAsyncThunk(
    'items/deleteItem',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/items/${id}`)
            return id
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)
