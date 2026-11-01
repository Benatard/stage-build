import { dataService } from '@/services/data.service';

export type ContactMessageInput = {
  nom: string;
  email: string;
  message: string;
};

export async function sendContactMessage(input: ContactMessageInput): Promise<void> {
  const table = import.meta.env.VITE_FORGE_CONTACT_TABLE?.trim() || 'contact_messages';

  await dataService.createRowUnscoped<{ id: string }>(table, {
    nom: input.nom.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    status: 'nouveau',
  });
}
