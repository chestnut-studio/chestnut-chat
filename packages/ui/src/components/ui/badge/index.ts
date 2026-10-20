import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Badge } from "./Badge.vue";

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-caption-1-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-border-focus-ring transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-badge-new-background text-badge-new-text",
        secondary: "border-transparent bg-badge-neutral-background text-text-secondary",
        destructive:
          "border-transparent bg-notification-error-background text-notification-error-foreground",
        outline:
          "border-border-button-default text-text-primary [a&]:hover:bg-dropdown-item-hover-background",
        success: "border-transparent bg-status-lime-background text-status-lime-text",
        warning: "border-transparent bg-status-yellow-background text-status-yellow-text",
        info: "border-transparent bg-status-blue-background text-status-blue-text",
        cyan: "border-transparent bg-status-cyan-background text-status-cyan-text",
        purple: "border-transparent bg-status-purple-background text-status-purple-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
export type BadgeVariants = VariantProps<typeof badgeVariants>;
