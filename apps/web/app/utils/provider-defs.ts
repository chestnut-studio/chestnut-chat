import type { BuiltinProviderDef } from "~/types/providers";

export const BUILTIN_PROVIDERS: readonly BuiltinProviderDef[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "i-simple-icons-openai",
    hasBaseUrl: true,
    defaultBaseUrl: "https://api.openai.com/v1",
    keyPlaceholder: "sk-...",
    urlPlaceholder: "https://api.openai.com/v1",
    fetchMode: "openai",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "i-simple-icons-anthropic",
    hasBaseUrl: false,
    keyPlaceholder: "sk-ant-...",
    fetchMode: "anthropic",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "i-simple-icons-googlegemini",
    hasBaseUrl: false,
    keyPlaceholder: "AIza...",
    fetchMode: "gemini",
  },
  {
    id: "kimi",
    name: "Kimi",
    icon: "i-simple-icons-moonshotai",
    hasBaseUrl: false,
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    keyPlaceholder: "sk-...",
    fetchMode: "openai",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "i-simple-icons-deepseek",
    hasBaseUrl: false,
    defaultBaseUrl: "https://api.deepseek.com",
    keyPlaceholder: "sk-...",
    fetchMode: "openai",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "i-simple-icons-openrouter",
    hasBaseUrl: false,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    keyPlaceholder: "sk-or-...",
    fetchMode: "openai",
  },
];

export function getBuiltinProviderDef(id: BuiltinProviderDef["id"]) {
  return BUILTIN_PROVIDERS.find((provider) => provider.id === id);
}
