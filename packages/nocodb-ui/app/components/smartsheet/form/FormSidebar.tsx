"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Search,
  X,
  ChevronLeft,
  Check,
  Asterisk,
  Type,
  AlignLeft,
  Hash,
  Calendar,
  Clock,
  Mail,
  Globe,
  Phone,
  Star,
  List,
  Layers,
  Image,
  Users,
  CheckSquare,
  Link,
  FileText,
  Settings2,
  Palette,
  LayoutList,
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UITypes } from "nocodb-sdk";
import type { FormColumnType, FormViewData } from "@/app/composables/useFormView";

interface FormSidebarProps {
  isOpen: boolean;
  formViewData: FormViewData | null;
  formColumns: FormColumnType[];
  visibleColumns: FormColumnType[];
  activeField: FormColumnType | null;
  onClose: () => void;
  onToggleField: (columnId: string, show: boolean) => void;
  onFieldClick: (columnId: string) => void;
  onUpdateFormView: (data: Partial<FormViewData>) => void;
  onUpdateColumnMeta: (columnId: string, meta: Partial<FormColumnType>) => void;
  onReorderColumns?: (fromIndex: number, toIndex: number) => void;
}

const BACKGROUND_COLORS = [
  "#FFFFFF", "#F9F9FA", "#FFDBD9", "#FEE6D6", "#FFF0D1",
  "#D4F7E0", "#D7F2FF", "#FED8F4", "#E5D4F5",
];

const getColumnIcon = (uidt?: string) => {
  const iconMap: Record<string, any> = {
    [UITypes.SingleLineText]: Type,
    [UITypes.LongText]: AlignLeft,
    [UITypes.Number]: Hash,
    [UITypes.Decimal]: Hash,
    [UITypes.Currency]: Hash,
    [UITypes.Percent]: Hash,
    [UITypes.Checkbox]: CheckSquare,
    [UITypes.Date]: Calendar,
    [UITypes.DateTime]: Calendar,
    [UITypes.Time]: Clock,
    [UITypes.Email]: Mail,
    [UITypes.URL]: Globe,
    [UITypes.PhoneNumber]: Phone,
    [UITypes.Rating]: Star,
    [UITypes.SingleSelect]: List,
    [UITypes.MultiSelect]: Layers,
    [UITypes.Attachment]: Image,
    [UITypes.User]: Users,
    [UITypes.LinkToAnotherRecord]: Link,
    [UITypes.Links]: Link,
  };
  return iconMap[uidt || ""] || FileText;
};

// Compact sortable field item
function SortableFieldItem({
  column,
  isActive,
  isRequired,
  onFieldClick,
  onToggle,
}: {
  column: FormColumnType;
  isActive: boolean;
  isRequired: boolean;
  onFieldClick: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id || "",
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = getColumnIcon(column.uidt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all cursor-pointer",
        "hover:bg-accent/60",
        isActive && "bg-primary/10 ring-1 ring-primary/30",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onFieldClick}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="w-3 h-3" />
      </div>
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium truncate flex-1">{column.title}</span>
      {isRequired && <Asterisk className="w-2.5 h-2.5 text-destructive shrink-0" />}
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
        disabled={isRequired}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {column.show ? (
          <Eye className={cn("w-3 h-3", isRequired ? "text-muted-foreground/30" : "text-primary")} />
        ) : (
          <EyeOff className="w-3 h-3 text-muted-foreground/40" />
        )}
      </Button>
    </div>
  );
}

// Field settings panel
function FieldSettings({
  field,
  onUpdate,
  onBack,
}: {
  field: FormColumnType;
  onUpdate: (meta: Partial<FormColumnType>) => void;
  onBack: () => void;
}) {
  const Icon = getColumnIcon(field.uidt);
  const isDbRequired = !!(field.rqd && !field.cdf);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center gap-2 bg-muted/30">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onBack}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold truncate">{field.title}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">标签</Label>
            <Input
              value={field.label || field.title || ""}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">帮助文本</Label>
            <Textarea
              value={field.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="添加描述..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>
          <div className="flex items-center justify-between py-2 px-2 rounded bg-muted/40">
            <Label className="text-xs">必填</Label>
            <Switch
              checked={!!(field.required || isDbRequired)}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
              disabled={isDbRequired}
              className="scale-75"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function FormSidebar({
  isOpen,
  formViewData,
  formColumns,
  visibleColumns,
  activeField,
  onClose,
  onToggleField,
  onFieldClick,
  onUpdateFormView,
  onUpdateColumnMeta,
  onReorderColumns,
}: FormSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("fields");
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (activeField) setActiveTab("fields");
  }, [activeField]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDragActiveId(null);
    if (over && active.id !== over.id && onReorderColumns) {
      const oldIndex = formColumns.findIndex((col) => col.id === active.id);
      const newIndex = formColumns.findIndex((col) => col.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) onReorderColumns(oldIndex, newIndex);
    }
  }, [formColumns, onReorderColumns]);

  const filteredColumns: FormColumnType[] = formColumns.filter((col: FormColumnType) =>
    (col.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFieldRequired = (column: FormColumnType): boolean =>
    !!(column.required || (column.rqd && !column.cdf));

  if (!isOpen) return null;

  return (
    <div className="w-64 h-full bg-card border-l flex flex-col overflow-hidden text-sm">
      {activeField ? (
        <FieldSettings
          field={activeField}
          onUpdate={(meta) => onUpdateColumnMeta(activeField.id!, meta)}
          onBack={() => onFieldClick("")}
        />
      ) : (
        <>
          {/* Header */}
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-semibold">表单设置</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-2 pt-2">
              <TabsList className="w-full h-8">
                <TabsTrigger value="fields" className="text-xs gap-1 flex-1">
                  <LayoutList className="w-3 h-3" />
                  字段
                </TabsTrigger>
                <TabsTrigger value="style" className="text-xs gap-1 flex-1">
                  <Palette className="w-3 h-3" />
                  样式
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Fields Tab */}
            <TabsContent value="fields" className="flex-1 flex flex-col mt-0 overflow-hidden">
              <div className="px-2 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索..."
                    className="h-7 text-xs pl-7 pr-7"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="px-2 py-1 flex items-center justify-between text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {visibleColumns.length}/{formColumns.length}
                </Badge>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[10px]"
                  onClick={() => {
                    const allShown = visibleColumns.length === formColumns.length;
                    formColumns.forEach((col) => {
                      if (!isFieldRequired(col) && col.id) onToggleField(col.id, !allShown);
                    });
                  }}
                >
                  {visibleColumns.length === formColumns.length ? "隐藏可选" : "全选"}
                </Button>
              </div>

              <ScrollArea className="flex-1 px-2">
                {filteredColumns.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">无字段</div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setDragActiveId(e.active.id as string)}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={filteredColumns.map((col) => col.id || "")} strategy={verticalListSortingStrategy}>
                      <div className="space-y-0.5 pb-2">
                        {filteredColumns.map((column: FormColumnType) => (
                          <SortableFieldItem
                            key={column.id}
                            column={column}
                            isActive={activeField?.id === column.id}
                            isRequired={isFieldRequired(column)}
                            onFieldClick={() => column.id && onFieldClick(column.id)}
                            onToggle={() => column.id && onToggleField(column.id, !column.show)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {dragActiveId && formColumns.find((c) => c.id === dragActiveId) && (
                        <div className="bg-card border rounded shadow-lg px-2 py-1.5 text-xs">
                          {formColumns.find((c) => c.id === dragActiveId)?.title}
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-4">
                  {/* Background Color */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">背景颜色</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {BACKGROUND_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => onUpdateFormView({ meta: { ...formViewData?.meta, background_color: color } })}
                          className={cn(
                            "w-full aspect-square rounded border transition-all",
                            "hover:scale-105 active:scale-95",
                            formViewData?.meta?.background_color === color
                              ? "ring-2 ring-primary ring-offset-1"
                              : "border-border/50"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {formViewData?.meta?.background_color === color && (
                            <Check className="w-3 h-3 mx-auto text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Settings */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">显示</Label>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/40">
                        <span className="text-xs">隐藏横幅</span>
                        <Switch
                          checked={!!formViewData?.meta?.hide_banner}
                          onCheckedChange={(v) => onUpdateFormView({ meta: { ...formViewData?.meta, hide_banner: v } })}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/40">
                        <span className="text-xs">隐藏品牌</span>
                        <Switch
                          checked={!!formViewData?.meta?.hide_branding}
                          onCheckedChange={(v) => onUpdateFormView({ meta: { ...formViewData?.meta, hide_branding: v } })}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Settings */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">提交后</Label>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/40">
                        <span className="text-xs">5秒后刷新</span>
                        <Switch
                          checked={!!formViewData?.show_blank_form}
                          onCheckedChange={(v) => onUpdateFormView({ show_blank_form: v })}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/40">
                        <span className="text-xs">再次提交</span>
                        <Switch
                          checked={!!formViewData?.submit_another_form}
                          onCheckedChange={(v) => onUpdateFormView({ submit_another_form: v })}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Success Message */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">成功消息</Label>
                    <Textarea
                      value={formViewData?.success_msg || ""}
                      onChange={(e) => onUpdateFormView({ success_msg: e.target.value })}
                      placeholder="🎉 提交成功！"
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default FormSidebar;
