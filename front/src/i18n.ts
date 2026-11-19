import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useAuthStore } from './AuthSlice';
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

const LANGUAGE_KEY = "language";

// The language last shown, so a reload starts in it before the user is fetched.
const getInitialLanguage = (): string => {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored && stored in resources) {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private windows); the default still works.
  }
  return 'de';
};

i18n.on('languageChanged', (lang: string) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // See getInitialLanguage.
  }
});

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

/** However the user arrives (sign-in, reload, settings), speak their language; returns the unsubscribe. */
export function followUserLanguage(): () => void {
  return useAuthStore.subscribe((state, previous) => {
    const language = state.user?.language;
    if (language && language !== previous.user?.language) {
      changeLanguage(language);
    }
  });
}
