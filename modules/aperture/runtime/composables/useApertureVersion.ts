import { useAsyncData } from "#imports";
import { apertureApi } from "../client";

export function useApertureVersion() {
  return useAsyncData("aperture-version", () => apertureApi.getVersion(), {
    server: false,
  });
}
