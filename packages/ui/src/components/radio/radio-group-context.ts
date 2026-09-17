import type { InjectionKey } from "vue";

/**
 * Shared context between RadioGroup and Radio. Ported from BoardUI
 * components/base/radio/radio.tsx (MIT).
 */
export interface RadioGroupContext {
  name: string;
  modelValue: () => string | undefined;
  disabled: boolean;
  select: (value: string) => void;
}

export const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol("radio-group");
