// 根页面 - middleware 会根据认证状态重定向到 /workspace 或 /signin
// 这个页面理论上不会被用户看到，因为 middleware 会先处理

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">正在加载...</p>
      </div>
    </div>
  );
}
