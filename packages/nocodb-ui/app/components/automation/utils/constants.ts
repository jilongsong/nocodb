import type { TriggerType, ActionType } from "@/app/composables/useAutomation/types";

// 触发器标签
export const TRIGGER_LABELS: Record<TriggerType, string> = {
  "record.created": "记录创建时",
  "record.updated": "记录更新时",
  "record.deleted": "记录删除时",
  "field.changed": "字段变化时",
  "button.clicked": "按钮点击时",
  "form.submitted": "表单提交时",
  "schedule.cron": "定时触发",
  "schedule.interval": "间隔触发",
  "webhook.received": "Webhook 触发",
};

// 触发器描述
export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  "record.created": "当新记录被创建时自动触发",
  "record.updated": "当记录被更新时自动触发",
  "record.deleted": "当记录被删除时自动触发",
  "field.changed": "当特定字段的值发生变化时触发",
  "button.clicked": "当用户点击按钮时触发",
  "form.submitted": "当表单被提交时触发",
  "schedule.cron": "按照 Cron 表达式定时触发",
  "schedule.interval": "按固定时间间隔触发",
  "webhook.received": "当收到外部 Webhook 请求时触发",
};

// 触发器分类
export const TRIGGER_CATEGORIES = {
  record: ["record.created", "record.updated", "record.deleted", "field.changed", "form.submitted"],
  schedule: ["schedule.cron", "schedule.interval"],
  other: ["button.clicked", "webhook.received"],
} as const;

// 动作标签
export const ACTION_LABELS: Record<ActionType, string> = {
  "record.update": "更新记录",
  "record.create": "创建记录",
  "record.delete": "删除记录",
  "notification.email": "发送邮件",
  "notification.webhook": "调用 Webhook",
  "notification.slack": "发送 Slack 消息",
  "notification.feishu": "发送飞书消息",
  "notification.dingtalk": "发送钉钉消息",
  "notification.wechat": "发送企业微信消息",
  "script.run": "运行脚本",
  "flow.condition": "条件分支",
  "flow.delay": "延迟执行",
  "flow.loop": "循环执行",
};

// 动作描述
export const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  "record.update": "更新当前记录的字段值",
  "record.create": "在当前表或其他表创建新记录",
  "record.delete": "删除当前记录",
  "notification.email": "发送电子邮件通知",
  "notification.webhook": "发送 HTTP 请求到外部服务",
  "notification.slack": "发送消息到 Slack 频道",
  "notification.feishu": "发送消息到飞书群组",
  "notification.dingtalk": "发送消息到钉钉群组",
  "notification.wechat": "发送消息到企业微信群组",
  "script.run": "执行自定义 JavaScript 脚本",
  "flow.condition": "根据条件执行不同的动作路径",
  "flow.delay": "等待一段时间后继续执行",
  "flow.loop": "对多条记录执行相同动作",
};

// 动作分类
export const ACTION_CATEGORIES = {
  record: ["record.update", "record.create", "record.delete"],
  notification: [
    "notification.email",
    "notification.webhook",
    "notification.slack",
    "notification.feishu",
    "notification.dingtalk",
    "notification.wechat",
  ],
  flow: ["flow.condition", "flow.delay", "flow.loop"],
  advanced: ["script.run"],
} as const;

// 动作分类标签
export const ACTION_CATEGORY_LABELS = {
  record: "记录操作",
  notification: "通知",
  flow: "流程控制",
  advanced: "高级",
} as const;

// 触发器分类标签
export const TRIGGER_CATEGORY_LABELS = {
  record: "记录事件",
  schedule: "定时任务",
  other: "其他",
} as const;

// 执行状态标签
export const EXECUTION_STATUS_LABELS = {
  pending: "等待中",
  running: "运行中",
  success: "成功",
  failed: "失败",
  skipped: "已跳过",
  cancelled: "已取消",
} as const;

// 执行状态颜色
export const EXECUTION_STATUS_COLORS = {
  pending: "text-gray-400",
  running: "text-blue-500",
  success: "text-green-500",
  failed: "text-red-500",
  skipped: "text-gray-400",
  cancelled: "text-amber-500",
} as const;

// 错误处理选项
export const ERROR_BEHAVIOR_OPTIONS = [
  { value: "stop", label: "停止执行", description: "发生错误时停止整个自动化" },
  { value: "continue", label: "继续执行", description: "忽略错误继续执行下一个动作" },
  { value: "retry", label: "重试", description: "重试失败的动作" },
] as const;

// 默认重试次数
export const DEFAULT_RETRY_COUNT = 3;

// 默认重试延迟（秒）
export const DEFAULT_RETRY_DELAY_SECONDS = 5;

// 常用 Cron 表达式
export const COMMON_CRON_EXPRESSIONS = [
  { label: "每分钟", value: "* * * * *" },
  { label: "每小时", value: "0 * * * *" },
  { label: "每天 9:00", value: "0 9 * * *" },
  { label: "每天 18:00", value: "0 18 * * *" },
  { label: "每周一 9:00", value: "0 9 * * 1" },
  { label: "每月 1 日 9:00", value: "0 9 1 * *" },
  { label: "工作日 9:00", value: "0 9 * * 1-5" },
] as const;

// 常用时区
export const COMMON_TIMEZONES = [
  { label: "北京时间 (UTC+8)", value: "Asia/Shanghai" },
  { label: "东京时间 (UTC+9)", value: "Asia/Tokyo" },
  { label: "新加坡时间 (UTC+8)", value: "Asia/Singapore" },
  { label: "伦敦时间 (UTC+0)", value: "Europe/London" },
  { label: "纽约时间 (UTC-5)", value: "America/New_York" },
  { label: "洛杉矶时间 (UTC-8)", value: "America/Los_Angeles" },
] as const;

// HTTP 请求方法
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

// 默认 Webhook 请求头
export const DEFAULT_WEBHOOK_HEADERS = {
  "Content-Type": "application/json",
} as const;
