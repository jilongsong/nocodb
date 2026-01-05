"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi, getStoredToken, setStoredToken } from "@/app/composables/useApi";

interface User {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  roles?: string;
}

interface AppInfo {
  googleAuthEnabled: boolean;
  oidcAuthEnabled: boolean;
  oidcProviderName?: string;
  disableEmailAuth: boolean;
  inviteOnlySignup: boolean;
  ncSiteUrl: string;
  firstUser: boolean;
}

/**
 * 认证相关的 hook
 */
export function useAuth() {
  const router = useRouter();
  const { api, isLoading, error, onError } = useApi({ useGlobalInstance: true });
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // 模拟 appInfo，实际应从 API 获取
  const [appInfo] = useState<AppInfo>({
    googleAuthEnabled: true,
    oidcAuthEnabled: false,
    oidcProviderName: "OpenID Connect",
    disableEmailAuth: false,
    inviteOnlySignup: false,
    ncSiteUrl: process.env.NEXT_PUBLIC_NC_SITE_URL || "",
    firstUser: false,
  });

  const resetError = useCallback(() => {
    setLocalError(null);
  }, []);

  const signIn = useCallback(async (data: { email: string; password: string }) => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const result = await api.auth.signin(data);
      
      if (result.token) {
        setStoredToken(result.token);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "登录失败";
      setLocalError(errorMsg);
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, [api]);

  const signUp = useCallback(async (data: { 
    email: string; 
    password: string; 
    token?: string;
    ignore_subscribe?: boolean;
  }) => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const result = await api.auth.signup(data);
      
      if (result.token) {
        setStoredToken(result.token);
        setIsAuthenticated(true);
        
        return { 
          success: true, 
          createdProject: (result as { createdProject?: { id: string; tables?: { id: string }[] } }).createdProject || null 
        };
      }
      
      return { success: false, createdProject: null };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "注册失败";
      setLocalError(errorMsg);
      return { success: false, createdProject: null };
    } finally {
      setLocalLoading(false);
    }
  }, [api]);

  const signOut = useCallback(async () => {
    setLocalLoading(true);
    
    try {
      await api.auth.signout();
    } catch {
      // 忽略登出错误
    } finally {
      setStoredToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setLocalLoading(false);
      router.push("/signin");
    }
  }, [api, router]);

  const forgotPassword = useCallback(async (email: string) => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      await api.auth.passwordForgot({ email });
      return true;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "发送重置邮件失败";
      setLocalError(errorMsg);
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, [api]);

  const resetPassword = useCallback(async (token: string, password: string) => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      await api.auth.passwordReset(token, { password });
      return true;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "重置密码失败";
      setLocalError(errorMsg);
      return false;
    } finally {
      setLocalLoading(false);
    }
  }, [api]);

  // 检查登录状态
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setIsAuthenticated(true);
      // 获取用户信息
      api.auth.me().then((result) => {
        if (result) {
          setUser(result as User);
        }
      }).catch(() => {
        // Token 无效
        setStoredToken(null);
        setIsAuthenticated(false);
      });
    }
  }, [api]);

  return {
    api,
    user,
    isLoading: isLoading || localLoading,
    error: localError || error,
    isAuthenticated,
    appInfo,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    resetPassword,
    resetError,
  };
}
