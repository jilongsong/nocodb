"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { NocoIcon } from "@/app/components/icons";
import { Button, Input } from "@/app/components/ui";
import { useAuth } from '@/app/composables/useAuth'
import { validateEmail } from "@/app/lib/validation";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { signIn, isLoading, error, clearError } = useAuth()
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    
    if (!form.email) {
      errors.email = "邮箱不能为空";
    } else if (!validateEmail(form.email.trim())) {
      errors.email = "请输入有效的邮箱地址";
    }
    
    if (!form.password) {
      errors.password = "密码不能为空";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;

    const success = await signIn({
      email: form.email.trim(),
      password: form.password,
    });

    if (success) {
      const redirectTo = searchParams.get("redirect_to") || "/workspace";
      router.push(redirectTo);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <NocoIcon className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">登录</h1>
          <p className="text-gray-500 mt-2">欢迎回来，请登录您的账户</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              placeholder="邮箱地址"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="text-gray-600">记住我</span>
            </label>
            <Link href="/forgot-password" className="text-[#3366ff] hover:underline">
              忘记密码？
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            登录
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          还没有账户？{" "}
          <Link href="/signup" className="text-[#3366ff] font-medium hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
