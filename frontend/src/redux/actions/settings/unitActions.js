import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/apiClient'

export const fetchAllUnits = createAsyncThunk(
  'settings/units/fetchAll',
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
      const res = await api.get(`/settings/units?${params}`)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const fetchUnit = createAsyncThunk(
  'settings/units/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/settings/units/${id}`)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const createUnit = createAsyncThunk(
  'settings/units/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/settings/units', data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const updateUnit = createAsyncThunk(
  'settings/units/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/settings/units/${id}`, data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const deleteUnit = createAsyncThunk(
  'settings/units/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/settings/units/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)
