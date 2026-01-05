"use client";

import { Plus, Download, Database } from "lucide-react";
import { Button } from "@/app/components/ui";

export default function WorkspacePage() {
  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          Getting Started
        </h1>
      </div>

      {/* Actions Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            icon={<Plus className="w-6 h-6 text-blue-500" />}
            title="Créer une nouvelle table"
            description="Commencer à partir de zéro."
            color="blue"
          />
          <ActionCard
            icon={<Download className="w-6 h-6 text-orange-500" />}
            title="Importer Données"
            description="Depuis des fichiers et des sources externes."
            color="orange"
          />
          <ActionCard
            icon={<Database className="w-6 h-6 text-green-500" />}
            title="Connecter les données externes"
            description="En temps réel vers des bases de données externes."
            color="green"
          />
        </div>
      </section>

      {/* Recent Tables */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近的表格</h2>
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-8 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无表格</p>
            <Button variant="primary" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              创建第一个表格
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "blue" | "orange" | "green";
}) {
  const borderColors = {
    blue: "hover:border-blue-300",
    orange: "hover:border-orange-300",
    green: "hover:border-green-300",
  };

  return (
    <button
      className={`p-6 bg-white rounded-lg border border-gray-200 text-left transition-all hover:shadow-md ${borderColors[color]}`}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}
