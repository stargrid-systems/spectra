export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const { setupStatus, user, isAuthenticated, mustChangePassword, init } = useAuth();
  const localePath = useLocalePath();

  if (setupStatus.value === "unknown" && user.value === null) {
    await init();
  }

  const name = String(to.name ?? "");
  const isLogin = name.startsWith("login");
  const isSetup = name.startsWith("setup");
  const isChangePassword = name.startsWith("change-password");

  if (setupStatus.value === "required" && !isSetup) {
    return navigateTo(localePath("/setup"));
  }

  if (!isAuthenticated.value) {
    if (isLogin || isSetup) {
      return;
    }
    return navigateTo(localePath("/login"));
  }

  if (mustChangePassword.value && !isChangePassword) {
    return navigateTo(localePath("/change-password"));
  }

  if ((isLogin || isSetup) && !mustChangePassword.value) {
    return navigateTo(localePath("/"));
  }
});
