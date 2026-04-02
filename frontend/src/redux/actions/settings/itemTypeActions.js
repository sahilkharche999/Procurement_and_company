import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/apiClient'

export const fetchAllItemTypes = createAsyncThunk(
  'settings/itemTypes/fetchAll',
  async ({ page, pageSize, search, includeDeleted }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page || 1),
        page_size: String(pageSize || 50),
        search: search || '',
      })
      if (includeDeleted) {
        params.set('include_deleted', 'true')
      }
      const res = await api.get(`/settings/item-types?${params}`)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const fetchItemType = createAsyncThunk(
  'settings/itemTypes/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/settings/item-types/${id}`)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const createItemType = createAsyncThunk(
  'settings/itemTypes/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/settings/item-types', data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const updateItemType = createAsyncThunk(
  'settings/itemTypes/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/settings/item-types/${id}`, data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const deleteItemType = createAsyncThunk(
  'settings/itemTypes/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/settings/item-types/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)
