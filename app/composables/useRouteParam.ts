export function useRouteParam(name: string): ComputedRef<string> {
  const route = useRoute();
  return computed(() => {
    const param = route.params[name];
    if (Array.isArray(param)) {
      return param[0] ?? "";
    }
    return param ?? "";
  });
}
