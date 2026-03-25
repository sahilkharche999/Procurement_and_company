import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/apiClient'

export const startProcessing = createAsyncThunk(
    'floorplan/startProcessing',
    async ({ pdfId, dpi = 300, minAreaPct = 5.0 }, { rejectWithValue }) => {
        try {
            const form = new FormData()
            form.append('pdf_id', pdfId)
            form.append('dpi', dpi)
            form.append('min_area_pct', minAreaPct)
            const res = await api.post('/floorplan/processing-jobs', form, {
                headers: { 'Content-Type': undefined },
            })
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const pollJobStatus = createAsyncThunk(
    'floorplan/pollJobStatus',
    async (jobId, { rejectWithValue }) => {
        try {
            const res = await api.get(`/floorplan/processing-jobs/${jobId}`)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchJobImages = createAsyncThunk(
    'floorplan/fetchJobImages',
    async (jobId, { rejectWithValue }) => {
        try {
            const res = await api.get(`/floorplan/processing-jobs/${jobId}/diagrams`)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const saveSelectedImages = createAsyncThunk(
    'floorplan/saveSelectedImages',
    async ({ jobId, selected }, { rejectWithValue }) => {
        try {
            const res = await api.post(`/floorplan/processing-jobs/${jobId}/selected-diagrams`, { selected })
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchJobs = createAsyncThunk(
    'floorplan/fetchJobs',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/floorplan/processing-jobs')
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)
