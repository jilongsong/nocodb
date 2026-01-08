"use client";

import { useState, useEffect, useCallback } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import {
  X,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  Phone,
  Image,
  Star,
  List,
  User,
  Clock,
  Percent,
  DollarSign,
  AlignLeft,
  Calculator,
  Search,
  ChevronDown,
  QrCode,
  Barcode,
  MapPin,
  Braces,
  MousePointer,
  Plus as PlusIcon,
  ListOrdered,
  UserPlus,
} from "lucide-react";
import { Button } from "@/app/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Column type categories
const COLUMN_TYPE_CATEGORIES = [
  {
    label: "基础类型",
    types: [
      { value: UITypes.SingleLineText, label: "单行文本", icon: Type },
      { value: UITypes.LongText, label: "多行文本", icon: AlignLeft },
      { value: UITypes.Number, label: "数字", icon: Hash },
      { value: UITypes.Decimal, label: "小数", icon: Hash },
      { value: UITypes.Checkbox, label: "复选框", icon: CheckSquare },
    ],
  },
  {
    label: "日期时间",
    types: [
      { value: UITypes.Date, label: "日期", icon: Calendar },
      { value: UITypes.DateTime, label: "日期时间", icon: Calendar },
      { value: UITypes.Time, label: "时间", icon: Clock },
      { value: UITypes.Duration, label: "时长", icon: Clock },
    ],
  },
  {
    label: "选择类型",
    types: [
      { value: UITypes.SingleSelect, label: "单选", icon: List },
      { value: UITypes.MultiSelect, label: "多选", icon: List },
      { value: UITypes.Rating, label: "评分", icon: Star },
    ],
  },
  {
    label: "联系信息",
    types: [
      { value: UITypes.Email, label: "邮箱", icon: Mail },
      { value: UITypes.URL, label: "链接", icon: Link },
      { value: UITypes.PhoneNumber, label: "电话", icon: Phone },
    ],
  },
  {
    label: "数值类型",
    types: [
      { value: UITypes.Currency, label: "货币", icon: DollarSign },
      { value: UITypes.Percent, label: "百分比", icon: Percent },
      { value: UITypes.AutoNumber, label: "自动编号", icon: ListOrdered },
    ],
  },
  {
    label: "用户与协作",
    types: [
      { value: UITypes.User, label: "用户", icon: User },
      { value: UITypes.CreatedBy, label: "创建人", icon: UserPlus },
      { value: UITypes.LastModifiedBy, label: "修改人", icon: UserPlus },
    ],
  },
  {
    label: "高级类型",
    types: [
      { value: UITypes.Attachment, label: "附件", icon: Image },
      { value: UITypes.Formula, label: "公式", icon: Calculator },
      { value: UITypes.QrCode, label: "二维码", icon: QrCode },
      { value: UITypes.Barcode, label: "条形码", icon: Barcode },
      { value: UITypes.GeoData, label: "地理位置", icon: MapPin },
      { value: UITypes.JSON, label: "JSON", icon: Braces },
      { value: UITypes.Button, label: "按钮", icon: MousePointer },
    ],
  },
];

// Flat list of all column types for filtering
const COLUMN_TYPES = COLUMN_TYPE_CATEGORIES.flatMap((cat) => cat.types);

interface ColumnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: ColumnType | null;
  columnPosition?: { column_order: { view_id: string; order: number } };
  onSave: (data: Partial<ColumnType>, columnPosition?: { column_order: { view_id: string; order: number } }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ColumnEditor({
  open,
  onOpenChange,
  column,
  columnPosition,
  onSave,
  onDelete,
}: ColumnEditorProps) {
  const isEdit = !!column?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [uidt, setUidt] = useState<UITypes>(UITypes.SingleLineText);
  const [description, setDescription] = useState("");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");

  // Options for specific types
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  
  // User type options
  const [allowMultipleUsers, setAllowMultipleUsers] = useState(false);

  // Reset form when column changes
  useEffect(() => {
    if (open) {
      if (column) {
        setTitle(column.title || "");
        setUidt((column.uidt as UITypes) || UITypes.SingleLineText);
        setDescription(column.description || "");
        // Load select options if applicable
        if (column.colOptions?.options) {
          setSelectOptions(column.colOptions.options.map((o: any) => o.title));
        } else {
          setSelectOptions([]);
        }
      } else {
        setTitle("");
        setUidt(UITypes.SingleLineText);
        setDescription("");
        setSelectOptions([]);
        setAllowMultipleUsers(false);
      }
      setShowTypeSelector(false);
      setTypeSearch("");
      setNewOption("");
    }
  }, [open, column]);

  // Filter categories and types by search
  const filteredCategories = typeSearch
    ? COLUMN_TYPE_CATEGORIES.map((cat) => ({
        ...cat,
        types: cat.types.filter(
          (t) =>
            t.label.toLowerCase().includes(typeSearch.toLowerCase()) ||
            t.value.toLowerCase().includes(typeSearch.toLowerCase())
        ),
      })).filter((cat) => cat.types.length > 0)
    : COLUMN_TYPE_CATEGORIES;

  // Filter column types
  const filteredTypes = COLUMN_TYPES.filter(
    (t) =>
      t.label.toLowerCase().includes(typeSearch.toLowerCase()) ||
      t.value.toLowerCase().includes(typeSearch.toLowerCase())
  );

  // Handle save
  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const data: Partial<ColumnType> = {
        title: title.trim(),
        uidt,
        description: description.trim() || undefined,
      };

      // Add select options if applicable
      if (uidt === UITypes.SingleSelect || uidt === UITypes.MultiSelect) {
        (data as any).colOptions = {
          options: selectOptions.map((opt, idx) => ({
            title: opt,
            order: idx + 1,
          })),
        };
      }

      // Add User type meta
      if (uidt === UITypes.User) {
        (data as any).meta = {
          is_multi: allowMultipleUsers,
        };
      }

      await onSave(data, columnPosition);
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to save column:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add option
  const handleAddOption = () => {
    if (newOption.trim() && !selectOptions.includes(newOption.trim())) {
      setSelectOptions([...selectOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  // Handle remove option
  const handleRemoveOption = (index: number) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  // Get selected type info
  const selectedType = COLUMN_TYPES.find((t) => t.value === uidt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑字段" : "添加字段"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Column Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              字段名称
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入字段名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Column Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              字段类型
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                disabled={isEdit}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  {selectedType && <selectedType.icon className="w-4 h-4 text-gray-500" />}
                  <span>{selectedType?.label || "选择类型"}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showTypeSelector && !isEdit && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                  {/* Search */}
                  <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        placeholder="搜索字段类型..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Type List by Category */}
                  <div className="py-1">
                    {filteredCategories.map((category) => (
                      <div key={category.label}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          {category.label}
                        </div>
                        {category.types.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => {
                              setUidt(type.value);
                              setShowTypeSelector(false);
                              setTypeSearch("");
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 ${
                              uidt === type.value ? "bg-blue-50 text-blue-600" : ""
                            }`}
                          >
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Type Options */}
          {uidt === UITypes.User && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="allowMultipleUsers"
                checked={allowMultipleUsers}
                onChange={(e) => setAllowMultipleUsers(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="allowMultipleUsers" className="text-sm text-gray-700">
                允许添加多个用户
              </label>
            </div>
          )}

          {/* Select Options (for SingleSelect/MultiSelect) */}
          {(uidt === UITypes.SingleSelect || uidt === UITypes.MultiSelect) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选项
              </label>
              <div className="space-y-2">
                {selectOptions.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded"
                  >
                    <span className="flex-1 text-sm">{option}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    placeholder="添加选项..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddOption}
                    disabled={!newOption.trim()}
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述 (可选)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入字段描述"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isEdit && onDelete && (
            <Button
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
            >
              删除字段
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? "保存中..." : isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
