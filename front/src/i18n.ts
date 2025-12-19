import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from './locales/en/translation.json';
import translationDE from './locales/de/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  de: {
    translation: translationDE,
  },
};

// Get initial language from localStorage or default to 'de'
const getInitialLanguage = (): string => {
  try {
    const userStr = localStorage.getItem("auth_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.language) {
        return user.language;
      }
    }
  } catch {
    // Ignore errors
  }
  return 'de'; // default language
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already escapes values
    },
  });

// Function to change language
export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
};

export default i18n;
