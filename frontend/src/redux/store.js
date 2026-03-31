import { configureStore } from '@reduxjs/toolkit'
import budgetReducer from './slices/budgetSlice'
import pdfReducer from './slices/pdfSlice'
import uiReducer from './slices/uiSlice'
import floorplanReducer from './slices/floorplanSlice'
import projectReducer from './slices/projectSlice'
import itemsReducer from './slices/itemsSlice'
import itemTypesSettingsReducer from './slices/settings/itemTypesSlice'
import unitsSettingsReducer from './slices/settings/unitsSlice'

const store = configureStore({
    reducer: {
        budget: budgetReducer,
        pdf: pdfReducer,
        ui: uiReducer,
        floorplan: floorplanReducer,
        projects: projectReducer,
        items: itemsReducer,
        itemTypesSettings: itemTypesSettingsReducer,
        unitsSettings: unitsSettingsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'pdf/uploadPdf/pending',
                    'pdf/uploadPdf/fulfilled',
                    'floorplan/startProcessing/pending',
                ],
            },
        }),
})

export default store
