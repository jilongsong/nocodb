"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 认证由 middleware 处理
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      {children}
    </div>
  );
}
