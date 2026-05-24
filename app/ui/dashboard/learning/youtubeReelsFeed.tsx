'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ── Minimal YT IFrame API typings ────────────────────────────────────────────

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: YTOpts) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTOpts {
  height?: string;
  width?: string;
  videoId?: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number }) => void;
  };
}
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

// ── Topic catalogue ───────────────────────────────────────────────────────────

const TOPICS = [
  { id: 'cs',       emoji: '💻', label: 'Computer Science', query: 'computer science programming tutorial'  },
  { id: 'design',   emoji: '🎨', label: 'Art & Design',     query: 'art design creative tutorial'           },
  { id: 'eng',      emoji: '⚙️',  label: 'Engineering',      query: 'engineering tutorial explanation'       },
  { id: 'finance',  emoji: '📈', label: 'Business',          query: 'business finance economics tutorial'    },
  { id: 'ds',       emoji: '📊', label: 'Data Science',      query: 'data science machine learning tutorial' },
  { id: 'security', emoji: '🔒', label: 'Cyber Security',    query: 'cyber security hacking tutorial'        },
  { id: 'math',     emoji: '🔢', label: 'Mathematics',       query: 'mathematics tutorial explanation'        },
  { id: 'science',  emoji: '🔬', label: 'Science',           query: 'physics chemistry biology tutorial'     },
  { id: 'lang',     emoji: '🌍', label: 'Languages',         query: 'language learning tutorial'             },
  { id: 'health',   emoji: '💊', label: 'Health',            query: 'health medicine wellness tutorial'      },
] as const;

type TopicId = typeof TOPICS[number]['id'];
type ReelVideo = { videoId: string; title: string; channel: string; tags: string[] };

const STORAGE_KEY = 'reels-interests';

// ── InterestPicker ────────────────────────────────────────────────────────────

interface PickerProps {
  initial:       TopicId[];
  onSave:        (ids: TopicId[]) => void;
  onClose?:      () => void;
  isOnboarding?: boolean;
}

function InterestPicker({ initial, onSave, onClose, isOnboarding }: PickerProps) {
  const [sel, setSel] = useState<TopicId[]>(initial);
  const toggle = (id: TopicId) =>
    setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const btnLabel = isOnboarding
    ? sel.length === 0 ? 'Watch all topics' : `Start — ${sel.length} topic${sel.length > 1 ? 's' : ''}`
    : 'Apply';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <h2 className="text-base font-bold text-white">
            {isOnboarding ? 'Pick your topics' : 'Your topics'}
          </h2>
        </div>
        {sel.length > 0 && (
          <span className="text-[11px] font-semibold text-white/40">
            {sel.length} selected
          </span>
        )}
      </div>

      {/* Topic pill bar */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 pb-1">
          {TOPICS.map((t) => {
            const on = sel.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={`w-full rounded-full px-3 py-1.5 text-xs font-semibold text-center transition-all duration-150 active:scale-[0.96] ${
                  on
                    ? 'bg-swin-red text-white shadow-sm shadow-swin-red/30'
                    : 'bg-white/[0.09] text-white/50 hover:bg-white/[0.15] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() =>
            setSel((p) => p.length === TOPICS.length ? [] : TOPICS.map((t) => t.id))
          }
          className="flex-none rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/50 hover:text-white hover:border-white/30 transition"
        >
          {sel.length === TOPICS.length ? 'Clear all' : 'Select all'}
        </button>
        <button
          type="button"
          onClick={() => onSave(sel)}
          className="flex-1 rounded-full bg-white py-2.5 text-sm font-bold text-black transition hover:bg-white/90 active:scale-95"
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}

// ── PlayerCard ────────────────────────────────────────────────────────────────
// Creates a real YT.Player inside a programmatic slot so React never touches
// the element the API replaces with an <iframe>.

interface PlayerCardProps {
  videoId:  string;
  isActive: boolean;
  muted:    boolean;
  ytReady:  boolean;
}

function PlayerCard({ videoId, isActive, muted, ytReady }: PlayerCardProps) {
  const outerRef   = useRef<HTMLDivElement>(null);
  const playerRef  = useRef<YTPlayer | null>(null);
  const isReadyRef = useRef(false);
  const activeRef  = useRef(isActive);
  const mutedRef   = useRef(muted);
  activeRef.current = isActive;
  mutedRef.current  = muted;

  useEffect(() => {
    if (!ytReady || !outerRef.current || !window.YT?.Player) return;

    const container = outerRef.current;
    const slot      = document.createElement('div');
    slot.style.width  = '100%';
    slot.style.height = '100%';
    container.appendChild(slot);

    let destroyed = false;

    const player = new window.YT.Player(slot, {
      height:     '100%',
      width:      '100%',
      videoId,
      playerVars: {
        autoplay:       activeRef.current ? 1 : 0,
        mute:           1,
        loop:           1,
        playlist:       videoId,
        controls:       0,
        rel:            0,
        playsinline:    1,
        enablejsapi:    1,
        modestbranding: 1,
        origin:         window.location.origin,
      },
      events: {
        onReady: (e) => {
          if (destroyed) return;
          isReadyRef.current = true;
          if (activeRef.current && !mutedRef.current) e.target.unMute();
        },
        onStateChange: (e) => {
          if (e.data === 0 && !destroyed) player.playVideo();
        },
      },
    });

    playerRef.current = player;
    return () => {
      destroyed          = true;
      player.destroy();
      playerRef.current  = null;
      isReadyRef.current = false;
    };
  }, [videoId, ytReady]);

  useEffect(() => {
    const p = playerRef.current;
    if (!isReadyRef.current || !p) return;
    if (isActive) {
      p.playVideo();
      muted ? p.mute() : p.unMute();
    } else {
      p.pauseVideo();
      p.mute();
    }
  }, [isActive, muted]);

  return (
    <div
      ref={outerRef}
      className="absolute inset-0 h-full w-full pointer-events-none [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full"
    />
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────

export default function YouTubeReelsFeed() {
  // null = localStorage not yet read
  const [interests,    setInterests]    = useState<TopicId[] | null>(null);
  const [showPicker,   setShowPicker]   = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const [videos,      setVideos]      = useState<ReelVideo[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ytReady,     setYtReady]     = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [muted,       setMuted]       = useState(true);

  const containerRef   = useRef<HTMLDivElement>(null);
  const topicIdxRef    = useRef(0);
  const fetchingRef    = useRef(false);
  // Ref so stable callbacks always read the latest interests without re-creating
  const interestsRef   = useRef<TopicId[]>([]);

  // ── Load interests from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        setInterests([]);
        setIsOnboarding(true);
        setShowPicker(true);
      } else {
        setInterests(JSON.parse(raw) as TopicId[]);
      }
    } catch {
      setInterests([]);
    }
  }, []);

  useEffect(() => { interestsRef.current = interests ?? []; }, [interests]);

  const saveInterests = useCallback((ids: TopicId[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    interestsRef.current = ids;
    setInterests(ids);
    setShowPicker(false);
    setIsOnboarding(false);
  }, []);

  const toggleInterest = useCallback((id: TopicId) => {
    const current = interestsRef.current;
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    saveInterests(updated);
  }, [saveInterests]);

  // ── Load YouTube IFrame API ────────────────────────────────────────────────
  useEffect(() => {
    if (window.YT?.Player) { setYtReady(true); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); setYtReady(true); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = Object.assign(document.createElement('script'), {
        src: 'https://www.youtube.com/iframe_api', async: true,
      });
      document.head.appendChild(s);
    }
  }, []);

  // ── Rotate through selected topics to build variety ───────────────────────
  const nextQuery = useCallback((): string => {
    const sel = TOPICS.filter((t) => interestsRef.current.includes(t.id));
    if (sel.length === 0) return 'programming tutorial';
    const topic = sel[topicIdxRef.current % sel.length];
    topicIdxRef.current = (topicIdxRef.current + 1) % sel.length;
    return topic.query;
  }, []);

  // ── Fetch one batch of videos ──────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const q    = nextQuery();
      const data = await fetch(`/api/youtube-reels?q=${encodeURIComponent(q)}`)
        .then((r) => r.json()) as { videos: ReelVideo[]; nextPageToken: string | null };
      setVideos((prev) => {
        const seen   = new Set(prev.map((v) => v.videoId));
        const unique: ReelVideo[] = [];
        for (const v of data.videos) {
          if (!seen.has(v.videoId)) { seen.add(v.videoId); unique.push(v); }
        }
        return [...prev, ...unique];
      });
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [nextQuery]);

  // ── Reset + initial fetch when interests are finalised / changed ───────────
  useEffect(() => {
    if (interests === null || showPicker) return;
    topicIdxRef.current = 0;
    setVideos([]);
    setActiveIdx(0);
    fetchVideos();
    // fetchVideos is stable (refs only); listed to satisfy linter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interests, showPicker]);

  // ── Load more when user approaches the last 3 cards ───────────────────────
  useEffect(() => {
    if (videos.length > 0 && activeIdx >= videos.length - 3 && !loadingMore && !showPicker) {
      fetchVideos();
    }
  }, [activeIdx, videos.length, loadingMore, showPicker, fetchVideos]);

  // ── IntersectionObserver: which card is centred ───────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || videos.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.55) {
            setActiveIdx(Number((e.target as HTMLElement).dataset.idx));
          }
        }
      },
      { root: container, threshold: 0.55 },
    );
    container.querySelectorAll<HTMLElement>('[data-idx]').forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [videos]);

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(activeIdx + delta, videos.length - 1));
    containerRef.current
      ?.querySelectorAll<HTMLElement>('[data-idx]')[next]
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Interests bar ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          aria-label="Customise interests"
          className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-swin-charcoal/10 text-swin-charcoal transition hover:bg-swin-charcoal/20 active:scale-95 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
        </button>
        <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 -mr-4 pr-4 sm:mr-0 sm:pr-0">
          {TOPICS.map((t) => {
            const on = (interests ?? []).includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleInterest(t.id)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.96] ${
                  on
                    ? 'bg-swin-red text-white shadow-sm shadow-swin-red/30'
                    : 'bg-swin-charcoal/8 text-swin-charcoal/60 hover:bg-swin-charcoal/12 hover:text-swin-charcoal dark:bg-white/[0.08] dark:text-white/50 dark:hover:bg-white/[0.14] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {interests === null ? (
        <div className="relative -mx-4 sm:mx-0 overflow-hidden rounded-none sm:rounded-3xl bg-black h-[calc(100dvh-11rem)] flex items-center justify-center">
          <span className="text-white/30 text-sm animate-pulse">Loading…</span>
        </div>
      ) : showPicker && videos.length === 0 ? (
        <div className="relative -mx-4 sm:mx-0 overflow-hidden rounded-none sm:rounded-3xl bg-neutral-950 border border-white/5 h-[calc(100dvh-11rem)] p-6 flex flex-col">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-64 rounded-full bg-swin-red/20 blur-3xl" />
          <InterestPicker initial={interests} onSave={saveInterests} isOnboarding={isOnboarding} />
        </div>
      ) : (
        <div className="relative -mx-4 sm:mx-0 overflow-hidden rounded-none sm:rounded-3xl bg-black">

      {/* ── Interest edit overlay (while feed is visible behind) ── */}
      {showPicker && (
        <div className="absolute inset-0 z-[65] flex flex-col bg-black/50 backdrop-blur-xl p-6">
          <InterestPicker
            initial={interests!}
            onSave={saveInterests}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}

      {/* ── Top bar: counter ── */}
      <div className="absolute top-3 right-3 z-20 pointer-events-none">
        <span className="rounded-full bg-black/55 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/70 select-none">
          {activeIdx + 1}
        </span>
      </div>

      {/* ── Snap-scroll viewport ── */}
      <div
        ref={containerRef}
        className="h-[calc(100dvh-11rem)] snap-y snap-mandatory overflow-y-scroll overscroll-contain scrollbar-none"
      >
        {videos.map((reel, idx) => {
          const isActive = idx === activeIdx;
          const isNear   = Math.abs(idx - activeIdx) <= 1;

          return (
            <div
              key={reel.videoId}
              data-idx={idx}
              className="snap-start snap-always relative h-full overflow-hidden bg-black"
            >
              {/* Player (active ±1) or blurred thumbnail */}
              {isNear && ytReady ? (
                <PlayerCard
                  videoId={reel.videoId}
                  isActive={isActive}
                  muted={muted}
                  ytReady={ytReady}
                />
              ) : (
                <img
                  src={`https://i.ytimg.com/vi/${reel.videoId}/hqdefault.jpg`}
                  alt={reel.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-40 blur-md scale-105"
                />
              )}

              {/* Gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-14 z-10 px-4 pb-5 pt-16">
                {reel.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {reel.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h3 className="text-white font-semibold text-base sm:text-lg leading-snug line-clamp-2">
                  {reel.title}
                </h3>
                <p className="mt-0.5 text-white/60 text-sm">{reel.channel}</p>
              </div>

              {/* Side action buttons */}
              <div className="absolute bottom-6 right-3 z-10 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setMuted((p) => !p)}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/35 active:scale-95"
                >
                  {muted
                    ? <SpeakerXMarkIcon className="h-5 w-5" />
                    : <SpeakerWaveIcon  className="h-5 w-5" />}
                </button>
                <a
                  href={`https://www.youtube.com/watch?v=${reel.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in YouTube"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/35 active:scale-95"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                </a>
              </div>

              {/* Desktop arrow nav */}
              {isActive && (
                <>
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label="Previous video"
                      className="absolute top-12 left-1/2 z-10 -translate-x-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/35 transition active:scale-95"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next video"
                    className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/35 transition active:scale-95"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* Bottom loading spinner */}
        {loadingMore && (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}
      </div>
        </div>
      )}
    </>
  );
}
