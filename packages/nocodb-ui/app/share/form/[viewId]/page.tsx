"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Lock,
  AlertTriangle,
  RotateCcw,
  Send,
  FileText,
  Sparkles,
} from "lucide-react";
import { UITypes, isVirtualCol } from "nocodb-sdk";
import type { ColumnType } from "nocodb-sdk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormField } from "@/app/components/smartsheet/form/FormField";
import { useApi } from "@/app/composables/useApi";
import Image from "next/image";

interface SharedFormState {
  isLoading: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  notFound: boolean;
  needPassword: boolean;
  passwordError: string | null;
  formData: any;
  columns: any[];
  formState: Record<string, any>;
  validationErrors: Record<string, string>;
}

export default function SharedFormPage() {
  const params = useParams();
  const viewId = params?.viewId as string;
  const { api } = useApi();

  const [state, setState] = useState<SharedFormState>({
    isLoading: true,
    isSubmitting: false,
    isSubmitted: false,
    notFound: false,
    needPassword: false,
    passwordError: null,
    formData: null,
    columns: [],
    formState: {},
    validationErrors: {},
  });

  const [password, setPassword] = useState("");
  const [secondsRemain, setSecondsRemain] = useState(0);

  // Load shared form view
  const loadSharedView = useCallback(
    async (pwd?: string) => {
      if (!viewId || !api) return;

      setState((prev) => ({ ...prev, isLoading: true, passwordError: null }));

      try {
        const response = (await api.public.sharedViewMetaGet(viewId, {
          headers: pwd ? { "xc-password": pwd } : undefined,
        })) as any;

        const formView = response?.view || {};
        const tableMeta = response?.model || {};
        const formColumns = Array.isArray(response?.columns)
          ? response.columns
          : [];

        // Build column map
        const fieldById = formColumns.reduce((acc: any, col: any) => {
          acc[col.fk_column_id] = col;
          return acc;
        }, {});

        // Merge columns with form column settings
        const tableColumns = Array.isArray(tableMeta?.columns)
          ? tableMeta.columns
          : [];
        const columns = tableColumns
          .filter((c: ColumnType) => fieldById[c.id!])
          .map((c: ColumnType) => ({
            ...c,
            ...fieldById[c.id!],
            show: fieldById[c.id!]?.show ?? true,
            order: fieldById[c.id!]?.order ?? 0,
            label: fieldById[c.id!]?.label || c.title,
            description: fieldById[c.id!]?.description || "",
            required: fieldById[c.id!]?.required ?? false,
          }))
          .filter((c: any) => c.show)
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

        setState((prev) => ({
          ...prev,
          isLoading: false,
          formData: formView,
          columns,
          needPassword: false,
        }));
      } catch (error: any) {
        console.error("Failed to load shared view:", error);

        if (error?.response?.status === 404) {
          setState((prev) => ({ ...prev, isLoading: false, notFound: true }));
        } else if (
          error?.response?.status === 401 ||
          error?.response?.data?.error === "INVALID_SHARED_VIEW_PASSWORD"
        ) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            needPassword: true,
            passwordError: pwd ? "密码错误，请重试" : null,
          }));
        } else {
          setState((prev) => ({ ...prev, isLoading: false, notFound: true }));
        }
      }
    },
    [viewId, api]
  );

  // Handle password submit
  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      loadSharedView(password);
    },
    [password, loadSharedView]
  );

  // Update field value
  const updateFieldValue = useCallback((title: string, value: any) => {
    setState((prev) => ({
      ...prev,
      formState: { ...prev.formState, [title]: value },
      validationErrors: { ...prev.validationErrors, [title]: "" },
    }));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    for (const col of state.columns) {
      if (!col.title) continue;

      const value = state.formState[col.title];
      const isRequired = col.required || (col.rqd && !col.cdf);

      if (isRequired) {
        if (value === null || value === undefined || value === "") {
          errors[col.title] = "此字段为必填项";
        }
        if (col.uidt === UITypes.Checkbox && !value) {
          errors[col.title] = "此字段为必填项";
        }
      }

      // Email validation
      if (col.uidt === UITypes.Email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[col.title] = "请输入有效的邮箱地址";
        }
      }

      // URL validation
      if (col.uidt === UITypes.URL && value) {
        try {
          new URL(value);
        } catch {
          errors[col.title] = "请输入有效的URL";
        }
      }
    }

    setState((prev) => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  }, [state.columns, state.formState]);

  // Helper function to filter null/undefined values (like nc-gui's filterNullOrUndefinedObjectProperties)
  const filterNullOrUndefined = (
    obj: Record<string, any>
  ): Record<string, any> => {
    return Object.keys(obj).reduce((result: Record<string, any>, key) => {
      const value = obj[key];
      if (value !== null && value !== undefined) {
        if (!Array.isArray(value) && typeof value === "object") {
          result[key] = filterNullOrUndefined(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }, {});
  };

  // Submit form
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;
      if (!api || !viewId) return;

      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        // Prepare row data - only include non-virtual columns with values
        // nc-gui wraps data in { data: {...} } structure
        const rowData: Record<string, any> = {};
        for (const col of state.columns) {
          if (!col.title) continue;
          // Skip virtual columns
          if (isVirtualCol(col)) continue;

          const value = state.formState[col.title];
          if (value !== undefined && value !== null) {
            rowData[col.title] = value;
          }
        }

        // nc-gui uses { data: rowData } structure for public.dataCreate
        const submitData = filterNullOrUndefined({
          data: rowData,
        });

        console.log("Public form submission - submitData:", submitData);

        // Submit data via public API
        await api.public.dataCreate(viewId, submitData, {
          headers: password ? { "xc-password": password } : undefined,
        });

        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          isSubmitted: true,
        }));

        // Handle auto-refresh
        if (state.formData?.show_blank_form) {
          setSecondsRemain(5);
          const interval = setInterval(() => {
            setSecondsRemain((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                setState((prev) => ({
                  ...prev,
                  isSubmitted: false,
                  formState: {},
                  validationErrors: {},
                }));
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to submit form:", error);
        setState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [
      api,
      viewId,
      password,
      state.columns,
      state.formState,
      state.formData,
      validateForm,
    ]
  );

  // Reset form
  const handleReset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSubmitted: false,
      formState: {},
      validationErrors: {},
    }));
  }, []);

  // Load on mount
  useEffect(() => {
    loadSharedView();
  }, [loadSharedView]);

  // Parse meta
  const meta = state.formData?.meta
    ? typeof state.formData.meta === "string"
      ? JSON.parse(state.formData.meta)
      : state.formData.meta
    : {};

  const backgroundColor = meta?.background_color || "#F9F9FA";

  // Loading state
  if (state.isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">加载表单中...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (state.notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">表单不存在</h2>
            <p className="text-sm text-muted-foreground">
              该表单链接无效或已被删除
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required state
  if (state.needPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-8 pb-6">
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-lg font-semibold">需要密码访问</h2>
              <p className="text-sm text-muted-foreground mt-1">
                请输入密码以访问此表单
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密码"
                className="text-center"
              />
              {state.passwordError && (
                <p className="text-xs text-destructive text-center">
                  {state.passwordError}
                </p>
              )}
              <Button type="submit" className="w-full">
                访问表单
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitted state
  if (state.isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor }}
      >
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            提交成功
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {state.formData?.success_msg || "感谢您的填写"}
          </p>
          {/* {state.formData?.submit_another_form && (
            <Button onClick={handleReset} variant="outline" size="sm">
              再填一份
            </Button>
          )}
          {state.formData?.show_blank_form && secondsRemain > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {secondsRemain}秒后自动刷新...
            </p>
          )} */}
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      <ScrollArea className="h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Banner */}
            {!meta?.hide_banner && (
              <div className="h-28 bg-linear-to-br from-primary via-primary/80 to-primary/60 rounded-t-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-primary-foreground/80">
                  <Image
                    src="/logo.png"
                    alt="Si-Me™ Table"
                    width={72}
                    height={72}
                  />
                  <div className="flex flex-col gap-2">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div className="text-xl font-bold sm:text-md">
                      Si-Me™ Engineer Agent
                    </div>
                    <div className="text-xs font-light pr-4">
                      您的运维工程师，专注于用户侧能源系统运维管理
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Card */}
            <Card
              className={cn(
                "shadow-xl border-0",
                meta?.hide_banner
                  ? "rounded-2xl"
                  : "rounded-t-none rounded-b-2xl"
              )}
            >
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="px-6 sm:px-8 space-y-1">
                  <h1 className="text-xl font-bold">
                    {state.formData?.heading || ""}
                  </h1>
                  {state.formData?.subheading && (
                    <p className="text-sm text-muted-foreground">
                      {state.formData.subheading}
                    </p>
                  )}
                </div>

                {/* Fields */}
                <div className="px-6 sm:px-8 py-3 space-y-4">
                  {state.columns.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      暂无可显示的字段
                    </div>
                  ) : (
                    state.columns.map((column) => (
                      <FormField
                        key={column.id}
                        column={column}
                        value={state.formState[column.title || ""]}
                        error={state.validationErrors[column.title || ""]}
                        isActive={false}
                        isEditable={false}
                        onValueChange={(value) =>
                          updateFieldValue(column.title || "", value)
                        }
                      />
                    ))
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 sm:px-8 py-5 border-t">
                  <Button
                    type="submit"
                    disabled={state.isSubmitting || state.columns.length === 0}
                    className="w-full sm:w-auto gap-2"
                  >
                    {state.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        提交
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Branding */}
            {!meta?.hide_branding && (
              <div className="mt-6 text-center">
                <a
                  href="https://github.com/nocodb/nocodb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Powered by Si-Me™ Engineer Agent
                </a>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
