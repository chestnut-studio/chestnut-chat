export default defineNuxtRouteMiddleware(async () => {
  const authSession = useAuthSession();
  const session = await authSession.ensure();

  if (!session?.user) {
    return navigateTo("/");
  }
});
