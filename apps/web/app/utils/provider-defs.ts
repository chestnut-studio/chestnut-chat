import type { BuiltinProviderDef } from "~/types/providers";

export const BUILTIN_PROVIDERS: readonly BuiltinProviderDef[] = [
  {
    id: "minimax",
    name: "MiniMax",
    hasBaseUrl: false,
    defaultBaseUrl: "https://api.minimaxi.com/v1",
    keyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    urlPlaceholder: "https://api.minimaxi.com/v1",
    fetchMode: "openai",
  },
  {
    id: "qwen",
    name: "Qwen",
    hasBaseUrl: true,
    defaultBaseUrl: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    keyPlaceholder: "sk-...",
    apiKeyUrl: "https://modelstudio.console.alibabacloud.com/apikey",
    urlPlaceholder: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    fetchMode: "openai",
  },
  {
    id: "zai",
    name: "Z.ai",
    hasBaseUrl: true,
    defaultBaseUrl: "https://api.z.ai/api/paas/v4",
    keyPlaceholder: "...",
    apiKeyUrl: "https://z.ai/manage-apikey/apikey-list",
    urlPlaceholder: "https://api.z.ai/api/paas/v4",
    fetchMode: "openai",
  },
  {
    id: "xiaomimimo",
    name: "Xiaomi MiMo",
    hasBaseUrl: true,
    defaultBaseUrl: "https://api.xiaomimimo.com/v1",
    keyPlaceholder: "sk-... or tp-...",
    apiKeyUrl: "https://platform.xiaomimimo.com/",
    urlPlaceholder: "https://api.xiaomimimo.com/v1",
    fetchMode: "openai",
  },
  {
    id: "doubao",
    name: "Volcano Ark",
    nameKey: "providerNames.doubao",
    hasBaseUrl: false,
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    keyPlaceholder: "...",
    apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    urlPlaceholder: "https://ark.cn-beijing.volces.com/api/v3",
    fetchMode: "openai",
  },
  {
    id: "hunyuan",
    name: "Tencent Hunyuan",
    hasBaseUrl: false,
    defaultBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    keyPlaceholder: "...",
    apiKeyUrl: "https://console.cloud.tencent.com/hunyuan/api-key",
    urlPlaceholder: "https://api.hunyuan.cloud.tencent.com/v1",
    fetchMode: "openai",
  },
  {
    id: "longcat",
    name: "Meituan LongCat",
    hasBaseUrl: true,
    defaultBaseUrl: "https://api.longcat.chat/openai/v1",
    keyPlaceholder: "...",
    apiKeyUrl: "https://longcat.chat/platform/api_keys",
    urlPlaceholder: "https://api.longcat.chat/openai/v1",
    fetchMode: "openai",
  },
  {
    id: "spark",
    name: "iFLYTEK Spark",
    hasBaseUrl: false,
    defaultBaseUrl: "https://spark-api-open.xf-yun.com/v1",
    keyPlaceholder: "...",
    apiKeyUrl: "https://console.xfyun.cn/services/cbm",
    urlPlaceholder: "https://spark-api-open.xf-yun.com/v1",
    fetchMode: "catalog",
  },
  {
    id: "stepfun",
    name: "Jieyue Stepfun",
    hasBaseUrl: true,
    defaultBaseUrl: "https://api.stepfun.com/v1",
    keyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.stepfun.com/interface-key",
    urlPlaceholder: "https://api.stepfun.com/v1",
    fetchMode: "openai",
  },
  {
    id: "wenxin",
    name: "Baidu Wenxin",
    hasBaseUrl: true,
    defaultBaseUrl: "https://qianfan.baidubce.com/v2",
    keyPlaceholder: "**********",
    apiKeyUrl: "https://console.bce.baidu.com/qianfan/ais/console/apiKey",
    urlPlaceholder: "https://qianfan.baidubce.com/v2",
    fetchMode: "openai",
  },
  {
    id: "kimi",
    name: "Kimi",
    hasBaseUrl: false,
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    keyPlaceholder: "...",
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    fetchMode: "openai",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    hasBaseUrl: false,
    defaultBaseUrl: "https://api.deepseek.com",
    keyPlaceholder: "...",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    fetchMode: "openai",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    hasBaseUrl: false,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    keyPlaceholder: "...",
    apiKeyUrl: "https://openrouter.ai/settings/keys",
    fetchMode: "openai",
  },
];

export function getBuiltinProviderDef(id: BuiltinProviderDef["id"]) {
  return BUILTIN_PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Every known default for a provider (localized or legacy). Stored names that
 * match are treated as not customized, so the locale-appropriate default wins
 * regardless of which locale the provider was configured in.
 */
const KNOWN_DEFAULT_NAMES: Partial<Record<BuiltinProviderDef["id"], readonly string[]>> = {
  doubao: ["Doubao", "Volcano Ark", "火山方舟"],
};

/**
 * Resolves a builtin provider's display name. A stored name wins unless it
 * matches the builtin default (localized, English, or legacy), in which case
 * the locale-appropriate default is used.
 */
export function resolveBuiltinProviderName(
  def: BuiltinProviderDef,
  storedName: string | undefined,
  t: (key: string) => string,
) {
  const localized = def.nameKey ? t(def.nameKey) : def.name;
  const trimmed = storedName?.trim();

  if (
    !trimmed ||
    trimmed === def.name ||
    trimmed === localized ||
    KNOWN_DEFAULT_NAMES[def.id]?.includes(trimmed)
  ) {
    return localized;
  }

  return trimmed;
}
