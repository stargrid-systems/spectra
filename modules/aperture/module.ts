import { defineNuxtModule, createResolver, addImports, addImportsDir } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "aperture",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    addImports([
      { name: "apertureApi", from: resolve("./runtime/client") },
      { name: "ApiError", from: resolve("./runtime/client") },
      { name: "setUnauthorizedHandler", from: resolve("./runtime/client") },
    ]);
    addImportsDir(resolve("./runtime/composables"));
  },
});
