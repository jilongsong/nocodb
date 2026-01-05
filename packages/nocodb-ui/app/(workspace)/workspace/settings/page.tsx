"use client";

import { useState } from "react";
import { Settings, User, Bell, Shield, Database, Palette } from "lucide-react";
import { Button, Input } from "@/app/components/ui";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">设置</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 space-y-1">
          <SettingsNavItem
            icon={<Settings className="w-4 h-4" />}
            label="通用"
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
          />
          <SettingsNavItem
            icon={<User className="w-4 h-4" />}
            label="个人资料"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          <SettingsNavItem
            icon={<Bell className="w-4 h-4" />}
            label="通知"
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
          />
          <SettingsNavItem
            icon={<Shield className="w-4 h-4" />}
            label="安全"
            active={activeTab === "security"}
            onClick={() => setActiveTab("security")}
          />
          <SettingsNavItem
            icon={<Database className="w-4 h-4" />}
            label="数据"
            active={activeTab === "data"}
            onClick={() => setActiveTab("data")}
          />
          <SettingsNavItem
            icon={<Palette className="w-4 h-4" />}
            label="外观"
            active={activeTab === "appearance"}
            onClick={() => setActiveTab("appearance")}
          />
        </nav>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "data" && <DataSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

function SettingsNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        active
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">通用设置</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            工作空间名称
          </label>
          <Input defaultValue="Getting Started" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            工作空间描述
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="添加描述..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            时区
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>UTC+8 (中国标准时间)</option>
            <option>UTC+0 (协调世界时)</option>
            <option>UTC-5 (东部标准时间)</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Button variant="primary">保存更改</Button>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">个人资料</h2>
      
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          U
        </div>
        <Button variant="outline">更换头像</Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用户名
          </label>
          <Input defaultValue="User" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          <Input type="email" defaultValue="user@example.com" />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Button variant="primary">保存更改</Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">通知设置</h2>
      
      <div className="space-y-4">
        <ToggleSetting
          label="邮件通知"
          description="接收重要更新的邮件通知"
          defaultChecked
        />
        <ToggleSetting
          label="浏览器通知"
          description="在浏览器中显示通知"
          defaultChecked={false}
        />
        <ToggleSetting
          label="评论通知"
          description="当有人回复您的评论时通知"
          defaultChecked
        />
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">安全设置</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">修改密码</h3>
          <div className="space-y-3">
            <Input type="password" placeholder="当前密码" />
            <Input type="password" placeholder="新密码" />
            <Input type="password" placeholder="确认新密码" />
          </div>
          <Button variant="primary" className="mt-3">更新密码</Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">两步验证</h3>
          <p className="text-sm text-gray-500 mb-3">
            添加额外的安全层来保护您的账户
          </p>
          <Button variant="outline">启用两步验证</Button>
        </div>
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">数据设置</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">导出数据</h3>
          <p className="text-sm text-gray-500 mb-3">
            导出您的所有数据为 JSON 或 CSV 格式
          </p>
          <div className="flex gap-2">
            <Button variant="outline">导出为 JSON</Button>
            <Button variant="outline">导出为 CSV</Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-medium text-red-600 mb-2">危险区域</h3>
          <p className="text-sm text-gray-500 mb-3">
            删除工作空间将永久删除所有数据，此操作不可撤销
          </p>
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
            删除工作空间
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">外观设置</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-3">主题</h3>
          <div className="flex gap-3">
            <ThemeOption label="浅色" active />
            <ThemeOption label="深色" />
            <ThemeOption label="跟随系统" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">主题色</h3>
          <div className="flex gap-2">
            {["#3366ff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
    </div>
  );
}

function ThemeOption({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg border text-sm ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-600"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
