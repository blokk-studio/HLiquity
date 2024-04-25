import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./i18n/en.json";

const resources = {
  en: {
    translation: en
  }
};

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  resources,
  interpolation: {
    escapeValue: false
  }
});

export const t = i18n.t;

export const replace = (key: string, options: Record<string, any>) => {
  const translationString = t(key);
  const splitTranslationString = translationString.split(/{{([^}]+)}}/);
  const replaced = splitTranslationString.map((stringOrPlaceholder, index) => {
    if (index % 2 === 1) {
      const replacement = options[stringOrPlaceholder];

      return replacement ?? stringOrPlaceholder;
    }

    return stringOrPlaceholder;
  });

  return replaced;
};

export default i18n;
