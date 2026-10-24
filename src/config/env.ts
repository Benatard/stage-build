const env = import.meta.env;

export const appConfig = {
  name: env.VITE_APP_NAME?.trim() || 'FLASH EMPIRE',
} as const;

export const forgeConfig = {
  apiUrl: (env.VITE_FORGE_API_URL?.trim() || 'https://forgeconsole.app/api/public/v1').replace(/\/+$/, ''),
  projectKey: env.VITE_FORGE_PROJECT_KEY?.trim() || '',
  apiKey: env.VITE_FORGE_API_KEY?.trim() || '',
  tables: {
    contact: env.VITE_FORGE_CONTACT_TABLE?.trim() || 'contact_messages',
    newsletter: env.VITE_FORGE_NEWSLETTER_TABLE?.trim() || 'newsletter_subscribers',
  },
} as const;

export const isForgeConfigured = Boolean(forgeConfig.projectKey && forgeConfig.apiKey);
