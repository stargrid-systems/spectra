import { defineNuxtModule, createResolver, addImports, addImportsDir, addPlugin } from "@nuxt/kit";

// aperture openapi ref, bumped by Renovate: ref=openapi sha=a39aabb05e19ae09c983ee599b1f70e577fa5fa5
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
      { name: "userAvatarUrl", from: resolve("./runtime/client") },
      { name: "artifactBlobUrl", from: resolve("./runtime/client") },
    ]);
    addImportsDir(resolve("./runtime/composables"));
    addPlugin(resolve("./runtime/plugins/auth.client.ts"));
  },
});
