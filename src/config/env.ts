const env = import.meta.env;

export const appConfig = {
  name: env.VITE_APP_NAME?.trim() || 'StageBuild',
} as const;

export const forgeConfig = {
  apiUrl: (env.VITE_FORGE_API_URL?.trim() || 'https://forgeconsole.app/api/public/v1').replace(/\/+$/, ''),
  projectKey: env.VITE_FORGE_PROJECT_KEY?.trim() || '',
  apiKey: env.VITE_FORGE_API_KEY?.trim() || '',
} as const;

export const isForgeConfigured = Boolean(forgeConfig.projectKey && forgeConfig.apiKey);

export const saasConfig = {
  multitenancyEnabled: env.VITE_SAAS_MULTITENANT !== 'false',
  defaultInstitutionSlug: env.VITE_DEFAULT_INSTITUTION_SLUG?.trim() || 'institution-principale',
} as const;
