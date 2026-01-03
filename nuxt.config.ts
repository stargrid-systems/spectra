import { version } from "./package.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/hints",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "nuxt-charts",
  ],
  css: ["~/assets/css/main.css"],
  i18n: {
    strategy: "prefix",
    defaultLocale: "en",
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "de", language: "de-DE", file: "de.json" },
    ],
  },
  runtimeConfig: {
    public: {
      appVersion: version,
    },
  },
  nitro: {
    compressPublicAssets: true,
  },
});
