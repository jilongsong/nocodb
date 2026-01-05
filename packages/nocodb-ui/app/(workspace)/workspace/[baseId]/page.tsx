"use client";

import { use } from "react";
import { Plus, Download, Database, Settings, Users, Zap } from "lucide-react";
import { Button } from "@/app/components/ui";

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Base: {baseId}</h1>
        <p className="text-gray-500 mt-1">管理您的数据库和表格</p>
      </div>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            新建表格
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导入数据
          </Button>
          <Button variant="outline">
            <Database className="w-4 h-4 mr-2" />
            连接外部数据源
          </Button>
        </div>
      </section>

      {/* Tabs Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 min-h-[400px]">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-4">
            <TabItem active>概览</TabItem>
            <TabItem>成员</TabItem>
            <TabItem>数据源</TabItem>
            <TabItem>设置</TabItem>
          </nav>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<Database className="w-5 h-5 text-blue-500" />}
              label="表格数量"
              value="0"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-green-500" />}
              label="成员数量"
              value="1"
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-orange-500" />}
              label="自动化"
              value="0"
            />
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-gray-900 mb-4">表格列表</h3>
            <div className="text-center py-12 text-gray-500">
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">此 Base 中暂无表格</p>
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个表格
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabItem({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
