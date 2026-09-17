import type { InjectionKey } from "vue";

/**
 * Shared context between Tabs, TabList, Tab and TabPanel. Ported from BoardUI
 * components/base/tabs/tabs.tsx (MIT).
 */
export interface TabsContext {
  selectedValue: () => string;
  setValue: (value: string) => void;
  orientation: "horizontal" | "vertical";
}

export const tabsKey: InjectionKey<TabsContext> = Symbol("tabs");
