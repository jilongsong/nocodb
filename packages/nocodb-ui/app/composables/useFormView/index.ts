"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes, isVirtualCol } from "nocodb-sdk";
import { useApi } from "../useApi";
import type {
  FormColumnType,
  FormViewData,
  FormState,
  UseFormViewOptions,
  UseFormViewReturn,
} from "./types";

// Re-export types for external use
export type { FormColumnType, FormViewData, FormState, UseFormViewOptions, UseFormViewReturn };

// Hidden column types that shouldn't be shown in forms
const FORM_HIDDEN_COLUMN_TYPES = [
  UITypes.Rollup,
  UITypes.Lookup,
  UITypes.Formula,
  UITypes.QrCode,
  UITypes.Barcode,
  UITypes.SpecificDBType,
  UITypes.CreatedTime,
  UITypes.LastModifiedTime,
  UITypes.CreatedBy,
  UITypes.LastModifiedBy,
  UITypes.AutoNumber,
  UITypes.Button,
];

// Check if column should be hidden in form view
const isFormHiddenColumn = (column: ColumnType): boolean => {
  if (!column.uidt) return false;
  return FORM_HIDDEN_COLUMN_TYPES.includes(column.uidt as UITypes);
};

// Check if a field is required
const isFieldRequired = (column: FormColumnType): boolean => {
  // Explicitly marked as required
  if (column.required) return true;
  // Database level required (not null without default)
  if (column.rqd && !column.cdf) return true;
  // Primary key without auto increment
  if (column.pk && !column.ai && !column.cdf) return true;
  return false;
};

// Validate a single field value
const validateFieldValue = (column: FormColumnType, value: any): string | null => {
  const isRequired = isFieldRequired(column);
  
  if (isRequired) {
    if (value === null || value === undefined || value === "") {
      return "此字段为必填项";
    }
    if (column.uidt === UITypes.Checkbox && !value) {
      return "此字段为必填项";
    }
  }
  
  // Email validation
  if (column.uidt === UITypes.Email && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "请输入有效的邮箱地址";
    }
  }
  
  // URL validation
  if (column.uidt === UITypes.URL && value) {
    try {
      new URL(value);
    } catch {
      return "请输入有效的URL";
    }
  }
  
  return null;
};

export function useFormView({
  viewId,
  baseId,
  tableId,
  columns,
  onSubmitSuccess,
}: UseFormViewOptions): UseFormViewReturn {
  const { api } = useApi();
  
  // State
  const [formState, setFormState] = useState<FormState>({});
  const [formViewData, setFormViewData] = useState<FormViewData | null>(null);
  const [formColumns, setFormColumns] = useState<FormColumnType[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Filter visible columns (shown in form)
  const visibleColumns = useMemo(() => {
    return formColumns
      .filter((col) => col.show)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [formColumns]);

  // Get active field
  const activeField = useMemo(() => {
    if (!activeFieldId) return null;
    return formColumns.find((col) => col.id === activeFieldId) || null;
  }, [activeFieldId, formColumns]);

  // Update a single field value
  const updateFieldValue = useCallback((fieldTitle: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [fieldTitle]: value,
    }));
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldTitle];
      return newErrors;
    });
  }, []);

  // Load form view data
  const loadFormView = useCallback(async () => {
    if (!viewId || !api) return;
    
    setIsLoading(true);
    try {
      // Get form view data - includes columns with form-specific IDs
      const formData = await api.dbView.formRead(viewId);
      const { columns: formViewColumns, ...viewData } = formData as any;
      
      // Parse meta if it's a string
      const meta = typeof viewData.meta === "string" 
        ? JSON.parse(viewData.meta) 
        : viewData.meta || {};
      
      setFormViewData({
        ...viewData,
        heading: viewData.heading || "表单",
        subheading: viewData.subheading || "",
        success_msg: viewData.success_msg || "表单提交成功！",
        submit_another_form: !!viewData.submit_another_form,
        show_blank_form: !!viewData.show_blank_form,
        meta: {
          background_color: meta.background_color || "#F9F9FA",
          hide_branding: meta.hide_branding || false,
          hide_banner: meta.hide_banner || false,
        },
      });

      // Build a map of form columns by fk_column_id (table column ID)
      // Form columns have their own ID which we need for API updates
      let maxOrder = 1;
      const formColumnById: Record<string, any> = (formViewColumns || []).reduce(
        (acc: Record<string, any>, fc: any) => {
          if (fc.order && fc.order > maxOrder) {
            maxOrder = fc.order;
          }
          acc[fc.fk_column_id] = fc;
          return acc;
        },
        {}
      );

      // Merge table columns with form column data
      // IMPORTANT: Use form column's `id` for API calls, not table column's `id`
      const mappedColumns: FormColumnType[] = columns
        .filter((col) => !isFormHiddenColumn(col) && !col.system)
        .map((col) => {
          const formCol = formColumnById[col.id!];
          const colMeta = typeof col.meta === 'object' && col.meta !== null 
            ? col.meta as Record<string, any> 
            : {};
          const formMeta = formCol?.meta 
            ? (typeof formCol.meta === 'string' ? JSON.parse(formCol.meta) : formCol.meta)
            : {};
          
          return {
            ...col,
            // Use form column ID if exists, otherwise undefined (new column not yet in form)
            id: formCol?.id || undefined,
            // Keep reference to the original table column ID
            fk_column_id: col.id,
            fk_view_id: viewId,
            // Form-specific settings from API
            show: formCol?.show ?? true,
            order: formCol?.order ?? ++maxOrder,
            label: formCol?.label || col.title,
            description: formCol?.description || "",
            required: formCol?.required ?? isFieldRequired(col as FormColumnType),
            meta: { ...colMeta, ...formMeta },
          };
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      setFormColumns(mappedColumns);
    } catch (error) {
      console.error("Failed to load form view:", error);
    } finally {
      setIsLoading(false);
    }
  }, [viewId, api, columns]);

  // Update form view settings
  const updateFormView = useCallback(async (data: Partial<FormViewData>) => {
    if (!viewId || !api) return;
    
    try {
      // Prepare meta for saving
      const updateData: any = { ...data };
      if (data.meta) {
        updateData.meta = JSON.stringify(data.meta);
      }
      
      await api.dbView.formUpdate(viewId, updateData);
      
      setFormViewData((prev) => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Failed to update form view:", error);
    }
  }, [viewId, api]);

  // Update column meta (label, description, required, etc.)
  const updateColumnMeta = useCallback(async (
    columnId: string, 
    meta: Partial<FormColumnType>
  ) => {
    if (!api) return;
    
    try {
      await api.dbView.formColumnUpdate(columnId, meta);
      
      setFormColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, ...meta } : col
        )
      );
    } catch (error) {
      console.error("Failed to update column meta:", error);
    }
  }, [api]);

  // Show column in form
  const showColumn = useCallback(async (columnId: string) => {
    await updateColumnMeta(columnId, { show: true });
  }, [updateColumnMeta]);

  // Hide column from form
  const hideColumn = useCallback(async (columnId: string) => {
    const column = formColumns.find((c) => c.id === columnId);
    if (column && isFieldRequired(column)) {
      console.warn("Cannot hide required field");
      return;
    }
    await updateColumnMeta(columnId, { show: false });
  }, [formColumns, updateColumnMeta]);

  // Reorder columns with API update (matches nc-gui's onMove function)
  const reorderColumns = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!api || fromIndex === toIndex) return;
    
    // Work with visible columns for the drag operation
    const movingColumn = visibleColumns[fromIndex];
    if (!movingColumn?.id) {
      console.warn("Column has no form ID, cannot reorder");
      return;
    }
    
    // Create a copy of columns and simulate the move to find neighbors
    const columnsCopy = [...formColumns];
    const sortedCopy = columnsCopy.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    // Find the actual index in the full sorted array
    const actualFromIndex = sortedCopy.findIndex(c => c.id === movingColumn.id);
    
    // Calculate new order value based on target position neighbors
    // nc-gui uses: (prevNeighbor.order + nextNeighbor.order) / 2
    let newOrder: number;
    
    if (sortedCopy.length <= 1) {
      newOrder = 1;
    } else if (toIndex >= visibleColumns.length - 1) {
      // Moving to end - use max order + 1
      newOrder = Math.max(...sortedCopy.map((c) => c.order ?? 0)) + 1;
    } else if (toIndex === 0) {
      // Moving to start - use min order / 2
      newOrder = Math.min(...sortedCopy.map((c) => c.order ?? 0)) / 2;
    } else {
      // Moving to middle - find the neighbors at target position
      // When moving forward (fromIndex < toIndex), target neighbors are at toIndex and toIndex+1
      // When moving backward (fromIndex > toIndex), target neighbors are at toIndex-1 and toIndex
      let prevNeighborOrder: number;
      let nextNeighborOrder: number;
      
      if (fromIndex < toIndex) {
        // Moving forward: insert AFTER the item at toIndex
        prevNeighborOrder = visibleColumns[toIndex]?.order ?? 0;
        nextNeighborOrder = visibleColumns[toIndex + 1]?.order ?? (prevNeighborOrder + 2);
      } else {
        // Moving backward: insert BEFORE the item at toIndex
        prevNeighborOrder = visibleColumns[toIndex - 1]?.order ?? 0;
        nextNeighborOrder = visibleColumns[toIndex]?.order ?? (prevNeighborOrder + 2);
      }
      
      newOrder = (prevNeighborOrder + nextNeighborOrder) / 2;
    }
    
    // Update local state first for immediate UI response
    setFormColumns((prev) => {
      return prev.map(col => 
        col.id === movingColumn.id ? { ...col, order: newOrder } : col
      ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    
    // Persist to API
    try {
      await api.dbView.formColumnUpdate(movingColumn.id, { 
        ...movingColumn, 
        order: newOrder 
      });
    } catch (error) {
      console.error("Failed to reorder column:", error);
      // Revert on error
      loadFormView();
    }
  }, [api, formColumns, visibleColumns, loadFormView]);

  // Validate the entire form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    for (const column of visibleColumns) {
      if (!column.title) continue;
      
      const value = formState[column.title];
      const error = validateFieldValue(column, value);
      
      if (error) {
        errors[column.title] = error;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [visibleColumns, formState]);

  // Submit the form
  const submitForm = useCallback(async (): Promise<boolean> => {
    if (!api || !tableId) {
      console.error("Form submission failed: api or tableId is missing");
      return false;
    }
    
    // Validate first
    if (!validateForm()) {
      return false;
    }
    
    setIsSubmitting(true);
    try {
      // Prepare row data - following nc-gui's populateInsertObject logic
      // nc-gui iterates through meta.columns and only includes non-AI columns with values
      const rowData: Record<string, any> = {};
      
      // Use visibleColumns (columns shown in form) to build insert object
      // This is more correct as we only want to submit visible form fields
      for (const column of visibleColumns) {
        // Skip if column has no title
        if (!column.title) continue;
        
        // Skip auto-increment columns
        if (column.ai) continue;
        
        // Skip virtual columns (computed columns)
        if (isVirtualCol(column)) continue;
        
        // Get the value from formState
        const value = formState[column.title];
        
        // Include column if value is not null/undefined and not empty string
        if (value !== null && value !== undefined && value !== "") {
          rowData[column.title] = value;
        }
      }
      
      console.log("Form submission - visibleColumns:", visibleColumns);
      console.log("Form submission - formState:", formState);
      console.log("Form submission - rowData:", rowData);
      console.log("Form submission - baseId:", baseId, "tableId:", tableId, "viewId:", viewId);
      
      // Check if we have any data to submit
      if (Object.keys(rowData).length === 0) {
        console.warn("Form submission: No data to submit");
      }
      
      // Insert the row using dbViewRow.create if viewId exists, otherwise dbTableRow.create
      // API signature: dbViewRow.create(orgs, baseName, tableName, viewName, data)
      let result;
      
      if (viewId && baseId) {
        // Use dbViewRow.create when we have both viewId and baseId
        result = await api.dbViewRow.create("noco", baseId, tableId, viewId, rowData);
      } else if (baseId) {
        // Use dbTableRow.create with baseId
        result = await api.dbTableRow.create("noco", baseId, tableId, rowData);
      } else {
        // Fallback - this shouldn't happen in normal usage
        console.warn("Form submission: baseId is missing, using tableId as fallback");
        result = await api.dbTableRow.create("noco", tableId, tableId, rowData);
      }
      
      setIsSubmitted(true);
      onSubmitSuccess?.(result);
      
      // Handle post-submission behavior
      if (formViewData?.show_blank_form) {
        setTimeout(() => {
          clearForm();
          setIsSubmitted(false);
        }, 5000);
      }
      
      return true;
    } catch (error: any) {
      console.error("Failed to submit form:", error);
      console.error("Error details:", error?.response?.data || error?.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [api, baseId, tableId, viewId, validateForm, visibleColumns, formState, formViewData, onSubmitSuccess]);

  // Clear the form
  const clearForm = useCallback(() => {
    setFormState({});
    setValidationErrors({});
  }, []);

  // Reset submission state
  const resetSubmission = useCallback(() => {
    setIsSubmitted(false);
    clearForm();
  }, [clearForm]);

  // Load form view data when viewId changes
  useEffect(() => {
    if (viewId) {
      loadFormView();
    }
  }, [viewId, loadFormView]);

  // Initialize form columns from table columns if no form data
  useEffect(() => {
    if (!viewId && columns.length > 0 && formColumns.length === 0) {
      const initialColumns: FormColumnType[] = columns
        .filter((col) => !isFormHiddenColumn(col) && !col.system)
        .map((col, index) => ({
          ...col,
          // For local-only mode, use table column ID as form column ID
          id: col.id,
          fk_column_id: col.id,
          show: true,
          order: index + 1,
          label: col.title,
          description: "",
          required: isFieldRequired(col as FormColumnType),
          meta: typeof col.meta === 'object' && col.meta !== null ? col.meta as Record<string, any> : {},
        }));
      setFormColumns(initialColumns);
    }
  }, [viewId, columns, formColumns.length]);

  return {
    // State
    formState,
    formViewData,
    formColumns,
    visibleColumns,
    activeFieldId,
    activeField,
    isLoading,
    isSubmitting,
    isSubmitted,
    validationErrors,
    
    // Actions
    setFormState,
    updateFieldValue,
    setActiveField: setActiveFieldId,
    loadFormView,
    updateFormView,
    updateColumnMeta,
    showColumn,
    hideColumn,
    reorderColumns,
    validateForm,
    submitForm,
    clearForm,
    resetSubmission,
  };
}

