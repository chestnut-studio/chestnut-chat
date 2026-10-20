import { Icon } from "#components";
import { defineComponent, h, type Component } from "vue";

/** Wraps a Remix icon as a component, for props such as `leading-icon`. */
export function ri(name: string): Component {
  const iconName = `ri:${name}`;
  return defineComponent({
    name: `Ri${name}`,
    inheritAttrs: true,
    setup:
      (_, { attrs }) =>
      () =>
        h(Icon, { ...attrs, name: iconName }),
  });
}

export const ArrowLeft = ri("arrow-left-line");
export const ArrowUp = ri("arrow-up-line");
export const Check = ri("check-line");
export const ChevronDown = ri("arrow-down-s-line");
export const CircleCheck = ri("checkbox-circle-line");
export const CircleHelp = ri("question-line");
export const CircleX = ri("close-circle-line");
export const GitFork = ri("git-fork-line");
export const Globe = ri("global-line");
export const LoaderCircle = ri("loader-4-line");
export const LogIn = ri("login-box-line");
export const LogOut = ri("logout-box-r-line");
export const Monitor = ri("computer-line");
export const Moon = ri("moon-line");
export const PanelLeftClose = ri("sidebar-fold-line");
export const PanelLeftOpen = ri("sidebar-unfold-line");
export const Paperclip = ri("attachment-2");
export const Pencil = ri("pencil-line");
export const Plus = ri("add-line");
export const RefreshCw = ri("refresh-line");
export const RotateCcw = ri("restart-line");
export const Search = ri("search-line");
export const Sparkles = ri("sparkling-2-line");
export const Square = ri("stop-fill");
export const Sun = ri("sun-line");
export const Trash2 = ri("delete-bin-line");
export const X = ri("close-line");
export const Ellipsis = ri("more-line");
export const Copy = ri("file-copy-line");
export const Brain = ri("brain-line");
export const Minus = ri("subtract-line");
export const FileSearch = ri("file-search-line");
export const ExternalLink = ri("external-link-line");
export const Settings2 = ri("settings-3-line");
