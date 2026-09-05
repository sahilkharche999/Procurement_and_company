import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/apiClient'

// A PDF always belongs to a project. Uploading no longer creates one, and the
// listing is always project-scoped — an unscoped list previously let one
// project's drawing be processed into another project.
export const uploadPdf = createAsyncThunk(
    'pdf/uploadPdf',
    async ({ file, projectId, section = 'general' }, { rejectWithValue }) => {
        if (!projectId) return rejectWithValue('projectId is required to upload a PDF')
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('project_id', projectId)
            formData.append('section', section)
            // Must unset Content-Type so browser sets multipart/form-data + correct boundary
            const res = await api.post('/pdf/upload', formData, {
                headers: { 'Content-Type': undefined },
            })
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const fetchPdfs = createAsyncThunk(
    'pdf/fetchPdfs',
    async ({ projectId, section = 'general' } = {}, { rejectWithValue }) => {
        if (!projectId) return rejectWithValue('projectId is required to list PDFs')
        try {
            const res = await api.get(
                `/pdf/list?project_id=${encodeURIComponent(projectId)}&section=${section}`
            )
            return res.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)

export const deletePdf = createAsyncThunk(
    'pdf/deletePdf',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/pdf/${id}`)
            return id
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || err.message)
        }
    }
)
