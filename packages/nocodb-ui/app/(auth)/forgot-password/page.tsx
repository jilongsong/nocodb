"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { NocoIcon } from "@/app/components/icons";
import { Button, Input } from "@/app/components/ui";
import { useAuth } from "@/app/lib/hooks";
import { validateEmail } from "@/app/lib/validation";

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error, resetError } = useAuth();
  
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();
    setFormError("");
    
    if (!email) {
      setFormError("邮箱不能为空");
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setFormError("请输入有效的邮箱地址");
      return;
    }

    const result = await forgotPassword(email.trim());
    if (result) {
      setSuccess(true);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <NocoIcon className="mb-4" animate={isLoading} />
          <h1 className="text-2xl font-bold text-gray-900">重置密码</h1>
          
          {!success ? (
            <>
              <p className="text-gray-500 mt-2 text-center">
                请输入您的邮箱地址
              </p>
              <p className="text-gray-500 text-sm text-center">
                我们将发送重置密码链接到您的邮箱
              </p>
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 text-green-600">
              <CheckCircle className="w-12 h-12" />
              <p className="text-center">
                重置密码邮件已发送，请检查您的邮箱
              </p>
            </div>
          )}
        </div>

        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <span>{error || formError}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError("");
                  resetError();
                }}
                className="pl-10"
              />
            </div>

            <Button type="submit" className="w-full" loading={isLoading}>
              发送重置邮件
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/signin"
            className="inline-flex items-center gap-1 text-sm text-[#3366ff] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
