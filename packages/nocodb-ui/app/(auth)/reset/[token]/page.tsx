"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { NocoIcon } from "@/app/components/icons";
import { Button, Input } from "@/app/components/ui";
import { useAuth } from "@/app/lib/hooks";
import { validatePassword } from "@/app/lib/validation";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { resetPassword, isLoading, error, resetError } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();
    setFormError("");
    
    // 验证密码匹配
    if (form.password !== form.confirmPassword) {
      setFormError("两次输入的密码不一致");
      return;
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.valid) {
      setFormError(passwordValidation.error);
      return;
    }

    const success = await resetPassword(token, form.password);
    if (success) {
      // 重置成功，跳转到登录页
      router.push("/signin?reset=success");
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <NocoIcon className="mb-4" animate={isLoading} />
          <h1 className="text-2xl font-bold text-gray-900">设置新密码</h1>
          <p className="text-gray-500 mt-2 text-center">
            请输入您的新密码
          </p>
        </div>

        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error || formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="新密码"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setFormError("");
                resetError();
              }}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="确认新密码"
              value={form.confirmPassword}
              onChange={(e) => {
                setForm({ ...form, confirmPassword: e.target.value });
                setFormError("");
                resetError();
              }}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            密码需要至少 8 个字符，包含大小写字母和数字
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            重置密码
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/signin"
            className="text-sm text-[#3366ff] hover:underline"
          >
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
