import type { PropsWithChildren } from "react";
import {
  I18nextProvider as ReactI18nextProvider,
  initReactI18next,
  Trans,
  useTranslation,
} from "react-i18next";
import i18n from "i18next";

import { env } from "@/config/env";
import { en } from "./locales";

const LOCALE = "en";

export const resources = {
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  debug: env.VITE_APP_ENV === "local",
  fallbackLng: LOCALE,
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  lng: LOCALE,
  resources,
});

export const I18nextProvider = ({ children }: PropsWithChildren) => {
  return <ReactI18nextProvider i18n={i18n}>{children}</ReactI18nextProvider>;
};

export default i18n;

export { Trans, useTranslation };
