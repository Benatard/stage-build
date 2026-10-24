/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_FORGE_API_URL?: string;
  readonly VITE_FORGE_PROJECT_KEY?: string;
  readonly VITE_FORGE_API_KEY?: string;
  readonly VITE_FORGE_CONTACT_TABLE?: string;
  readonly VITE_FORGE_NEWSLETTER_TABLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
