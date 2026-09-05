import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { uploadPdf, fetchPdfs, deletePdf } from '../../actions/pdf/pdfActions'

export function usePdf() {
    const dispatch = useDispatch()
    const { documents, uploading, uploadProgress, loading, error } = useSelector(
        (state) => state.pdf
    )

    // Both take the owning project — PDFs are never global.
    const upload = useCallback(
        async (file, projectId, section = 'general') => {
            return dispatch(uploadPdf({ file, projectId, section }))
        },
        [dispatch]
    )

    const fetchAll = useCallback(
        (projectId, section = 'general') => {
            dispatch(fetchPdfs({ projectId, section }))
        },
        [dispatch]
    )

    const remove = useCallback(
        (id) => {
            dispatch(deletePdf(id))
        },
        [dispatch]
    )

    return { documents, uploading, uploadProgress, loading, error, upload, fetchAll, remove }
}
