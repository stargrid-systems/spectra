import { defineNuxtModule, createResolver, addImports, addImportsDir } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "aperture",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    addImports([{ name: "apertureApi", from: resolve("./runtime/client") }]);
    addImportsDir(resolve("./runtime/composables"));
  },
});
