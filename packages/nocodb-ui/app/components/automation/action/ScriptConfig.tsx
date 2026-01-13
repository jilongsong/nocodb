"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Code2,
  Play,
  Save,
  ChevronDown,
  ChevronRight,
  Variable,
  AlertCircle,
  Info,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
  FileCode,
  Settings,
  Braces,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import type { ActionConfig } from "@/app/composables/useAutomation/types";
import type {
  VariablePickerConfig,
  ActionResultVariable,
  FieldDefinition,
} from "@/app/composables/useAutomation/variableTypes";

interface ScriptConfigProps {
  config: ActionConfig;
  onChange: (config: Partial<ActionConfig>) => void;
  fields?: FieldDefinition[];
  actionResults?: ActionResultVariable[];
  triggerType?: string;
  currentActionOrder?: number;
  actionId?: string;
}

interface ScriptParam {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "variable";
}

const SCRIPT_TEMPLATES = [
  {
    id: "empty",
    name: "空白脚本",
    description: "从零开始编写",
    code: `// 自动化脚本
// 可用变量: record, trigger, action_results, system

async function main(context) {
  const { record, trigger, action_results } = context;
  
  // 在这里编写你的逻辑
  console.log("当前记录:", record);
  
  // 返回结果（可选）
  return {
    success: true,
    data: {}
  };
}

return main(context);`,
  },
  {
    id: "data_transform",
    name: "数据转换",
    description: "转换记录数据格式",
    code: `// 数据转换脚本
async function main(context) {
  const { record } = context;
  
  // 转换数据
  const transformed = {
    ...record,
    processed_at: new Date().toISOString(),
    // 添加你的转换逻辑
  };
  
  return {
    success: true,
    data: transformed
  };
}

return main(context);`,
  },
  {
    id: "api_call",
    name: "API 调用",
    description: "调用外部 API 并处理响应",
    code: `// API 调用脚本
async function main(context) {
  const { record, params } = context;
  
  try {
    const response = await fetch(params.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${params.api_key}\`
      },
      body: JSON.stringify({
        data: record
      })
    });
    
    const result = await response.json();
    
    return {
      success: response.ok,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

return main(context);`,
  },
  {
    id: "validation",
    name: "数据验证",
    description: "验证记录数据是否符合规则",
    code: `// 数据验证脚本
async function main(context) {
  const { record, params } = context;
  const errors = [];
  
  // 示例验证规则
  if (!record.email || !record.email.includes('@')) {
    errors.push('邮箱格式不正确');
  }
  
  if (!record.name || record.name.length < 2) {
    errors.push('名称长度不能小于2');
  }
  
  return {
    success: errors.length === 0,
    data: {
      valid: errors.length === 0,
      errors
    }
  };
}

return main(context);`,
  },
];

export function ScriptConfig({
  config,
  onChange,
  fields = [],
  actionResults = [],
  triggerType,
  currentActionOrder = 0,
  actionId,
}: ScriptConfigProps) {
  const [showCode, setShowCode] = useState(true);
  const [showParams, setShowParams] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "running" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  // 解析脚本参数
  const scriptParams = useMemo((): ScriptParam[] => {
    const params = config.script_params || {};
    return Object.entries(params).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
      type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string",
    }));
  }, [config.script_params]);

  // 更新脚本代码
  const handleCodeChange = useCallback(
    (code: string) => {
      onChange({ script_code: code });
    },
    [onChange]
  );

  // 添加参数
  const handleAddParam = useCallback(() => {
    const currentParams = config.script_params || {};
    const newKey = `param_${Object.keys(currentParams).length + 1}`;
    onChange({
      script_params: {
        ...currentParams,
        [newKey]: "",
      },
    });
  }, [config.script_params, onChange]);

  // 更新参数
  const handleUpdateParam = useCallback(
    (oldKey: string, newKey: string, value: string, type: string) => {
      const currentParams = { ...(config.script_params || {}) };
      delete currentParams[oldKey];
      
      let parsedValue: unknown = value;
      if (type === "number") {
        parsedValue = parseFloat(value) || 0;
      } else if (type === "boolean") {
        parsedValue = value === "true";
      }
      
      currentParams[newKey] = parsedValue;
      onChange({ script_params: currentParams });
    },
    [config.script_params, onChange]
  );

  // 删除参数
  const handleRemoveParam = useCallback(
    (key: string) => {
      const currentParams = { ...(config.script_params || {}) };
      delete currentParams[key];
      onChange({ script_params: currentParams });
    },
    [config.script_params, onChange]
  );

  // 应用模板
  const handleApplyTemplate = useCallback(
    (template: typeof SCRIPT_TEMPLATES[0]) => {
      onChange({ script_code: template.code });
      setShowTemplates(false);
    },
    [onChange]
  );

  // 复制代码
  const handleCopyCode = useCallback(() => {
    if (config.script_code) {
      navigator.clipboard.writeText(config.script_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [config.script_code]);

  // 测试脚本（模拟）
  const handleTestScript = useCallback(async () => {
    setTestResult({ status: "running" });
    
    // 模拟测试
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    try {
      // 简单的语法检查
      if (config.script_code) {
        new Function(config.script_code);
        setTestResult({
          status: "success",
          message: "语法检查通过",
        });
      } else {
        setTestResult({
          status: "error",
          message: "请输入脚本代码",
        });
      }
    } catch (error: any) {
      setTestResult({
        status: "error",
        message: error.message,
      });
    }
  }, [config.script_code]);

  return (
    <div className="space-y-5">
      {/* Script Name */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          脚本名称
        </label>
        <Input
          value={config.script_id || ""}
          onChange={(e) => onChange({ script_id: e.target.value })}
          placeholder="为脚本命名，便于识别"
          className="text-sm"
        />
      </div>

      {/* Templates */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Braces className="w-4 h-4" />
          使用模板
          {showTemplates ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {showTemplates && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SCRIPT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleApplyTemplate(template)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-800">{template.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Script Code */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {showCode ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Code2 className="w-4 h-4 text-gray-400" />
            脚本代码
            <span className="text-red-500">*</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              复制
            </button>
            <button
              type="button"
              onClick={handleTestScript}
              disabled={testResult.status === "running"}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              {testResult.status === "running" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              测试
            </button>
          </div>
        </div>

        {showCode && (
          <div className="relative">
            <div className="absolute top-0 left-0 w-10 h-full bg-gray-50 border-r border-gray-200 rounded-l-lg flex flex-col items-center pt-3 text-xs text-gray-400 select-none overflow-hidden">
              {(config.script_code || "").split("\n").map((_line: string, i: number) => (
                <div key={i} className="leading-5 h-5">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              value={config.script_code || ""}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="// 在这里编写脚本代码..."
              rows={15}
              spellCheck={false}
              className="w-full pl-12 pr-3 py-3 text-sm font-mono leading-5 border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none bg-gray-50"
              style={{ tabSize: 2 }}
            />
          </div>
        )}

        {/* Test Result */}
        {testResult.status !== "idle" && (
          <div
            className={`mt-2 flex items-center gap-2 p-2 rounded-lg text-sm ${
              testResult.status === "running"
                ? "bg-gray-50 text-gray-600"
                : testResult.status === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {testResult.status === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : testResult.status === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Script Parameters */}
      <div>
        <button
          type="button"
          onClick={() => setShowParams(!showParams)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showParams ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <Settings className="w-4 h-4 text-gray-400" />
          脚本参数
          <span className="text-xs text-gray-400 font-normal ml-1">
            ({scriptParams.length} 个)
          </span>
        </button>

        {showParams && (
          <div className="mt-3 space-y-2 pl-5">
            {scriptParams.map((param, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={param.key}
                  onChange={(e) =>
                    handleUpdateParam(param.key, e.target.value, param.value, param.type)
                  }
                  placeholder="参数名"
                  className="w-32 text-sm font-mono"
                />
                <select
                  value={param.type}
                  onChange={(e) =>
                    handleUpdateParam(param.key, param.key, param.value, e.target.value)
                  }
                  className="h-9 px-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="string">字符串</option>
                  <option value="number">数字</option>
                  <option value="boolean">布尔</option>
                </select>
                <Input
                  value={param.value}
                  onChange={(e) =>
                    handleUpdateParam(param.key, param.key, e.target.value, param.type)
                  }
                  placeholder="值"
                  className="flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveParam(param.key)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddParam}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-4 h-4" />
              添加参数
            </button>

            <p className="text-xs text-gray-400">
              参数可在脚本中通过 <code className="px-1 bg-gray-100 rounded">context.params.参数名</code> 访问
            </p>
          </div>
        )}
      </div>

      {/* Context Variables Info */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-500 space-y-3">
            <div>
              <p className="font-medium text-gray-600 mb-2">可用上下文变量</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><code className="px-1 bg-white rounded">record</code> - 当前记录</div>
                <div><code className="px-1 bg-white rounded">result</code> - 前置动作结果</div>
                <div><code className="px-1 bg-white rounded">trigger</code> - 触发器信息</div>
                <div><code className="px-1 bg-white rounded">params</code> - 脚本参数</div>
                <div><code className="px-1 bg-white rounded">system</code> - 系统信息</div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <p className="font-medium text-gray-600 mb-1">前置动作结果访问</p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">{`// 推荐的返回格式
return {
  success: true,
  data: { name: "张三", age: 25 }
};

// 后续脚本访问（统一使用 result）
console.log(result.success);    // true
console.log(result.data);       // { name: "张三", age: 25 }
console.log(result.data.name);  // "张三"
`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Warning */}
      {!config.script_code && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">请输入脚本代码</p>
        </div>
      )}
    </div>
  );
}

export default ScriptConfig;
