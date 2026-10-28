import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBookOpen,
  FiCpu,
  FiExternalLink,
  FiRefreshCw,
  FiSend,
  FiUser,
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Form';
import { ROLE_LABELS } from '@/config/permissions';
import { useAuth } from '@/context/AuthContext';
import {
  askAssistant,
  assistantGuideInfo,
  assistantWelcome,
  type AssistantSource,
} from '@/services/assistant.service';
import { fullName } from '@/utils/format';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  sources?: AssistantSource[];
  suggestions?: string[];
};

function clock(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function welcomeMessage(initialRole?: Parameters<typeof assistantWelcome>[0]): ChatMessage {
  const reply = assistantWelcome(initialRole);
  return {
    id: 'welcome',
    role: 'assistant',
    text: reply.answer,
    time: clock(),
    suggestions: reply.suggestions,
  };
}

function MessageBody({ text }: { text: string }) {
  if (!text) return null;
  const [headline, ...rest] = text.split('\n');
  const body = rest.join('\n').trim();

  return (
    <>
      <p className="font-semibold">{headline}</p>
      {body && <p className="mt-2 whitespace-pre-wrap leading-relaxed">{body}</p>}
    </>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="assistant-dot h-2 w-2 rounded-full bg-primary"
            style={{ animationDelay: `${index * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-xs font-medium text-body dark:text-body-dark">
        Analyse du guide…
      </span>
    </div>
  );
}

function SourceCard({ source }: { source: AssistantSource }) {
  const canOpen = source.path?.startsWith('/app');

  return (
    <div className="border border-stroke bg-white p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
        Guide · section {source.section}
      </p>
      <p className="mt-1 text-xs font-semibold text-black dark:text-white">{source.sectionTitle}</p>
      {source.subheading && (
        <p className="mt-0.5 text-[11px] text-body dark:text-body-dark">{source.subheading}</p>
      )}
      {canOpen && source.path && (
        <Link
          to={source.path}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Ouvrir {source.path}
          <FiExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage(user?.role)]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const thinkingRef = useRef(false);
  const replyTimeout = useRef<number | null>(null);
  const guideInfo = useMemo(() => assistantGuideInfo(), []);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, thinking]);

  useEffect(
    () => () => {
      if (replyTimeout.current !== null) window.clearTimeout(replyTimeout.current);
    },
    [],
  );

  function createId(prefix: string): string {
    nextId.current += 1;
    return `${prefix}-${nextId.current}`;
  }

  function clearReplyTimeout() {
    if (replyTimeout.current !== null) {
      window.clearTimeout(replyTimeout.current);
      replyTimeout.current = null;
    }
  }

  function handleAsk(question: string) {
    const trimmed = question.trim();
    if (!trimmed || thinkingRef.current) return;

    const previousSection = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.sources?.length)
      ?.sources?.[0]?.section;

    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      text: trimmed,
      time: clock(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setThinking(true);
    thinkingRef.current = true;

    clearReplyTimeout();

    const startedAt = performance.now();

    replyTimeout.current = window.setTimeout(() => {
      const reply = askAssistant(trimmed, {
        role: user?.role,
        previousSection,
      });
      const elapsed = performance.now() - startedAt;
      const reflection = Math.min(
        1800,
        Math.max(800, 650 + reply.answer.length * 1.2 + Math.random() * 350),
      );

      replyTimeout.current = window.setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: createId('assistant'),
          role: 'assistant',
          text: reply.answer,
          time: clock(),
          sources: reply.sources,
          suggestions: reply.suggestions,
        };

        setMessages((current) => [...current, assistantMessage]);
        setThinking(false);
        thinkingRef.current = false;
        replyTimeout.current = null;
      }, Math.max(0, reflection - elapsed));
    }, 40);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleAsk(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAsk(input);
    }
  }

  function resetConversation() {
    clearReplyTimeout();
    thinkingRef.current = false;
    setThinking(false);
    setMessages([welcomeMessage(user?.role)]);
    setInput('');
  }

  return (
    <div>
      <PageHeader
        eyebrow="Aide"
        title="Assistant IA StageBuild"
        description="Posez une question sur l’utilisation du système. Les réponses sont construites à partir du guide utilisateur, avec les pages et procédures correspondantes."
        actions={
          <Button
            variant="outline"
            onClick={resetConversation}
            disabled={messages.length <= 1}
            icon={<FiRefreshCw className="h-4 w-4" />}
          >
            Effacer la conversation
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="card-root flex min-h-[560px] flex-col border border-stroke dark:border-white/10">
          <div className="flex items-start gap-3 border-b border-stroke px-4 py-4 dark:border-white/10 sm:px-5">
            <span
              className={
                thinking
                  ? 'assistant-avatar-thinking flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary'
              }
            >
              <FiCpu className={thinking ? 'h-5 w-5 animate-pulse' : 'h-5 w-5'} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-black dark:text-white">Assistant du guide</p>
              <p className="mt-0.5 text-xs text-body dark:text-body-dark">
                {thinking
                  ? 'Analyse de votre question…'
                  : user
                    ? `${fullName(user)} · ${ROLE_LABELS[user.role]}`
                    : 'Utilisateur StageBuild'}
              </p>
            </div>
            <span
              className={
                thinking
                  ? 'hidden border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary sm:block'
                  : 'hidden border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:block'
              }
            >
              {thinking ? 'Réflexion' : 'Disponible'}
            </span>
          </div>

          <div
            ref={messagesRef}
            className="min-h-[360px] flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5"
            style={{ maxHeight: 'min(58vh, 640px)' }}
            aria-live="polite"
            aria-busy={thinking}
          >
            {messages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              const isLast = index === messages.length - 1;

              return (
                <div
                  key={message.id}
                  className={
                    isAssistant
                      ? 'assistant-message-in flex gap-3'
                      : 'assistant-message-in flex flex-row-reverse gap-3'
                  }
                >
                  <span
                    className={
                      isAssistant
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10 text-primary'
                        : 'flex h-8 w-8 shrink-0 items-center justify-center bg-black text-white dark:bg-white dark:text-black'
                    }
                  >
                    {isAssistant ? <FiCpu className="h-4 w-4" /> : <FiUser className="h-4 w-4" />}
                  </span>

                  <div className={isAssistant ? 'min-w-0 max-w-[94%]' : 'min-w-0 max-w-[88%]'}>
                    <div
                      className={
                        isAssistant
                          ? 'border border-stroke bg-gray2/70 px-4 py-3 text-sm text-black dark:border-white/10 dark:bg-white/5 dark:text-white'
                          : 'bg-primary px-4 py-3 text-sm text-white'
                      }
                    >
                      {isAssistant ? <MessageBody text={message.text} /> : (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      )}
                    </div>

                    <p
                      className={
                        isAssistant
                          ? 'mt-1.5 text-[10px] text-body dark:text-body-dark'
                          : 'mt-1.5 text-right text-[10px] text-body dark:text-body-dark'
                      }
                    >
                      {message.time}
                    </p>

                    {isAssistant && message.sources && message.sources.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {message.sources.map((source, sourceIndex) => (
                          <SourceCard key={`${message.id}-${sourceIndex}`} source={source} />
                        ))}
                      </div>
                    )}

                    {isAssistant && isLast && message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleAsk(suggestion)}
                            className="border border-stroke bg-white px-3 py-2 text-left text-[11px] font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-body-dark dark:hover:text-white"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {thinking && (
              <div className="assistant-message-in flex gap-3" aria-label="L’assistant réfléchit">
                <span className="assistant-avatar-thinking flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10 text-primary">
                  <FiCpu className="h-4 w-4 animate-pulse" />
                </span>
                <div className="min-w-0 max-w-[94%]">
                  <div className="border border-stroke bg-gray2/70 px-4 py-3 text-sm text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <ThinkingDots />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-stroke px-4 py-4 dark:border-white/10 sm:px-5"
          >
            <div className="flex items-end gap-3">
              <Textarea
                value={input}
                rows={2}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex. : Comment inscrire un stagiaire ?"
                className="min-h-[52px] resize-none"
                aria-label="Votre question"
              />
              <Button
                type="submit"
                disabled={!input.trim()}
                loading={thinking}
                icon={<FiSend className="h-4 w-4" />}
                className="shrink-0"
              >
                {thinking ? 'Réflexion...' : 'Envoyer'}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-body dark:text-body-dark">
              Entrée pour envoyer, Maj+Entrée pour aller à la ligne. L’assistant analyse le guide
              avant de répondre.
            </p>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="card-root border border-stroke p-5 dark:border-white/10">
            <div className="flex items-center gap-2 text-primary">
              <FiBookOpen className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-wide">Base de connaissances</p>
            </div>
            <p className="mt-3 text-sm font-semibold text-black dark:text-white">
              Guide utilisateur StageBuild
            </p>
            <p className="mt-1 text-xs leading-relaxed text-body dark:text-body-dark">
              {guideInfo.sections} sections et {guideInfo.blocks} passages indexés. L’assistant
              recherche la procédure la plus proche de votre question.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-gray2 p-3 dark:bg-white/5">
                <p className="text-lg font-bold text-black dark:text-white">{guideInfo.sections}</p>
                <p className="text-[10px] uppercase tracking-wide text-body dark:text-body-dark">
                  Sections
                </p>
              </div>
              <div className="bg-gray2 p-3 dark:bg-white/5">
                <p className="text-lg font-bold text-black dark:text-white">{guideInfo.blocks}</p>
                <p className="text-[10px] uppercase tracking-wide text-body dark:text-body-dark">
                  Passages
                </p>
              </div>
            </div>
          </div>

          <div className="card-root border border-stroke p-5 dark:border-white/10">
            <p className="text-xs font-bold uppercase tracking-wide text-body dark:text-body-dark">
              Pour de meilleures réponses
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-body dark:text-body-dark">
              <li>Indiquez l’action : créer, modifier, publier, imprimer, supprimer.</li>
              <li>Ajoutez la page concernée : notes, présences, bulletins, réservations.</li>
              <li>Pour un problème, décrivez le message ou le bouton qui ne fonctionne pas.</li>
              <li>Pour un rôle, précisez le profil : stagiaire, formateur ou administration.</li>
            </ul>
          </div>

          <div className="border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            L’assistant ne modifie aucune donnée et ne remplace pas l’administrateur. En cas de
            problème d’accès, de suppression ou de sécurité, contactez la personne responsable du
            système.
          </div>
        </aside>
      </div>
    </div>
  );
}
