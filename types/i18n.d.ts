import type en from "../i18n/locales/en.json";

type MessageSchema = typeof en;

declare module "vue-i18n" {
  export interface DefineLocaleMessage extends MessageSchema {}
}
