"use client";

import { AuthGuard } from "@/app/components/auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAuth={false} redirectIfAuthenticated="/workspace">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        {children}
      </div>
    </AuthGuard>
  );
}
