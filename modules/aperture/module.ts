import { defineNuxtModule, createResolver, addImports, addImportsDir, addPlugin } from "@nuxt/kit";

// aperture openapi ref, bumped by Renovate: ref=openapi sha=e6f7b0c017082501d076e6d9614d9a9a6ddec621
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
