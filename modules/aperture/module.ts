import { defineNuxtModule, createResolver, addImports, addImportsDir, addPlugin } from "@nuxt/kit";

// aperture openapi ref, bumped by Renovate: ref=openapi sha=480d9c5fd8925e28157f832f192adcf7d8cc9b12
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
    addPlugin(resolve("./runtime/plugins/auth.client.ts"));
  },
});
