export function useApertureVersion() {
  return useAsyncData("aperture-version", () => apertureApi.getVersion(), {
    server: false,
  });
}
