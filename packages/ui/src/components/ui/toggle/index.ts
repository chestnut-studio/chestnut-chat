import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Toggle } from "./Toggle.vue";

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-body-2-medium text-text-primary hover:bg-background-secondary-default disabled:pointer-events-none disabled:text-text-disabled data-[state=on]:bg-background-secondary-default data-[state=on]:text-text-primary [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-border-focus-ring outline-none transition-colors aria-invalid:border-border-error-default whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-border-button-default bg-background-primary-default shadow-card hover:bg-background-primary-hover data-[state=on]:border-accent-500 data-[state=on]:bg-button-ghost-background data-[state=on]:text-button-ghost-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ToggleVariants = VariantProps<typeof toggleVariants>;
