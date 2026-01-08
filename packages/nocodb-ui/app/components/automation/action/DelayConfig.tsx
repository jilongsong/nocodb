"use client";

import type { ActionConfig } from "@/app/composables/useAutomation/types";

interface DelayConfigProps {
  config: ActionConfig;
  onChange: (config: ActionConfig) => void;
}

const DELAY_UNITS = [
  { value: "seconds", label: "秒", multiplier: 1 },
  { value: "minutes", label: "分钟", multiplier: 60 },
  { value: "hours", label: "小时", multiplier: 3600 },
  { value: "days", label: "天", multiplier: 86400 },
] as const;

export function DelayConfig({ config, onChange }: DelayConfigProps) {
  const delaySeconds = config.delay_seconds || 0;
  
  const getDisplayValue = () => {
    if (delaySeconds >= 86400 && delaySeconds % 86400 === 0) {
      return { value: delaySeconds / 86400, unit: "days" };
    }
    if (delaySeconds >= 3600 && delaySeconds % 3600 === 0) {
      return { value: delaySeconds / 3600, unit: "hours" };
    }
    if (delaySeconds >= 60 && delaySeconds % 60 === 0) {
      return { value: delaySeconds / 60, unit: "minutes" };
    }
    return { value: delaySeconds, unit: "seconds" };
  };

  const display = getDisplayValue();

  const handleValueChange = (value: number, unit: string) => {
    const unitConfig = DELAY_UNITS.find((u) => u.value === unit);
    const seconds = value * (unitConfig?.multiplier || 1);
    onChange({ ...config, delay_seconds: seconds });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">等待指定时间后继续执行</p>

      <div>
        <label className="text-sm text-gray-600 mb-2 block">延迟时间</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            value={display.value}
            onChange={(e) => handleValueChange(parseInt(e.target.value) || 0, display.unit)}
            className="w-20 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-300"
          />
          <div className="flex gap-1">
            {DELAY_UNITS.map((unit) => (
              <button
                key={unit.value}
                type="button"
                onClick={() => handleValueChange(display.value, unit.value)}
                className={`px-3 py-1.5 text-sm rounded border ${
                  display.unit === unit.value
                    ? "bg-gray-100 border-gray-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {unit.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {delaySeconds === 0 && (
        <p className="text-xs text-gray-400">请设置延迟时间</p>
      )}
    </div>
  );
}

export default DelayConfig;
