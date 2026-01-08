"use client";

import { useState, useCallback } from "react";
import {
  Share2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Link2,
  Lock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApi } from "@/app/composables/useApi";

interface FormToolbarProps {
  viewId?: string;
  tableId: string;
  tableName?: string;
  viewUuid?: string; // UUID from view data if already shared
  viewPassword?: string; // Password if view is password protected
  readOnly?: boolean;
  isPreviewMode?: boolean; // Whether form is in preview mode
  onShareChange?: () => void; // Callback when share status changes (to reload views)
  onPreviewToggle?: () => void; // Toggle preview mode
}

export function FormToolbar({
  viewId,
  tableId,
  tableName,
  viewUuid,
  viewPassword,
  readOnly = false,
  isPreviewMode = false,
  onShareChange,
  onPreviewToggle,
}: FormToolbarProps) {
  const { api } = useApi();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(!!viewPassword);

  // Check if view is publicly shared (has uuid)
  const isPublicShared = !!viewUuid;

  // Generate share URL using view's uuid directly (like nc-gui)
  const shareUrl = viewUuid
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/form/${viewUuid}`
    : "";

  // Toggle public share (like nc-gui's toggleViewShare)
  const toggleShare = useCallback(async () => {
    if (!viewId || !api) return;

    setIsUpdating(true);
    try {
      if (viewUuid) {
        // Already shared - delete the share
        await api.dbViewShare.delete(viewId);
      } else {
        // Not shared - create share
        await api.dbViewShare.create(viewId);
      }
      // Notify parent to reload views to get updated uuid
      onShareChange?.();
    } catch (error) {
      console.error("Failed to toggle share:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [viewId, api, viewUuid, onShareChange]);

  // Toggle password protection
  const togglePasswordProtection = useCallback(async () => {
    if (!viewId || !api) return;

    setIsUpdating(true);
    try {
      if (isPasswordEnabled) {
        // Disable password - set to null
        await api.dbViewShare.update(viewId, { password: null } as any);
        setIsPasswordEnabled(false);
        setPasswordInput("");
      } else {
        // Enable password mode
        setIsPasswordEnabled(true);
      }
      onShareChange?.();
    } catch (error) {
      console.error("Failed to toggle password:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [viewId, api, isPasswordEnabled, onShareChange]);

  // Update shared view password
  const handleUpdatePassword = useCallback(async () => {
    if (!viewId || !api || !passwordInput) return;

    setIsUpdating(true);
    try {
      await api.dbViewShare.update(viewId, {
        password: passwordInput,
      } as any);
      onShareChange?.();
      setPasswordInput("");
    } catch (error) {
      console.error("Failed to update password:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [viewId, api, passwordInput, onShareChange]);

  // Copy share URL
  const handleCopyUrl = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [shareUrl]);

  // Open share URL in new tab
  const handleOpenUrl = useCallback(() => {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  }, [shareUrl]);


  return (
    <div className="flex items-center gap-2 px-3 py-1.5 h-10 bg-background border-b">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"></div>

      <div className="flex-1" />

      {/* Preview Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPreviewMode ? "default" : "ghost"}
              size="sm"
              onClick={onPreviewToggle}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {isPreviewMode ? "退出预览" : "预览"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPreviewMode ? "返回编辑模式" : "预览表单效果"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Share Button */}
      {!readOnly && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                {isPublicShared ? "分享中" : "分享"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>分享链接</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              分享表单
            </DialogTitle>
            <DialogDescription>
              创建一个公开链接，任何人都可以通过该链接填写表单
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Enable Public View Toggle - like nc-gui */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">启用公开查看</Label>
              <Switch
                checked={isPublicShared}
                onCheckedChange={toggleShare}
                disabled={isUpdating}
              />
            </div>

            {isPublicShared && (
              <>
                {/* Share URL */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="text-xs h-8 font-mono bg-muted flex-1"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={handleOpenUrl}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>在新窗口打开</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={handleCopyUrl}
                          >
                            {copied ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {copied ? "已复制" : "复制链接"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Password Protection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    <Label className="text-sm">使用密码限制访问</Label>
                  </div>
                  <Switch
                    checked={isPasswordEnabled || !!viewPassword}
                    onCheckedChange={togglePasswordProtection}
                    disabled={isUpdating}
                  />
                </div>
                {(isPasswordEnabled || !!viewPassword) && (
                  <div className="flex gap-2 pl-6">
                    <Input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={viewPassword ? "输入新密码" : "设置密码"}
                      className="text-xs h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={handleUpdatePassword}
                      disabled={isUpdating || !passwordInput}
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        viewPassword ? "更新" : "设置"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FormToolbar;
