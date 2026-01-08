import type { ColumnType, FormType, ViewType } from "nocodb-sdk";

export interface FormColumnType extends ColumnType {
  // Form column ID (different from table column ID)
  id?: string;
  // Reference to the original table column
  fk_column_id?: string;
  // Reference to the form view
  fk_view_id?: string;
  // Form-specific settings
  show?: boolean;
  order?: number;
  label?: string;
  description?: string;
  required?: boolean;
  meta?: Record<string, any>;
}

export interface FormViewData {
  id?: string;
  heading?: string;
  subheading?: string;
  success_msg?: string;
  redirect_url?: string | null;
  submit_another_form?: boolean;
  show_blank_form?: boolean;
  email?: string | null;
  banner_image_url?: any;
  logo_url?: any;
  meta?: {
    background_color?: string;
    hide_branding?: boolean;
    hide_banner?: boolean;
  };
}

export interface FormState {
  [key: string]: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface UseFormViewOptions {
  viewId?: string;
  baseId?: string;
  tableId: string;
  columns: ColumnType[];
  onSubmitSuccess?: (data: any) => void;
}

export interface UseFormViewReturn {
  // State
  formState: FormState;
  formViewData: FormViewData | null;
  formColumns: FormColumnType[];
  visibleColumns: FormColumnType[];
  activeFieldId: string | null;
  activeField: FormColumnType | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  validationErrors: Record<string, string>;
  
  // Actions
  setFormState: (state: FormState) => void;
  updateFieldValue: (fieldTitle: string, value: any) => void;
  setActiveField: (fieldId: string | null) => void;
  loadFormView: () => Promise<void>;
  updateFormView: (data: Partial<FormViewData>) => Promise<void>;
  updateColumnMeta: (columnId: string, meta: Partial<FormColumnType>) => Promise<void>;
  showColumn: (columnId: string) => Promise<void>;
  hideColumn: (columnId: string) => Promise<void>;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  validateForm: () => boolean;
  submitForm: () => Promise<boolean>;
  clearForm: () => void;
  resetSubmission: () => void;
}
