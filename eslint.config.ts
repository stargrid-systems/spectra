import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import vueI18n from "@intlify/eslint-plugin-vue-i18n";

export default withNuxt(
  {
    files: ["types/**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/consistent-type-assertions": [
        "warn",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "never",
        },
      ],
    },
  },
  {
    plugins: {
      // Plugin type doesn't match ESLint's flat config plugin type.
      "@intlify/vue-i18n": vueI18n as never,
    },
    settings: {
      "vue-i18n": {
        localeDir: { pattern: "./i18n/locales/*.json" },
      },
    },
    rules: {
      "@intlify/vue-i18n/no-unused-keys": [
        "error",
        {
          src: "./app",
          extensions: [".vue", ".ts"],
        },
      ],
      "@intlify/vue-i18n/no-missing-keys-in-other-locales": "warn",
    },
  },
  eslintConfigPrettier,
);
