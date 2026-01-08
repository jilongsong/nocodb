"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  ChevronDown,
  Play,
  Pause,
  Settings,
  Clock,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Dropdown, DropdownItem, DropdownDivider, DropdownLabel } from "@/app/components/ui/Dropdown";
import { useAutomation } from "@/app/composables/useAutomation";
import type { Automation } from "@/app/composables/useAutomation/types";

interface AutomationButtonProps {
  baseId: string;
  tableId: string;
  variant?: "default" | "compact" | "icon";
  onCreateNew?: () => void;
  onManage?: () => void;
}

export function AutomationButton({
  baseId,
  tableId,
  variant = "default",
  onCreateNew,
  onManage,
}: AutomationButtonProps) {
  const router = useRouter();
  const { tableAutomations, toggleActive } = useAutomation(baseId);

  const automations = tableAutomations(tableId);
  const activeCount = automations.filter((a) => a.is_active).length;

  const handleToggleActive = async (automation: Automation) => {
    try {
      await toggleActive(automation.id, !automation.is_active);
    } catch (error) {
      console.error("Toggle automation failed:", error);
    }
  };

  const handleNavigateToAutomations = () => {
    if (onManage) {
      onManage();
    } else {
      router.push(`/workspace/${baseId}/automations`);
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      router.push(`/workspace/${baseId}/automations?create=true&tableId=${tableId}`);
    }
  };

  // Icon only variant
  if (variant === "icon") {
    return (
      <Dropdown
        trigger={
          <Button variant="ghost" size="sm" className="relative">
            <Zap className="w-4 h-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
        }
        align="right"
      >
        <AutomationDropdownContent
          automations={automations}
          onToggleActive={handleToggleActive}
          onCreateNew={handleCreateNew}
          onManage={handleNavigateToAutomations}
        />
      </Dropdown>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <Dropdown
        trigger={
          <Button variant="secondary" size="sm">
            <Zap className="w-4 h-4 mr-1" />
            {activeCount > 0 ? `${activeCount} 运行中` : "自动化"}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        }
        align="right"
      >
        <AutomationDropdownContent
          automations={automations}
          onToggleActive={handleToggleActive}
          onCreateNew={handleCreateNew}
          onManage={handleNavigateToAutomations}
        />
      </Dropdown>
    );
  }

  // Default variant
  return (
    <Dropdown
      trigger={
        <Button variant="secondary">
          <Zap className="w-4 h-4 mr-2" />
          自动化
          {activeCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              {activeCount} 运行中
            </span>
          )}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      }
      align="right"
    >
      <AutomationDropdownContent
        automations={automations}
        onToggleActive={handleToggleActive}
        onCreateNew={handleCreateNew}
        onManage={handleNavigateToAutomations}
      />
    </Dropdown>
  );
}

interface AutomationDropdownContentProps {
  automations: Automation[];
  onToggleActive: (automation: Automation) => void;
  onCreateNew: () => void;
  onManage: () => void;
}

function AutomationDropdownContent({
  automations,
  onToggleActive,
  onCreateNew,
  onManage,
}: AutomationDropdownContentProps) {
  return (
    <div className="w-72">
      {/* Actions */}
      <DropdownItem icon={<Plus className="w-4 h-4" />} onClick={onCreateNew}>
        创建自动化
      </DropdownItem>
      <DropdownItem icon={<Settings className="w-4 h-4" />} onClick={onManage}>
        管理所有自动化
      </DropdownItem>
    </div>
  );
}

export default AutomationButton;
