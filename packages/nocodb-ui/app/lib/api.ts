/**
 * API 配置和实例创建
 * 重新导出 composables/useApi 中的函数
 */

export {
  createApiInstance,
  getGlobalApi,
  extractSdkResponseErrorMsg,
  useApi,
  getStoredToken,
  setStoredToken,
} from "@/app/composables/useApi";

export type { CreateApiOptions, UseApiProps, UseApiReturn } from "@/app/composables/useApi/types";

export { Api } from "nocodb-sdk";
