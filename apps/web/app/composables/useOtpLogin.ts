export function useOtpLogin() {
  const email = useState<string | null>("otp-login:email", () => null);

  function setEmail(value: string) {
    email.value = value;
  }

  function clear() {
    email.value = null;
  }

  return { email, setEmail, clear };
}
