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

export default i18n;
