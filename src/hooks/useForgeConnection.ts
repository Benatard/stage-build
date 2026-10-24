import { useCallback, useState } from 'react';
import { forgeRepository } from '@/services/forge';
import { isForgeConfigured } from '@/config/env';

export type ForgeConnectionState = 'idle' | 'checking' | 'success' | 'error';

export function useForgeConnection() {
  const [state, setState] = useState<ForgeConnectionState>('idle');
  const [message, setMessage] = useState('');

  const testConnection = useCallback(async () => {
    if (!isForgeConfigured) {
      setState('error');
      setMessage(
        'Configuration incomplète : VITE_FORGE_PROJECT_KEY et VITE_FORGE_API_KEY sont requis.',
      );
      return;
    }

    setState('checking');
    setMessage('');

    try {
      await forgeRepository.ping();
      setState('success');
      setMessage('Connexion Forge Console opérationnelle.');
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error ? error.message : 'Impossible de joindre Forge Console.',
      );
    }
  }, []);

  return {
    state,
    message,
    testConnection,
    isConfigured: isForgeConfigured,
  };
}
