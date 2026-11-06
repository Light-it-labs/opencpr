import type { PropsWithChildren } from "react";
import {
  I18nextProvider as ReactI18nextProvider,
  initReactI18next,
  Trans,
  useTranslation,
} from "react-i18next";
import i18n from "i18next";

import { env } from "@/config/env";
import { getLanguage } from "@/stores";
import { en, es } from "./locales";

export const LANGUAGES = {
  EN: "en",
  ES: "es",
} as const;

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export const DEFAULT_LANGUAGE = LANGUAGES.EN;

const isLanguage = (value: string): value is Language => {
  return Object.values<string>(LANGUAGES).includes(value);
};

// A visitor's phone has no kiosk setup behind it, so it follows the phone's own language.
const getBrowserLanguage = () => {
  const [code = ""] = navigator.language.split("-");

  return isLanguage(code) ? code : null;
};

export const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

i18n.use(initReactI18next).init({
  debug: env.VITE_APP_ENV === "local",
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  lng: getLanguage() ?? getBrowserLanguage() ?? DEFAULT_LANGUAGE,
  resources,
});

export const I18nextProvider = ({ children }: PropsWithChildren) => {
  return <ReactI18nextProvider i18n={i18n}>{children}</ReactI18nextProvider>;
};

export default i18n;

export { Trans, useTranslation };
