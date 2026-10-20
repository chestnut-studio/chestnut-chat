export type SettingsPage = "account" | "customization" | "providers" | "about";

export function useSettingsModal() {
  const open = useState("settings-modal:open", () => false);
  const page = useState<SettingsPage>("settings-modal:page", () => "account");

  function show(target: SettingsPage = "account") {
    page.value = target;
    open.value = true;
  }

  function hide() {
    open.value = false;
  }

  return { open, page, show, hide };
}
