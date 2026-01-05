"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  HelpCircle,
  Share2,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left - Breadcrumb */}
      <div className="flex items-center gap-2">
      </div>
    </header>
  );
}

function TabButton({
  children,
  active = false,
  badge,
}: {
  children: React.ReactNode;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
        active
          ? "text-blue-600 bg-blue-50"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
      {badge !== undefined && (
        <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
          {badge}
        </span>
      )}
    </button>
  );
}
