'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import MessageBubble, { type Role } from '@/app/ui/dashboard/readingAssistant/messageBubble';
import QuickPrompts from '@/app/ui/dashboard/readingAssistant/quickPrompts';
import Composer from '@/app/ui/dashboard/readingAssistant/composer';
import type { ReadingAssistantBook } from '@/app/ui/dashboard/readingAssistant/bookList';

type Turn = {
  id: string;
  role: Role;
  text: string;
  books?: ReadingAssistantBook[];
  basedOn?: string | null;
  streaming?: boolean;
};

type ReadingAssistantProps = {
  userId: string;
  studentName?: string | null;
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function ReadingAssistant({ userId }: ReadingAssistantProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false); // assistant is replying
  const [hydrating, setHydrating] = useState(true);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Load history on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/generalChatHistory');
        if (!res.ok) return;
        const { messages } = (await res.json()) as {
          messages: Array<{ id: string; sender: 'user' | 'assistant'; text: string; timestamp: string }>;
        };
        if (cancelled || !Array.isArray(messages)) return;
        setTurns(
          messages.map((m) => ({
            id: m.id,
            role: m.sender,
            text: m.text,
          })),
        );
      } catch {
        // silent — keep empty state
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Auto-scroll to bottom on new turns or when assistant starts replying.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  const handleSend = useCallback(
    async (rawMessage?: string) => {
      const message = (rawMessage ?? draft).trim();
      if (!message || busy) return;

      const userTurn: Turn = { id: makeId(), role: 'user', text: message };
      const assistantId = makeId();
      setTurns((prev) => [...prev, userTurn, { id: assistantId, role: 'assistant', text: '', streaming: true }]);
      setDraft('');
      setBusy(true);

      const patchAssistant = (patch: Partial<Turn>) =>
        setTurns((prev) => prev.map((t) => (t.id === assistantId ? { ...t, ...patch } : t)));
      const appendAssistant = (chunk: string) =>
        setTurns((prev) => prev.map((t) => (t.id === assistantId ? { ...t, text: t.text + chunk } : t)));

      try {
        const res = await fetch('/api/reading-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        if (!res.ok || !res.body) {
          const errText = res.status === 400 ? 'That message is a bit long — please shorten it.' : "Sorry — I couldn't reach the assistant just now. Please try again, or ask a librarian directly.";
          patchAssistant({ text: errText, streaming: false });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const eventLine = frame.split('\n').find((l) => l.startsWith('event:'));
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!eventLine) continue;
            const event = eventLine.slice(6).trim();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data: Record<string, any> = {};
            if (dataLine) {
              try { data = JSON.parse(dataLine.slice(5).trim()); }
              catch { continue; }
            }
            if (event === 'delta' && typeof data.text === 'string') appendAssistant(data.text);
            else if (event === 'meta') patchAssistant({ books: data.books, basedOn: data.faqSection ?? null });
            else if (event === 'error') patchAssistant({ text: data.message ?? 'Something went wrong.', books: data.books ?? [], streaming: false });
            else if (event === 'done') patchAssistant({ streaming: false });
          }
        }
        patchAssistant({ streaming: false });
      } catch (err) {
        console.error('[reading-assistant] stream error:', err);
        patchAssistant({ text: "Sorry — the connection dropped. Please try again, or ask a librarian directly.", streaming: false });
      } finally {
        setBusy(false);
      }
    },
    [draft, busy],
  );

  const handleComposerSubmit = useCallback(() => {
    void handleSend();
  }, [handleSend]);

  const handlePromptPick = (prompt: string) => {
    setDraft(prompt);
    void handleSend(prompt);
  };

  const handleClearChat = useCallback(async () => {
    if (busy) return;
    if (!window.confirm('Clear all messages? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/generalChatHistory', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTurns([]);
    } catch (err) {
      console.error('[reading-assistant] clear error:', err);
      window.alert("Couldn't clear chat — please try again.");
    }
  }, [busy]);

  const hasTurns = turns.length > 0;

  return (
    <div className="rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
      <div className="mb-3 flex items-center justify-between border-b border-hairline-soft pb-3 dark:border-dark-hairline">
        <p className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
          Conversation
        </p>
        <button
          type="button"
          onClick={handleClearChat}
          disabled={!hasTurns || busy}
          aria-label="Clear chat"
          className="inline-flex items-center gap-1.5 rounded-btn border border-hairline bg-canvas px-3 py-1.5 font-sans text-body-sm text-body transition hover:border-error/40 hover:bg-error/5 hover:text-error disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:bg-canvas disabled:hover:text-body dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark-soft dark:hover:border-error/50 dark:hover:bg-error/10 dark:hover:text-error"
        >
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
          <span>Clear</span>
        </button>
      </div>

      <div
        ref={feedRef}
        className="min-h-[360px] space-y-4 overflow-y-auto pb-2"
        style={{ maxHeight: 'calc(100vh - 420px)' }}
      >
        {!hydrating && !hasTurns && (
          <p className="font-sans text-body-md text-muted dark:text-on-dark-soft">
            Ask me anything about the library — loans, holds, recommendations, or specific books. Tap a suggestion below to get started.
          </p>
        )}
        {turns.map((t) => (
          <MessageBubble key={t.id} role={t.role} text={t.text} books={t.books} streaming={t.streaming} basedOn={t.basedOn} />
        ))}
      </div>

      <div className="mt-4">
        <QuickPrompts onPick={handlePromptPick} disabled={busy} />
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={handleComposerSubmit}
        disabled={busy}
      />
    </div>
  );
}
