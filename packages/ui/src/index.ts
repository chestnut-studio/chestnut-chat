/**
 * @chestnut-chat/ui — BoardUI design system ported to Vue 3.
 *
 * Components are ports of BoardUI's React components (MIT licensed,
 * https://github.com/BoardUI/boardui), reimplemented as Vue 3 SFCs. Visual
 * language (semantic tokens, composite typography, dark mode via `.dark`) is
 * carried by the CSS files in src/styles.
 *
 * Styles must be imported by the consuming app (after "tailwindcss"):
 *
 *   @import "tailwindcss";
 *   @import "@chestnut-chat/ui/styles/theme.css";
 *   @import "@chestnut-chat/ui/styles/typography.css";
 *   @import "@chestnut-chat/ui/styles/base.css";
 */

export { cx } from "./utils/cx";

export { default as BButton } from "./components/button/button.vue";
export type { ButtonProps } from "./components/button/button.vue";
export { default as BButtonLink } from "./components/button/button-link.vue";
export type { ButtonLinkProps } from "./components/button/button-link.vue";
export { default as BIconButton } from "./components/button/icon-button.vue";
export type { IconButtonProps } from "./components/button/icon-button.vue";
export { default as BIconLinkButton } from "./components/button/icon-link-button.vue";
export type { IconLinkButtonProps } from "./components/button/icon-link-button.vue";
export { default as BLinkButton } from "./components/button/link-button.vue";
export type { LinkButtonProps } from "./components/button/link-button.vue";
export { default as BCloseButton } from "./components/button/close-button.vue";
export type { CloseButtonProps } from "./components/button/close-button.vue";
export { default as BButtonGroup } from "./components/button/button-group.vue";
export type { ButtonGroupProps } from "./components/button/button-group.vue";
export { default as BButtonGroupItem } from "./components/button/button-group-item.vue";
export type { ButtonGroupItemProps } from "./components/button/button-group-item.vue";

export { default as BBadge } from "./components/badge/badge.vue";
export type { BadgeProps } from "./components/badge/badge.vue";
export { default as BChip } from "./components/badge/chip.vue";
export type { ChipProps } from "./components/badge/chip.vue";
export { default as BStatusDot } from "./components/badge/status-dot.vue";
export type { StatusDotProps } from "./components/badge/status-dot.vue";

export { default as BAvatar } from "./components/avatar/avatar.vue";
export type { AvatarProps } from "./components/avatar/avatar.vue";
export { default as BKbd } from "./components/kbd/kbd.vue";
export { default as BDivider } from "./components/divider/divider.vue";
export type { DividerProps } from "./components/divider/divider.vue";

export { default as BLabel } from "./components/input/label.vue";
export type { LabelProps } from "./components/input/label.vue";
export { default as BHintText } from "./components/input/hint-text.vue";
export type { HintTextProps } from "./components/input/hint-text.vue";
export { default as BInput } from "./components/input/input.vue";
export type { InputProps } from "./components/input/input.vue";
export { default as BTextarea } from "./components/input/textarea.vue";
export type { TextareaProps } from "./components/input/textarea.vue";
export { default as BSelect } from "./components/input/select.vue";
export { default as BFormField } from "./components/input/form-field.vue";
export { default as BOtpInput } from "./components/input/otp-input.vue";

export { default as BModal } from "./components/overlay/modal.vue";
export type { ModalProps } from "./components/overlay/modal.vue";
export { default as BPopover } from "./components/overlay/popover.vue";
export type { PopoverProps } from "./components/overlay/popover.vue";
export { default as BTooltip } from "./components/overlay/tooltip.vue";
export { default as BDropdown } from "./components/dropdown/dropdown.vue";
export type { DropdownItem } from "./components/dropdown/dropdown.vue";
export { default as BSkeleton } from "./components/skeleton/skeleton.vue";
export { default as BCard } from "./components/card/card.vue";

export { default as BCheckbox } from "./components/checkbox/checkbox.vue";
export type { CheckboxProps } from "./components/checkbox/checkbox.vue";

export { default as BSwitch } from "./components/switch/switch.vue";
export type { SwitchProps } from "./components/switch/switch.vue";

export { default as BRadioGroup } from "./components/radio/radio-group.vue";
export type { RadioGroupProps } from "./components/radio/radio-group.vue";
export { default as BRadio } from "./components/radio/radio.vue";
export type { RadioProps } from "./components/radio/radio.vue";
export { default as BRadioDot } from "./components/radio/radio-dot.vue";
export type { RadioDotProps } from "./components/radio/radio-dot.vue";

export { default as BTabs } from "./components/tabs/tabs.vue";
export type { TabsProps } from "./components/tabs/tabs.vue";
export { default as BTabList } from "./components/tabs/tab-list.vue";
export { default as BTab } from "./components/tabs/tab.vue";
export type { TabProps } from "./components/tabs/tab.vue";
export { default as BTabPanel } from "./components/tabs/tab-panel.vue";
export type { TabPanelProps } from "./components/tabs/tab-panel.vue";
