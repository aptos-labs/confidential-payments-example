import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import resources from '@/localization/resources'

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false
  }
}

const STORAGE_KEY = 'locale'
const DEFAULT_LOCALE = 'en'

const locale = localStorage?.getItem(STORAGE_KEY) ?? DEFAULT_LOCALE

// for all options read: https://www.i18next.com/overview/configuration-options

i18n.use(initReactI18next).init({
  fallbackLng: locale,
  lng: locale,
  resources,
  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
  },
  returnNull: false,
})

export default i18n
