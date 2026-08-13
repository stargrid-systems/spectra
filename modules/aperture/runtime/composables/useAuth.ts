import { computed } from "vue";
import { apertureApi } from "../client";
import type { CurrentActor } from "../types";

export type SetupStatus = "unknown" | "required" | "done";

export function useAuth() {
  const user = useState<CurrentActor | null>("auth:user", () => null);
  const setupStatus = useState<SetupStatus>("auth:setup-status", () => "unknown");

  const isAuthenticated = computed(() => user.value !== null);
  const mustChangePassword = computed(() => user.value?.must_change_password ?? false);
  const isAdmin = computed(() => user.value?.roles.includes("admin") ?? false);

  async function fetchMe(): Promise<void> {
    try {
      user.value = await apertureApi.getMe();
    } catch (err) {
      user.value = null;
      if (err instanceof ApiError && err.status !== 401) {
        throw err;
      }
    }
  }

  async function fetchSetupStatus(): Promise<void> {
    const data = await apertureApi.getSetupStatus();
    setupStatus.value = data.setup_required ? "required" : "done";
  }

  async function init(): Promise<void> {
    try {
      await fetchSetupStatus();
    } catch {
      return;
    }
    if (setupStatus.value === "required") {
      user.value = null;
      return;
    }
    try {
      await fetchMe();
    } catch {
      // Leave user state as-is on unexpected errors.
    }
  }

  async function login(username: string, password: string): Promise<void> {
    await apertureApi.login({ username, password });
    await fetchMe();
  }

  async function logout(): Promise<void> {
    try {
      await apertureApi.logout();
    } finally {
      user.value = null;
    }
  }

  async function setupAdmin(username: string, password: string): Promise<void> {
    await apertureApi.setup({ username, password });
    setupStatus.value = "done";
    await fetchMe();
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apertureApi.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    await fetchMe();
  }

  return {
    user,
    setupStatus,
    isAuthenticated,
    mustChangePassword,
    isAdmin,
    fetchMe,
    fetchSetupStatus,
    init,
    login,
    logout,
    setupAdmin,
    changePassword,
  };
}
