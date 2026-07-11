import { defineNuxtModule, createResolver, addImportsDir, addPlugin } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "format",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    addPlugin(resolve("./runtime/plugins/temporal"));
    addImportsDir(resolve("./runtime/composables"));
  },
});
