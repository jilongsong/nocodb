"use client"

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from "react"
import type { ViewType } from "nocodb-sdk"
import { ViewTypes } from "nocodb-sdk"
import { useApi } from "../useApi"
import type { ViewsState, ViewsActions, CreateViewPayload, ViewTypeString } from "./types"

interface ViewsContextType extends ViewsState, ViewsActions {}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined)

// Map view type number to string
const viewTypeToString = (type: number | undefined): ViewTypeString => {
  switch (type) {
    case ViewTypes.GRID: return "grid"
    case ViewTypes.GALLERY: return "gallery"
    case ViewTypes.FORM: return "form"
    case ViewTypes.KANBAN: return "kanban"
    case ViewTypes.CALENDAR: return "calendar"
    case ViewTypes.MAP: return "map"
    default: return "grid"
  }
}

export function ViewsProvider({ children }: { children: ReactNode }) {
  const { api } = useApi({ useGlobalInstance: true })
  
  const [state, setState] = useState<ViewsState>({
    viewsByTable: new Map(),
    activeViewId: null,
    isViewsLoading: false,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const updateState = useCallback((updates: Partial<ViewsState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Load views for a table
  const loadViews = useCallback(async (tableId: string, force: boolean = false): Promise<ViewType[] | undefined> => {
    if (!tableId) return undefined

    // Check if already loaded and not forcing refresh
    if (!force && stateRef.current.viewsByTable.has(tableId)) {
      return stateRef.current.viewsByTable.get(tableId)
    }

    updateState({ isViewsLoading: true })

    try {
      const response = await api.dbView.list(tableId)
      const views = (response.list || []).sort((a, b) => (a.order || 0) - (b.order || 0))

      const newViewsByTable = new Map(stateRef.current.viewsByTable)
      newViewsByTable.set(tableId, views)

      updateState({ viewsByTable: newViewsByTable, isViewsLoading: false })
      return views
    } catch (e) {
      console.error("Failed to load views:", e)
      updateState({ isViewsLoading: false })
      return undefined
    }
  }, [api, updateState])

  // Get views for a specific table
  const getViewsForTable = useCallback((tableId: string): ViewType[] => {
    return stateRef.current.viewsByTable.get(tableId) || []
  }, [])

  // Get the default view for a table
  const getDefaultView = useCallback((tableId: string): ViewType | undefined => {
    const views = stateRef.current.viewsByTable.get(tableId) || []
    return views.find((v) => v.is_default) || views[0]
  }, [])

  // Set active view ID
  const setActiveViewId = useCallback((viewId: string | null) => {
    updateState({ activeViewId: viewId })
  }, [updateState])

  // Create a new view
  const createView = useCallback(async (tableId: string, payload: CreateViewPayload): Promise<ViewType | null> => {
    if (!tableId) return null

    try {
      let view: ViewType | null = null
      const { title, type, ...rest } = payload

      switch (type) {
        case "grid":
          view = await api.dbView.gridCreate(tableId, { title, ...rest })
          break
        case "gallery":
          view = await api.dbView.galleryCreate(tableId, { title, ...rest })
          break
        case "form":
          view = await api.dbView.formCreate(tableId, { title, ...rest })
          break
        case "kanban":
          view = await api.dbView.kanbanCreate(tableId, { title, ...rest })
          break
        case "calendar":
          view = await api.dbView.calendarCreate(tableId, { title, ...rest } as any)
          break
        case "map":
          view = await api.dbView.mapCreate(tableId, { title, ...rest })
          break
        default:
          view = await api.dbView.gridCreate(tableId, { title })
      }

      if (view) {
        // Update local state
        const newViewsByTable = new Map(stateRef.current.viewsByTable)
        const existingViews = newViewsByTable.get(tableId) || []
        newViewsByTable.set(tableId, [...existingViews, view])
        updateState({ viewsByTable: newViewsByTable })
      }

      return view
    } catch (e) {
      console.error("Failed to create view:", e)
      return null
    }
  }, [api, updateState])

  // Update a view
  const updateView = useCallback(async (viewId: string, data: Partial<ViewType>): Promise<ViewType | null> => {
    try {
      const updatedView = await api.dbView.update(viewId, data as any)

      // Update local state
      const newViewsByTable = new Map(stateRef.current.viewsByTable)
      for (const [tableId, views] of newViewsByTable) {
        const viewIndex = views.findIndex((v) => v.id === viewId)
        if (viewIndex !== -1) {
          views[viewIndex] = { ...views[viewIndex], ...updatedView }
          newViewsByTable.set(tableId, [...views])
          break
        }
      }
      updateState({ viewsByTable: newViewsByTable })
      return updatedView
    } catch (e) {
      console.error("Failed to update view:", e)
      return null
    }
  }, [api, updateState])

  // Rename a view
  const renameView = useCallback(async (viewId: string, title: string): Promise<boolean> => {
    try {
      await api.dbView.update(viewId, { title } as any)

      // Update local state
      const newViewsByTable = new Map(stateRef.current.viewsByTable)
      for (const [tableId, views] of newViewsByTable) {
        const viewIndex = views.findIndex((v) => v.id === viewId)
        if (viewIndex !== -1) {
          views[viewIndex] = { ...views[viewIndex], title }
          newViewsByTable.set(tableId, [...views])
          break
        }
      }
      updateState({ viewsByTable: newViewsByTable })
      return true
    } catch (e) {
      console.error("Failed to rename view:", e)
      return false
    }
  }, [api, updateState])

  // Delete a view
  const deleteView = useCallback(async (view: ViewType): Promise<boolean> => {
    if (!view.id) return false

    // Cannot delete the default view
    if (view.is_default) {
      console.error("Cannot delete the default view")
      return false
    }

    try {
      await api.dbView.delete(view.id)

      // Update local state
      const newViewsByTable = new Map(stateRef.current.viewsByTable)
      const tableId = view.fk_model_id
      if (tableId) {
        const views = newViewsByTable.get(tableId) || []
        newViewsByTable.set(tableId, views.filter((v) => v.id !== view.id))
      }
      updateState({ viewsByTable: newViewsByTable })
      return true
    } catch (e) {
      console.error("Failed to delete view:", e)
      return false
    }
  }, [api, updateState])

  // Duplicate a view
  const duplicateView = useCallback(async (view: ViewType): Promise<ViewType | null> => {
    if (!view.id || !view.fk_model_id) return null

    try {
      // Generate unique title
      const existingViews = stateRef.current.viewsByTable.get(view.fk_model_id) || []
      let copyTitle = `${view.title} (Copy)`
      let counter = 1
      while (existingViews.some((v) => v.title === copyTitle)) {
        counter++
        copyTitle = `${view.title} (Copy ${counter})`
      }

      // Create a new view of the same type
      const duplicated = await createView(view.fk_model_id, {
        title: copyTitle,
        type: viewTypeToString(view.type),
        copy_from_id: view.id,
      })

      return duplicated
    } catch (e) {
      console.error("Failed to duplicate view:", e)
      return null
    }
  }, [createView])

  // Clear views for a table
  const clearViewsForTable = useCallback((tableId: string) => {
    const newViewsByTable = new Map(stateRef.current.viewsByTable)
    newViewsByTable.delete(tableId)
    updateState({ viewsByTable: newViewsByTable })
  }, [updateState])

  const value = useMemo(
    () => ({
      ...state,
      loadViews,
      getViewsForTable,
      getDefaultView,
      setActiveViewId,
      createView,
      updateView,
      renameView,
      deleteView,
      duplicateView,
      clearViewsForTable,
    }),
    [state, loadViews, getViewsForTable, getDefaultView, setActiveViewId, createView, updateView, renameView, deleteView, duplicateView, clearViewsForTable]
  )

  return <ViewsContext.Provider value={value}>{children}</ViewsContext.Provider>
}

export function useViews() {
  const context = useContext(ViewsContext)
  if (context === undefined) {
    throw new Error("useViews must be used within a ViewsProvider")
  }
  return context
}
