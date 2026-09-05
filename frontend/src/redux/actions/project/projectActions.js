import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/apiClient'

export const fetchProjects = createAsyncThunk(
    'projects/fetchProjects',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/projects')
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

// The recycle bin — projects marked deleted but never destroyed.
export const fetchDeletedProjects = createAsyncThunk(
    'projects/fetchDeletedProjects',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/projects?deleted=true')
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const restoreProject = createAsyncThunk(
    'projects/restoreProject',
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.post(`/projects/${id}/restore`)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchProject = createAsyncThunk(
    'projects/fetchProject',
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`/projects/${id}`)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const createProject = createAsyncThunk(
    'projects/createProject',
    async (projectData, { rejectWithValue }) => {
        try {
            const res = await api.post('/projects', projectData)
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const deleteProject = createAsyncThunk(
    'projects/deleteProject',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/projects/${id}`)
            return id   // returns the _id string (MongoDB) or numeric id (legacy)
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchProjectMetadata = createAsyncThunk(
    'projects/fetchProjectMetadata',
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`/projects/${id}/metadata`)
            return { id, data: res.data }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchProjectPages = createAsyncThunk(
    'projects/fetchProjectPages',
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`/projects/${id}/pages`)
            return { id, data: res.data }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchAvailablePages = createAsyncThunk(
    'projects/fetchAvailablePages',
    // Accepts a bare id, or { id, pdfId } to narrow the list to one drawing set.
    async (arg, { rejectWithValue }) => {
        const id = typeof arg === 'object' && arg !== null ? arg.id : arg
        const pdfId = typeof arg === 'object' && arg !== null ? arg.pdfId : ''
        try {
            const query = pdfId ? `?pdf_id=${encodeURIComponent(pdfId)}` : ''
            const res = await api.get(`/projects/${id}/available-pages${query}`)
            return { id, data: res.data }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const updateProjectPages = createAsyncThunk(
    'projects/updateProjectPages',
    async ({ id, add_filenames = [], remove_filenames = [] }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/projects/${id}/pages`, {
                add_filenames,
                remove_filenames,
            })
            return { id, data: res.data }
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const renameProject = createAsyncThunk(
    'projects/renameProject',
    async ({ id, name }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/projects/${id}`, { name })
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

