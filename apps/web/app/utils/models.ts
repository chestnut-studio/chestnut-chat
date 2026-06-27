export type ModelOption = {
  value: string;
  label: string;
  providerIcon: "deepseek";
  reasoning: boolean;
};

export const MODELS: ModelOption[] = [
  {
    value: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    providerIcon: "deepseek",
    reasoning: false,
  },
  {
    value: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    providerIcon: "deepseek",
    reasoning: true,
  },
];

export const DEFAULT_MODEL = "deepseek-v4-flash";
