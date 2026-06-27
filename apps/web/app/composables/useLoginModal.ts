export function useLoginModal() {
  const open = useState("login-modal:open", () => false);

  function show() {
    open.value = true;
  }

  function hide() {
    open.value = false;
  }

  return { open, show, hide };
}
