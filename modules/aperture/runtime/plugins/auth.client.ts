export default defineNuxtPlugin(() => {
  setUnauthorizedHandler(() => {
    const { user } = useAuth();
    if (user.value === null) {
      return;
    }
    user.value = null;
    const localePath = useLocalePath();
    navigateTo(localePath("/login"));
  });
});
