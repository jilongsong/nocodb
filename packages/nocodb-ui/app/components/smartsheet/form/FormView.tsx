"use client";

import { useState, useCallback, useMemo } from "react";
import type { ColumnType } from "nocodb-sdk";
import {
  CheckCircle2,
  Loader2,
  PanelRight,
  RotateCcw,
  Send,
  Sparkles,
  FileText,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormField } from "./FormField";
import { FormSidebar } from "./FormSidebar";
import {
  useFormView,
  type FormColumnType,
} from "@/app/composables/useFormView";
import Image from "next/image";

interface FormViewProps {
  viewId?: string;
  baseId?: string;
  tableId: string;
  columns: ColumnType[];
  tableName?: string;
  isEditable?: boolean;
  onSubmitSuccess?: (data: any) => void;
}

// Sortable Field Wrapper with drag handle
function SortableField({
  column,
  isEditable,
  children,
}: {
  column: FormColumnType;
  isEditable: boolean;
  children: (
    dragHandleProps: React.HTMLAttributes<HTMLDivElement>
  ) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id || "" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Combine attributes and listeners for drag handle
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50 z-50")}
    >
      {children(dragHandleProps)}
    </div>
  );
}

export function FormView({
  viewId,
  baseId,
  tableId,
  columns,
  tableName = "",
  isEditable = true,
  onSubmitSuccess,
}: FormViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
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
    updateFieldValue,
    setActiveField,
    updateFormView,
    updateColumnMeta,
    showColumn,
    hideColumn,
    reorderColumns,
    submitForm,
    clearForm,
    resetSubmission,
  } = useFormView({
    viewId,
    baseId,
    tableId,
    columns,
    onSubmitSuccess,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = visibleColumns.findIndex(
          (col) => col.id === active.id
        );
        const newIndex = visibleColumns.findIndex((col) => col.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderColumns(oldIndex, newIndex);
        }
      }
    },
    [visibleColumns, reorderColumns]
  );

  // Active drag item for overlay
  const activeDragItem = useMemo(() => {
    if (!activeId) return null;
    return visibleColumns.find((col) => col.id === activeId);
  }, [activeId, visibleColumns]);

  // Handle field toggle
  const handleToggleField = useCallback(
    async (columnId: string, show: boolean) => {
      if (show) {
        await showColumn(columnId);
      } else {
        await hideColumn(columnId);
      }
    },
    [showColumn, hideColumn]
  );

  // Handle field click
  const handleFieldClick = useCallback(
    (columnId: string) => {
      if (isEditable) {
        setActiveField(columnId || null);
      }
    },
    [isEditable, setActiveField]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submitForm();
    },
    [submitForm]
  );

  // Background color
  const backgroundColor = formViewData?.meta?.background_color || "#F9F9FA";

  // Loading state
  if (isLoading && formColumns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">加载表单中...</p>
            <p className="text-sm text-muted-foreground">请稍候</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div
        className="h-full flex items-center justify-center p-6 overflow-auto"
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
            {formViewData?.success_msg || "感谢您的填写"}
          </p>
          {(formViewData?.submit_another_form || !viewId) && (
            <Button onClick={resetSubmission} variant="outline" size="sm">
              再填一份
            </Button>
          )}
          {formViewData?.show_blank_form && (
            <p className="mt-4 text-xs text-muted-foreground">
              5秒后自动刷新...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Form Area */}
      <ScrollArea className="flex-1" style={{ backgroundColor }}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Form Banner */}
            {!formViewData?.meta?.hide_banner && (
              <div className="h-32 bg-linear-to-br from-primary via-primary/80 to-primary/60 rounded-t-2xl relative overflow-hidden">
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
                    <div className="text-xs font-medium pr-2">
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
                formViewData?.meta?.hide_banner
                  ? "rounded-2xl"
                  : "rounded-t-none rounded-b-2xl"
              )}
            >
              <form onSubmit={handleSubmit}>
                {/* Form Header */}
                <div className="px-6 sm:px-8 space-y-2">
                  {isEditable ? (
                    <Input
                      type="text"
                      value={formViewData?.heading || ""}
                      onChange={(e) =>
                        updateFormView({ heading: e.target.value })
                      }
                      placeholder="表单标题"
                      className="text-2xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-foreground">
                      {formViewData?.heading || ""}
                    </h1>
                  )}

                  {isEditable ? (
                    <Textarea
                      value={formViewData?.subheading || ""}
                      onChange={(e) =>
                        updateFormView({ subheading: e.target.value })
                      }
                      placeholder="添加表单描述，帮助用户理解表单用途..."
                      className="border-none shadow-none px-0 resize-none focus-visible:ring-0 text-muted-foreground placeholder:text-muted-foreground/40 min-h-0"
                      rows={2}
                    />
                  ) : (
                    formViewData?.subheading && (
                      <p className="text-muted-foreground leading-relaxed">
                        {formViewData.subheading}
                      </p>
                    )
                  )}
                </div>

                {/* Form Fields */}
                <div className="px-6 sm:px-8 py-4">
                  {visibleColumns.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/30">
                      <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">
                        暂无可显示的字段
                      </p>
                      {isEditable && (
                        <p className="text-sm text-muted-foreground/70 mt-2">
                          从右侧边栏选择要显示的字段
                        </p>
                      )}
                    </div>
                  ) : isEditable ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={visibleColumns.map((col) => col.id || "")}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {visibleColumns.map((column) => (
                            <SortableField
                              key={column.id}
                              column={column}
                              isEditable={isEditable}
                            >
                              {(dragHandleProps) => (
                                <FormField
                                  column={column}
                                  value={formState[column.title || ""]}
                                  error={validationErrors[column.title || ""]}
                                  isActive={activeFieldId === column.id}
                                  isEditable={isEditable}
                                  isDragging={activeId === column.id}
                                  dragHandleProps={dragHandleProps}
                                  onValueChange={(value) =>
                                    updateFieldValue(column.title || "", value)
                                  }
                                  onFieldClick={() =>
                                    handleFieldClick(column.id || "")
                                  }
                                  onRemove={
                                    !column.required
                                      ? () => hideColumn(column.id!)
                                      : undefined
                                  }
                                />
                              )}
                            </SortableField>
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeDragItem && (
                          <div className="opacity-90">
                            <FormField
                              column={activeDragItem}
                              value={formState[activeDragItem.title || ""]}
                              isActive={true}
                              isEditable={false}
                              isDragging={true}
                            />
                          </div>
                        )}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="space-y-4">
                      {visibleColumns.map((column) => (
                        <FormField
                          key={column.id}
                          column={column}
                          value={formState[column.title || ""]}
                          error={validationErrors[column.title || ""]}
                          isActive={false}
                          isEditable={false}
                          onValueChange={(value) =>
                            updateFieldValue(column.title || "", value)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="px-6 sm:px-8 py-6 border-t flex items-center justify-between gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearForm}
                    className="text-muted-foreground"
                  >
                    清空表单
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || visibleColumns.length === 0}
                    size="lg"
                    className="gap-2 min-w-[120px]"
                  >
                    {isSubmitting ? (
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
            {!formViewData?.meta?.hide_branding && (
              <div className="mt-8 text-center">
                <a
                  href="https://github.com/nocodb/nocodb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Powered by Si-Me™ Engineer Agent
                </a>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sidebar Toggle */}
      {!sidebarOpen && isEditable && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 right-4 z-10 shadow-md"
        >
          <PanelRight className="w-4 h-4" />
        </Button>
      )}

      {/* Sidebar */}
      {isEditable && (
        <FormSidebar
          isOpen={sidebarOpen}
          formViewData={formViewData}
          formColumns={formColumns}
          visibleColumns={visibleColumns}
          activeField={activeField}
          onClose={() => setSidebarOpen(false)}
          onToggleField={handleToggleField}
          onFieldClick={handleFieldClick}
          onUpdateFormView={updateFormView}
          onUpdateColumnMeta={updateColumnMeta}
          onReorderColumns={reorderColumns}
        />
      )}
    </div>
  );
}

export default FormView;
