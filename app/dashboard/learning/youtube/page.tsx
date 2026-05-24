import Link from 'next/link';
import { SparklesIcon, ExclamationTriangleIcon, HashtagIcon } from '@heroicons/react/24/outline';
import {
  getLearningStatus,
  getLearningTrending,
  searchLearningCourses,
} from '@/app/lib/learning/service';
import type { YouTubeLevel } from '@/app/lib/youtube/types';
import YouTubeSearchForm from '@/app/ui/dashboard/learning/searchForm';
import SearchResultsPanel from '@/app/ui/dashboard/learning/searchResultsPanel';
import AdminShell from '@/app/ui/dashboard/adminShell';
import ScrollUnlock from '@/app/ui/dashboard/learning/scrollUnlock';
import CommunityFeed from '@/app/ui/dashboard/learning/communityFeed';
import NewsFeed from '@/app/ui/dashboard/learning/newsFeed';
import { type NewsItem } from '@/app/ui/dashboard/learning/newsGrid';

// ─── Constants ────────────────────────────────────────────────────────────────

const YT_QUICK_FILTERS = [
  { label: 'Engineering',        query: 'engineering' },
  { label: 'Computer Science',   query: 'computer science' },
  { label: 'Cyber Security',     query: 'cyber security' },
  { label: 'Data Science',       query: 'data science' },
  { label: 'Business & Finance', query: 'business finance' },
  { label: 'Design',             query: 'design' },
];

const DEVTO_TAGS = [
  { label: 'All',            value: '',                emoji: '✨' },
  { label: 'Programming',    value: 'programming',     emoji: '💻' },
  { label: 'Computer Sci.',  value: 'computerscience', emoji: '🖥️' },
  { label: 'Data Science',   value: 'datascience',     emoji: '📊' },
  { label: 'Cyber Security', value: 'security',        emoji: '🔒' },
  { label: 'Cloud',          value: 'cloud',           emoji: '☁️' },
  { label: 'Engineering',    value: 'engineering',     emoji: '⚙️' },
  { label: 'AI / ML',        value: 'machinelearning', emoji: '🤖' },
  { label: 'Design',         value: 'ux',              emoji: '🎨' },
  { label: 'Career',         value: 'career',          emoji: '📈' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDifficulty = (v?: string): YouTubeLevel | 'ALL' => {
  if (!v) return 'ALL';
  const n = v.trim().toUpperCase();
  if (n === 'BEGINNER' || n === 'INTERMEDIATE' || n === 'ADVANCED') return n as YouTubeLevel;
  return 'ALL';
};

const buildYtHref = (query: string, difficulty: YouTubeLevel | 'ALL') => {
  const p = new URLSearchParams({ view: 'youtube' });
  p.set('q', query);
  if (difficulty && difficulty !== 'ALL') p.set('difficulty', difficulty);
  return `/dashboard/learning/youtube?${p.toString()}`;
};

const difficultyLabel = (v: YouTubeLevel | 'ALL') => {
  if (!v || v === 'ALL') return 'All levels';
  if (v === 'BEGINNER') return 'Beginner';
  if (v === 'INTERMEDIATE') return 'Intermediate';
  if (v === 'ADVANCED') return 'Advanced';
  return v;
};

async function fetchDevToArticles(tag: string) {
  try {
    const url = tag
      ? `https://dev.to/api/articles?top=30&per_page=18&tag=${encodeURIComponent(tag)}`
      : `https://dev.to/api/articles?top=30&per_page=18`;
    const res = await fetch(url, { next: { revalidate: 3600 }, headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function fetchNewsFromRSS(): Promise<NewsItem[]> {
  const feeds = [
    { name: 'BBC Technology',  url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
    { name: 'TechCrunch',      url: 'https://techcrunch.com/feed/' },
    { name: 'The Verge',       url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Ars Technica',    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
    { name: 'Engadget',        url: 'https://www.engadget.com/rss.xml' },
  ];

  function extractImage(xml: string): string | null {
    // media:content or media:thumbnail
    let m = xml.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/);
    if (m) return m[1];
    // enclosure image
    m = xml.match(/<enclosure[^>]+type="image[^"]*"[^>]+url="([^"]+)"/);
    if (!m) m = xml.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image[^"]*"/);
    if (m) return m[1];
    // img inside description/content
    m = xml.match(/<img[^>]+src="([^"]+)"/);
    if (m && !m[1].includes('pixel') && !m[1].includes('spacer')) return m[1];
    return null;
  }

  function extractText(tag: string, xml: string): string {
    const m = xml.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}(?:[^>]*)>([\\s\\S]*?)<\/${tag}>`));
    const raw = m ? (m[1] ?? m[2] ?? '') : '';
    return raw.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'Mozilla/5.0 SwinburneLibrary/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      const items: NewsItem[] = [];
      const itemRx = /<item[\s\S]*?<\/item>/g;
      let match;
      while ((match = itemRx.exec(xml)) !== null && items.length < 6) {
        const itemXml = match[0];
        const title   = extractText('title', itemXml);
        const url     = extractText('link', itemXml) || (itemXml.match(/<link>([^<]+)<\/link>/) ?? [])[1] || '';
        const desc    = extractText('description', itemXml).slice(0, 200);
        const pubDate = extractText('pubDate', itemXml) || extractText('published', itemXml);
        const image   = extractImage(itemXml);
        if (title && url) items.push({ id: `${feed.name}-${url}`, title, description: desc, url, imageUrl: image, source: feed.name, pubDate });
      }
      return items;
    })
  );

  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  // Shuffle to interleave sources
  return all.sort(() => Math.random() - 0.5).slice(0, 20);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LearningHubPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const params = searchParams ? await searchParams : {};

  const view        = typeof params?.view === 'string' ? params.view : 'youtube';
  const isYouTube   = view === 'youtube';
  const isCommunity = view === 'community';
  const isNews      = view === 'news';

  // YouTube params
  const queryParam   = typeof params?.q === 'string' ? params.q : '';
  const difficulty   = parseDifficulty(typeof params?.difficulty === 'string' ? params.difficulty : undefined);
  const trimmedQuery = queryParam.trim();

  // Dev.to params
  const activeTag = typeof params?.tag === 'string' ? params.tag : '';
  const tagMeta   = DEVTO_TAGS.find((t) => t.value === activeTag) ?? DEVTO_TAGS[0];

  // Fetch only what the active tab needs
  const learningStatus = isYouTube ? await getLearningStatus() : null;

  const [searchResult, trendingResult] = isYouTube && trimmedQuery
    ? [await searchLearningCourses({ query: trimmedQuery, limit: 12, difficulty }), null]
    : isYouTube
    ? [null, await getLearningTrending({ limit: 12, difficulty })]
    : [null, null];

  const devToArticles = isCommunity ? await fetchDevToArticles(activeTag) : [];
  const hnStories = isNews ? await fetchNewsFromRSS() : [];

  const tabBase = '/dashboard/learning/youtube';

  return (
    <AdminShell
      titleSubtitle="Online learning resources"
      title="Learning Hub"
      description="Watch tutorials, browse dev articles, and read top tech news — all in one place."
    >
      <ScrollUnlock />
      <div className="space-y-8">

        {/* ── 3-tab switcher ── */}
        <div className="flex w-full max-w-md overflow-hidden rounded-full border border-swin-charcoal/10 bg-swin-charcoal/5 p-1 dark:border-white/10 dark:bg-white/5">
          {[
            { label: '🎬 YouTube',   value: 'youtube',   href: `${tabBase}?view=youtube`   },
            { label: '📖 Community', value: 'community', href: `${tabBase}?view=community` },
            { label: '📰 News',      value: 'news',      href: `${tabBase}?view=news`      },
          ].map((tab) => {
            const active = view === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.href}
                className={`flex-1 rounded-full py-2 text-center text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? 'bg-swin-red text-white shadow-sm'
                    : 'text-swin-charcoal/60 hover:text-swin-charcoal dark:text-white/50 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            YOUTUBE TAB
        ══════════════════════════════════════════════ */}
        {isYouTube && (
          <>
            {learningStatus?.usingStub && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <p>
                  <span className="font-semibold">Demo mode —</span>{' '}
                  {learningStatus.reason || (
                    <>
                      showing sample video data. Add{' '}
                      <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">YOUTUBE_API_KEY</code>{' '}
                      to <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">.env.local</code> for live data.
                    </>
                  )}
                </p>
              </div>
            )}

            <YouTubeSearchForm defaults={{ query: trimmedQuery, difficulty }} />

            <section className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-swin-charcoal/50 dark:text-white/60">Quick topics</p>
              <div className="flex flex-wrap gap-2">
                {YT_QUICK_FILTERS.map((f) => (
                  <Link key={f.label} href={buildYtHref(f.query, difficulty)}
                    className="rounded-full border border-swin-charcoal/10 px-4 py-2 text-sm font-medium text-swin-charcoal transition hover:border-swin-red hover:text-swin-red dark:border-white/20 dark:text-white">
                    {f.label}
                  </Link>
                ))}
              </div>
            </section>

            {trimmedQuery ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-swin-charcoal/60 dark:text-slate-400">Search results</p>
                    <h2 className="text-xl font-semibold text-swin-charcoal dark:text-white">
                      {searchResult?.items.length ?? 0} video{(searchResult?.items.length ?? 0) === 1 ? '' : 's'} for &ldquo;{trimmedQuery}&rdquo;
                    </h2>
                  </div>
                  <div className="rounded-full border border-swin-charcoal/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-swin-charcoal/70 dark:border-white/10 dark:text-white/70">
                    YouTube
                  </div>
                </div>
                <p className="text-sm text-swin-charcoal/60 dark:text-slate-300/80">
                  Difficulty: <span className="font-semibold text-swin-charcoal dark:text-white">{difficultyLabel(difficulty)}</span>
                </p>
                {searchResult?.error && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                    {searchResult.error}
                  </div>
                )}
                <SearchResultsPanel items={searchResult?.items ?? []} query={trimmedQuery} />
              </section>
            ) : (
              <section className="space-y-8">
                <div className="flex items-center gap-3 text-swin-charcoal dark:text-white">
                  <SparklesIcon className="h-6 w-6 text-swin-red" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-swin-charcoal/60 dark:text-slate-400">Trending</p>
                    <h2 className="text-xl font-semibold">Trending learning videos</h2>
                  </div>
                </div>
                {trendingResult?.error && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                    {trendingResult.error}
                  </div>
                )}
                <SearchResultsPanel items={trendingResult?.items ?? []} query="TRENDING" autoScroll={false} />
              </section>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════
            COMMUNITY TAB
        ══════════════════════════════════════════════ */}
        {isCommunity && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <HashtagIcon className="h-4 w-4 flex-shrink-0 text-swin-charcoal/40 dark:text-white/40" />
              {DEVTO_TAGS.map((tag) => (
                <Link key={tag.value}
                  href={`${tabBase}?view=community&tag=${tag.value}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeTag === tag.value
                      ? 'bg-swin-red text-white shadow-sm shadow-swin-red/30'
                      : 'bg-swin-charcoal/5 text-swin-charcoal hover:bg-swin-red/10 hover:text-swin-red dark:bg-white/5 dark:text-white dark:hover:text-swin-red'
                  }`}
                >
                  {tag.emoji} {tag.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-swin-charcoal/10 dark:bg-white/10" />
              <span className="text-xs font-semibold uppercase tracking-widest text-swin-charcoal/40 dark:text-white/40">
                {tagMeta.emoji} {devToArticles.length} trending posts
              </span>
              <div className="h-px flex-1 bg-swin-charcoal/10 dark:bg-white/10" />
            </div>

            <CommunityFeed articles={devToArticles} />

            <p className="text-center text-[11px] text-swin-charcoal/30 dark:text-white/25">
              Powered by{' '}
              <a href="https://dev.to" target="_blank" rel="noopener noreferrer" className="underline hover:text-swin-red">
                DEV Community
              </a>
            </p>
          </>
        )}

        {/* ══════════════════════════════════════════════
            NEWS TAB
        ══════════════════════════════════════════════ */}
        {isNews && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-swin-charcoal/10 dark:bg-white/10" />
              <span className="text-xs font-semibold uppercase tracking-widest text-swin-charcoal/40 dark:text-white/40">
                📰 {hnStories.length} top stories today
              </span>
              <div className="h-px flex-1 bg-swin-charcoal/10 dark:bg-white/10" />
            </div>

            <NewsFeed stories={hnStories} />

            <p className="text-center text-[11px] text-swin-charcoal/30 dark:text-white/25">
              Sources: BBC Technology · TechCrunch · The Verge · Ars Technica · Engadget
            </p>
          </>
        )}

      </div>
    </AdminShell>
  );
}
