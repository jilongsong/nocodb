"use client";

import { useState } from "react";
import { Sidebar } from "@/app/components/workspace/Sidebar";
// import { Header } from "@/app/components/workspace/Header";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 认证由 middleware 处理
  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* <Header /> */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
