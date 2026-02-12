import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ko from './locales/ko';
import en from './locales/en';

const resources = {
  ko: {
    translation: ko,
  },
  en: {
    translation: en,
  },
};

// 기기 언어 설정 확인
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
const supportedLanguages = ['ko', 'en'];
const initialLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
