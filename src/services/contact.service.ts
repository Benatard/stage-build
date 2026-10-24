import { forgeRepository } from '@/services/forge';
import { forgeConfig, isForgeConfigured } from '@/config/env';

export type ContactPayload = {
  nom: string;
  email: string;
  message: string;
};

function ensureConfigured(): void {
  if (!isForgeConfigured) {
    throw new Error(
      'Forge Console n’est pas configuré. Renseignez VITE_FORGE_PROJECT_KEY et VITE_FORGE_API_KEY dans .env.local.',
    );
  }
}

export const contactApi = {
  async sendMessage(payload: ContactPayload): Promise<void> {
    ensureConfigured();
    await forgeRepository.create<ContactPayload & { id?: string }>(forgeConfig.tables.contact, {
      ...payload,
    });
  },

  async subscribeNewsletter(email: string): Promise<void> {
    ensureConfigured();
    await forgeRepository.create<{ email: string; id?: string }>(forgeConfig.tables.newsletter, {
      email,
    });
  },
};
