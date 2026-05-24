'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, TrashIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import MessageBubble, { type Role } from '@/app/ui/dashboard/readingAssistant/messageBubble';
import QuickPrompts from '@/app/ui/dashboard/readingAssistant/quickPrompts';
import Composer from '@/app/ui/dashboard/readingAssistant/composer';
import BookList, { type ReadingAssistantBook } from '@/app/ui/dashboard/readingAssistant/bookList';

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
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const sentHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const savedDraftRef = useRef('');

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

  // Show scroll-to-bottom button when user scrolls up in fullscreen.
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(fullscreen && distanceFromBottom > 80);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [fullscreen]);

  // Hide scroll button when exiting fullscreen.
  useEffect(() => {
    if (!fullscreen) setShowScrollBtn(false);
  }, [fullscreen]);

  // Escape key exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const handleSend = useCallback(
    async (rawMessage?: string) => {
      const message = (rawMessage ?? draft).trim();
      if (!message || busy) return;

      const userTurn: Turn = { id: makeId(), role: 'user', text: message };
      const assistantId = makeId();
      setTurns((prev) => [...prev, userTurn, { id: assistantId, role: 'assistant', text: '', streaming: true }]);
      sentHistoryRef.current = [message, ...sentHistoryRef.current];
      historyIdxRef.current = -1;
      savedDraftRef.current = '';
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
            else if (event === 'meta') patchAssistant({ books: data.books?.length ? data.books : undefined, basedOn: data.faqSection ?? null });
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

  const handleHistoryUp = useCallback(() => {
    const history = sentHistoryRef.current;
    if (history.length === 0) return;
    const cur = historyIdxRef.current;
    if (cur === -1) savedDraftRef.current = draft;
    const next = cur === -1 ? 0 : Math.min(cur + 1, history.length - 1);
    historyIdxRef.current = next;
    setDraft(history[next]);
  }, [draft]);

  const handleHistoryDown = useCallback(() => {
    const cur = historyIdxRef.current;
    if (cur === -1) return;
    if (cur === 0) {
      historyIdxRef.current = -1;
      setDraft(savedDraftRef.current);
      return;
    }
    const next = cur - 1;
    historyIdxRef.current = next;
    setDraft(sentHistoryRef.current[next]);
  }, []);

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
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[70] flex flex-col p-6'
          : 'rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card'
      }
      style={
        fullscreen
          ? {
              animation: 'zoomIn 0.25s ease-out',
              backgroundColor: '#ffffff',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            }
          : {
              animation: 'zoomIn 0.35s ease-out',
              transform: inputFocused ? 'scale(1.013)' : 'scale(1)',
              transition: 'transform 0.25s ease-out',
            }
      }
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between border-b border-hairline-soft pb-3 dark:border-dark-hairline">
        <p className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
          Conversation
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-btn border border-hairline bg-canvas text-muted transition hover:bg-surface-cream-strong hover:text-ink dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark"
          >
            {fullscreen
              ? <ArrowsPointingInIcon className="h-4 w-4" />
              : <ArrowsPointingOutIcon className="h-4 w-4" />}
          </button>
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
      </div>

      {/* Message feed */}
      <div className={fullscreen ? 'relative flex-1 overflow-hidden' : 'relative'}>
      <div
        ref={feedRef}
        className={fullscreen ? 'h-full overflow-y-auto pb-2' : 'min-h-[360px] overflow-y-auto pb-2'}
        style={fullscreen ? undefined : { maxHeight: 'calc(100vh - 420px)' }}
      >
        {!hydrating && !hasTurns && (
          <p className="font-sans text-body-md text-muted dark:text-on-dark-soft">
            Ask me anything about the library — loans, holds, recommendations, or specific books. Tap a suggestion below to get started.
          </p>
        )}
        <div className="space-y-4">
          {turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-2">
              <MessageBubble
                role={t.role}
                text={t.text}
                streaming={t.streaming}
                basedOn={t.basedOn}
                onEdit={t.role === 'user' ? () => { historyIdxRef.current = -1; setDraft(t.text); } : undefined}
                onResend={t.role === 'user' ? () => { void handleSend(t.text); } : undefined}
              />
              {t.books && t.books.length > 0 && !t.streaming && (
                <div className="max-w-[88%] self-start">
                  <BookList books={t.books} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {showScrollBtn && (
        <button
          type="button"
          onClick={() => {
            const el = feedRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          }}
          aria-label="Scroll to bottom"
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white shadow-md transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-canvas dark:hover:bg-dark-surface-strong"
        >
          <ArrowDownIcon className="h-4 w-4 text-ink dark:text-on-dark" />
        </button>
      )}
      </div>

      <div className="mt-4">
        <QuickPrompts onPick={handlePromptPick} disabled={busy} />
      </div>

      <Composer
        value={draft}
        onChange={(v) => { historyIdxRef.current = -1; setDraft(v); }}
        onSubmit={handleComposerSubmit}
        disabled={busy}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onHistoryUp={handleHistoryUp}
        onHistoryDown={handleHistoryDown}
      />
    </div>
  );
}
