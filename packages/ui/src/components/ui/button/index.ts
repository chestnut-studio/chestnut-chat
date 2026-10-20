import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2lg text-body-2-medium transition-colors disabled:pointer-events-none shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-full [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 aria-invalid:ring-2 aria-invalid:ring-border-error-default",
  {
    variants: {
      variant: {
        default:
          "bg-button-primary text-text-white shadow-checkbox-selected disabled:text-button-primary-disabled-foreground",
        destructive:
          "bg-button-danger text-text-white shadow-checkbox-selected disabled:text-button-primary-disabled-foreground",
        outline:
          "border border-border-button-default bg-background-primary-default text-text-primary shadow-card hover:border-border-button-hover hover:bg-background-primary-hover active:bg-background-primary-active disabled:bg-background-primary-disabled disabled:text-foreground-disabled",
        secondary:
          "bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover active:bg-background-tertiary-default disabled:text-foreground-disabled",
        tint: "bg-button-ghost-background text-button-ghost-foreground hover:bg-button-ghost-hover active:bg-button-ghost-active disabled:bg-button-ghost-disabled disabled:text-button-ghost-disabled-foreground",
        ghost:
          "text-text-primary hover:bg-background-secondary-default active:bg-background-secondary-hover disabled:text-foreground-disabled",
        link: "text-button-ghost-foreground underline-offset-4 hover:underline",
        "muted-link": "text-text-secondary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-caption-1-medium has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
