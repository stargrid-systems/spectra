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
  ],
  css: ["~/assets/css/main.css"],
  i18n: {
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "de", language: "de-DE" },
    ],
    defaultLocale: "en",
  },
  nitro: {
    experimental: {
      tasks: true,
    },
  },
  runtimeConfig: {
    authentikBaseUrl: "",
    authentikAccessToken: "",
  },
});
