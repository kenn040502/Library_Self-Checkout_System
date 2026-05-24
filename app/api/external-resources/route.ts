import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Article = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  faviconUrl: string | null;
};

type Video = {
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  publishedAt: string | null;
  url: string;
};

type ExternalResourcesResponse = {
  ok: boolean;
  topic: string;
  articles: Article[];
  videos: Video[];
  error?: string;
};

type CacheEntry = {
  articles: Article[];
  videos: Video[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const cache = new Map<string, CacheEntry>();

const getEnv = () => ({
  youtubeApiKey: process.env.YOUTUBE_API_KEY?.trim(),
  braveApiKey: process.env.BRAVE_SEARCH_API_KEY?.trim(),
});

const cacheKey = (topic: string) => topic.toLowerCase().trim();

const REDDIT_USER_AGENT = 'library-app/1.0 (school project)';

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

// Wikipedia REST — one authoritative intro article per topic.
const fetchWikipedia = async (topic: string): Promise<Article[]> => {
  try {
    const slug = encodeURIComponent(topic.replace(/\s+/g, '_'));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    const url = data.content_urls?.desktop?.page;
    if (!url || !data.extract) return [];
    return [
      {
        title: data.title ?? topic,
        url,
        snippet: data.extract,
        source: 'Wikipedia',
        faviconUrl: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
      },
    ];
  } catch (err) {
    console.error('[external-resources] Wikipedia failed', err);
    return [];
  }
};

// DEV.to — community articles (best for tech topics, returns empty for non-tech).
const fetchDevTo = async (topic: string): Promise<Article[]> => {
  try {
    const tag = topic.toLowerCase().replace(/\s+/g, '');
    const res = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=3`);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      title?: string;
      url?: string;
      description?: string;
      user?: { name?: string };
    }>;
    return data
      .filter((a) => a.title && a.url)
      .slice(0, 3)
      .map((a) => ({
        title: a.title!,
        url: a.url!,
        snippet: a.description ?? '',
        source: a.user?.name ? `DEV.to · ${a.user.name}` : 'DEV.to',
        faviconUrl: 'https://dev.to/favicon.ico',
      }));
  } catch (err) {
    console.error('[external-resources] DEV.to failed', err);
    return [];
  }
};

// Reddit JSON — community discussions and recommendations.
const fetchReddit = async (topic: string): Promise<Article[]> => {
  try {
    const url = new URL('https://www.reddit.com/search.json');
    url.searchParams.set('q', topic);
    url.searchParams.set('limit', '3');
    url.searchParams.set('sort', 'top');
    url.searchParams.set('t', 'year');
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': REDDIT_USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: { title?: string; permalink?: string; selftext?: string; subreddit?: string } }> };
    };
    const items = data.data?.children ?? [];
    return items
      .map((c) => c.data)
      .filter((d): d is NonNullable<typeof d> => Boolean(d?.title && d?.permalink))
      .slice(0, 3)
      .map((d) => ({
        title: d.title!,
        url: `https://www.reddit.com${d.permalink}`,
        snippet: stripHtml(d.selftext ?? '').slice(0, 200),
        source: d.subreddit ? `Reddit · r/${d.subreddit}` : 'Reddit',
        faviconUrl: 'https://www.reddit.com/favicon.ico',
      }));
  } catch (err) {
    console.error('[external-resources] Reddit failed', err);
    return [];
  }
};

// Hacker News via Algolia — high-signal tech articles and discussions.
const fetchHackerNews = async (topic: string): Promise<Article[]> => {
  try {
    const url = new URL('https://hn.algolia.com/api/v1/search');
    url.searchParams.set('query', topic);
    url.searchParams.set('tags', 'story');
    url.searchParams.set('hitsPerPage', '3');
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits?: Array<{ title?: string; url?: string; objectID?: string; author?: string; points?: number }>;
    };
    return (data.hits ?? [])
      .filter((h) => h.title)
      .slice(0, 3)
      .map((h) => ({
        title: h.title!,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        snippet: h.author ? `by ${h.author} · ${h.points ?? 0} points` : '',
        source: 'Hacker News',
        faviconUrl: 'https://news.ycombinator.com/favicon.ico',
      }));
  } catch (err) {
    console.error('[external-resources] HN failed', err);
    return [];
  }
};

// Aggregate all four sources, dedupe by URL, cap total.
const fetchAggregatedArticles = async (topic: string): Promise<Article[]> => {
  const results = await Promise.allSettled([
    fetchWikipedia(topic),
    fetchDevTo(topic),
    fetchReddit(topic),
    fetchHackerNews(topic),
  ]);
  const all: Article[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const a of r.value) {
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      all.push(a);
    }
  }
  return all.slice(0, 8);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchBraveArticles = async (topic: string): Promise<Article[]> => {
  const { braveApiKey } = getEnv();
  if (!braveApiKey) return [];

  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', `${topic} books guide`);
    url.searchParams.set('count', '5');
    url.searchParams.set('safesearch', 'strict');
    url.searchParams.set('result_filter', 'web');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveApiKey,
      },
    });

    if (!res.ok) {
      console.error('[external-resources] Brave API error', res.status, await res.text().catch(() => ''));
      return [];
    }

    const data = (await res.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          profile?: { name?: string; img?: string };
          meta_url?: { hostname?: string; favicon?: string };
        }>;
      };
    };

    const results = data.web?.results ?? [];
    return results
      .slice(0, 5)
      .map((r) => ({
        title: (r.title ?? '').replace(/<[^>]+>/g, '').trim(),
        url: r.url ?? '',
        snippet: (r.description ?? '').replace(/<[^>]+>/g, '').trim(),
        source: r.profile?.name ?? r.meta_url?.hostname ?? 'Web',
        faviconUrl: r.meta_url?.favicon ?? r.profile?.img ?? null,
      }))
      .filter((a) => a.title && a.url);
  } catch (err) {
    console.error('[external-resources] Brave fetch failed', err);
    return [];
  }
};

const fetchYouTubeVideos = async (topic: string): Promise<Video[]> => {
  const { youtubeApiKey } = getEnv();
  if (!youtubeApiKey) return [];

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', `${topic} tutorial`);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '4');
    url.searchParams.set('safeSearch', 'strict');
    url.searchParams.set('relevanceLanguage', 'en');
    url.searchParams.set('videoEmbeddable', 'true');
    url.searchParams.set('key', youtubeApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      console.error('[external-resources] YouTube API error', res.status, await res.text().catch(() => ''));
      return [];
    }

    const data = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
        };
      }>;
    };

    const items = data.items ?? [];
    return items
      .map((v) => {
        const videoId = v.id?.videoId ?? '';
        return {
          videoId,
          title: v.snippet?.title ?? '',
          channel: v.snippet?.channelTitle ?? '',
          thumbnailUrl:
            v.snippet?.thumbnails?.medium?.url ??
            v.snippet?.thumbnails?.high?.url ??
            '',
          publishedAt: v.snippet?.publishedAt ?? null,
          url: videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : '',
        };
      })
      .filter((v) => v.videoId && v.title);
  } catch (err) {
    console.error('[external-resources] YouTube fetch failed', err);
    return [];
  }
};

export async function POST(request: Request) {
  let body: { topic?: string };
  try {
    body = (await request.json()) as { topic?: string };
  } catch {
    return NextResponse.json<ExternalResourcesResponse>(
      { ok: false, topic: '', articles: [], videos: [], error: 'Invalid request payload.' },
      { status: 400 },
    );
  }

  const topic = String(body.topic ?? '').trim();
  if (!topic) {
    return NextResponse.json<ExternalResourcesResponse>(
      { ok: false, topic: '', articles: [], videos: [], error: 'Topic is required.' },
      { status: 400 },
    );
  }

  const key = cacheKey(topic);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json<ExternalResourcesResponse>({
      ok: true,
      topic,
      articles: cached.articles,
      videos: cached.videos,
    });
  }

  const [articles, videos] = await Promise.all([
    fetchAggregatedArticles(topic),
    fetchYouTubeVideos(topic),
  ]);

  cache.set(key, { articles, videos, fetchedAt: now });

  if (cache.size > 200) {
    for (const [k, v] of cache.entries()) {
      if (now - v.fetchedAt > CACHE_TTL_MS) cache.delete(k);
    }
  }

  return NextResponse.json<ExternalResourcesResponse>({
    ok: true,
    topic,
    articles,
    videos,
  });
}
