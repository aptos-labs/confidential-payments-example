/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_ENVIRONMENT: string
  VITE_PORT: string
  VITE_API_URL: string
  VITE_APP_NAME: string
}

interface Document {
  ENV: ImportMetaEnv
}

declare module '*.md'
