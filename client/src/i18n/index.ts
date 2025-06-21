import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import viCommon from './locales/vi/common.json';
import enNavigation from './locales/en/navigation.json';
import viNavigation from './locales/vi/navigation.json';
import enMovies from './locales/en/movies.json';
import viMovies from './locales/vi/movies.json';
import enGenres from './locales/en/genres.json';
import viGenres from './locales/vi/genres.json';
import enAuth from './locales/en/auth.json';
import viAuth from './locales/vi/auth.json';
import enSettings from './locales/en/settings.json';
import viSettings from './locales/vi/settings.json';
import enAdmin from './locales/en/admin.json';
import viAdmin from './locales/vi/admin.json';

const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    movies: enMovies,
    genres: enGenres,
    auth: enAuth,
    settings: enSettings,
    admin: enAdmin,
  },
  vi: {
    common: viCommon,
    navigation: viNavigation,
    movies: viMovies,
    genres: viGenres,
    auth: viAuth,
    settings: viSettings,
    admin: viAdmin,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['path', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
      caches: ['localStorage', 'cookie'],
      cookieMinutes: 60 * 24 * 30, // 30 days
      cookieDomain: process.env.NODE_ENV === 'production' ? '.filmflex.com' : 'localhost',
    },

    interpolation: {
      escapeValue: false,
    },

    defaultNS: 'common',
    ns: ['common', 'navigation', 'movies', 'genres', 'auth', 'settings', 'admin'],
  });

export default i18n;