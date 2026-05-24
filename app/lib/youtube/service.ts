// Removed 'use server' to ensure consistent error handling in Server Components


import { sampleYouTubeAssets } from '@/app/lib/youtube/sample-data';
import type {
  YouTubeAsset,
  YouTubeLevel,
  YouTubeSearchOptions,
  YouTubeSearchResult,
  YouTubeStatus,
  YouTubeTopicCollection,
  YouTubeTopicDefinition,
  YouTubeTrendingOptions,
} from '@/app/lib/youtube/types';

const env = {
  apiKey: (process.env.YOUTUBE_API_KEY ?? '').trim(),
  apiBase: 'https://www.googleapis.com/youtube/v3',
  trendingRegionCode: (process.env.YOUTUBE_TRENDING_REGION_CODE ?? 'MY').trim() || 'MY',
  trendingCategoryId: (process.env.YOUTUBE_TRENDING_CATEGORY_ID ?? '28').trim() || '28',
};

const hasCredentials = Boolean(env.apiKey);
const stubMode = !hasCredentials;
const enabled = true; // Always enabled — falls back to stub
let isQuotaExceeded = false;
let lastQuotaCheck = 0;
const QUOTA_COOLDOWN = 1000 * 60 * 15; // 15 minutes cooldown

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// ─── Duration parsing ────────────────────────────────────────────────────────

const parseIsoDuration = (value: string): number | null => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  const seconds = match[3] ? Number(match[3]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
};

const formatDuration = (seconds: number | null): string | null => {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
};

// ─── Skill level heuristic ───────────────────────────────────────────────────

const inferSkillLevel = (title: string, description: string | null): YouTubeLevel | null => {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (/\b(beginner|introduction|intro|basics|101|getting started|for beginners|crash course)\b/.test(text)) {
    return 'BEGINNER';
  }
  if (/\b(advanced|expert|master|in-depth|deep dive|architecture)\b/.test(text)) {
    return 'ADVANCED';
  }
  if (/\b(intermediate|practical|hands-on|project|tutorial)\b/.test(text)) {
    return 'INTERMEDIATE';
  }
  return null;
};

// ─── YouTube API types ───────────────────────────────────────────────────────

type YouTubeSearchItem = {
  id: { kind: string; videoId?: string; playlistId?: string; channelId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
  pageInfo?: { totalResults?: number };
};

type YouTubeVideoDetails = {
  id: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
};

type YouTubeVideoDetailsResponse = {
  items?: YouTubeVideoDetails[];
};

type YouTubeVideosListItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
};

type YouTubeVideosListResponse = {
  items?: YouTubeVideosListItem[];
};

// ─── Convert API response to our asset type ──────────────────────────────────

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const toYouTubeAsset = (
  item: YouTubeSearchItem,
  details?: YouTubeVideoDetails,
): YouTubeAsset => {
  const videoId = item.id.videoId;
  const playlistId = item.id.playlistId;
  const isPlaylist = item.id.kind === 'youtube#playlist';
  const isChannel = item.id.kind === 'youtube#channel';

  const urn = videoId
    ? `yt:video:${videoId}`
    : playlistId
    ? `yt:playlist:${playlistId}`
    : `yt:channel:${item.id.channelId ?? 'unknown'}`;

  const url = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : playlistId
    ? `https://www.youtube.com/playlist?list=${playlistId}`
    : null;

  const thumbnails = item.snippet.thumbnails;
  const imageUrl = thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null;

  const durationRaw = details?.contentDetails?.duration;
  const durationInSeconds = durationRaw ? parseIsoDuration(durationRaw) : null;

  const contentType: YouTubeAsset['contentType'] = isPlaylist
    ? 'PLAYLIST'
    : isChannel
    ? 'CHANNEL'
    : 'VIDEO';

  const title = decodeHtmlEntities(item.snippet.title);
  const description = decodeHtmlEntities(item.snippet.description);

  return {
    urn,
    title,
    description: description || null,
    url,
    imageUrl,
    durationInSeconds,
    durationFormatted: formatDuration(durationInSeconds),
    skillLevel: inferSkillLevel(title, description),
    releasedAt: item.snippet.publishedAt ?? null,
    topics: [],
    authors: [{ name: item.snippet.channelTitle }],
    contentType,
    viewCount: details?.statistics?.viewCount ?? null,
    channelTitle: item.snippet.channelTitle,
    embeddable: details?.status?.embeddable ?? null,
  };
};

// ─── Stub search ─────────────────────────────────────────────────────────────

const toYouTubeAssetFromVideo = (item: YouTubeVideosListItem): YouTubeAsset => {
  const videoId = item.id;
  const urn = `yt:video:${videoId}`;
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const thumbnails = item.snippet.thumbnails;
  const imageUrl = thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null;

  const durationRaw = item.contentDetails?.duration;
  const durationInSeconds = durationRaw ? parseIsoDuration(durationRaw) : null;

  const title = decodeHtmlEntities(item.snippet.title);
  const description = decodeHtmlEntities(item.snippet.description);

  return {
    urn,
    title,
    description: description || null,
    url,
    imageUrl,
    durationInSeconds,
    durationFormatted: formatDuration(durationInSeconds),
    skillLevel: inferSkillLevel(title, description),
    releasedAt: item.snippet.publishedAt ?? null,
    topics: [],
    authors: [{ name: item.snippet.channelTitle }],
    contentType: 'VIDEO',
    viewCount: item.statistics?.viewCount ?? null,
    channelTitle: item.snippet.channelTitle,
    embeddable: item.status?.embeddable ?? null,
  };
};

const stubSearch = (
  options: YouTubeSearchOptions,
  limit: number,
  startedAt: number,
): YouTubeSearchResult => {
  const q = (options.query ?? '').trim().toLowerCase();
  const difficulty = options.difficulty ?? 'ALL';

  let items = sampleYouTubeAssets;

  if (q) {
    const rawTokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    const meaningfulTokens = rawTokens.filter((t) => t.length > 2);
    const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

    if (tokens.length > 0) {
      items = items.filter((asset) => {
        const haystack = [
          asset.title,
          asset.description ?? '',
          ...(asset.topics ?? []),
          ...(asset.authors ?? []).map((a) => a.name),
          asset.channelTitle ?? '',
        ]
          .filter(Boolean)
          .map((v) => v.toLowerCase());

        return tokens.some((token) => haystack.some((v) => v.includes(token)));
      });
    }
  }

  if (difficulty && difficulty !== 'ALL') {
    items = items.filter((asset) => (asset.skillLevel ?? 'ALL') === difficulty);
  }

  const picked = items.slice(0, limit);

  return {
    source: 'stub',
    query: options.query ?? '',
    tookMs: Date.now() - startedAt,
    total: items.length,
    items: picked,
  };
};

// ─── Status ──────────────────────────────────────────────────────────────────

const stubTrending = (
  options: YouTubeTrendingOptions,
  limit: number,
  startedAt: number,
): YouTubeSearchResult => {
  const difficulty = options.difficulty ?? 'ALL';
  let items = sampleYouTubeAssets;

  if (difficulty && difficulty !== 'ALL') {
    items = items.filter((asset) => (asset.skillLevel ?? 'ALL') === difficulty);
  }

  const safeLength = Math.max(1, items.length);
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const offset = daySeed % safeLength;
  const rotated = items.slice(offset).concat(items.slice(0, offset));
  const picked = rotated.slice(0, limit);

  return {
    source: 'stub',
    query: 'TRENDING',
    tookMs: Date.now() - startedAt,
    total: items.length,
    items: picked,
  };
};

export const getYouTubeStatus = async (): Promise<YouTubeStatus> => {
  if (stubMode) {
    return {
      enabled: true,
      isConfigured: false,
      usingStub: true,
      reason: 'Using sample data (YOUTUBE_API_KEY missing).',
    };
  }

  if (isQuotaExceeded) {
    return {
      enabled: true,
      isConfigured: true,
      usingStub: true,
      reason: 'YouTube API quota exceeded. Falling back to sample data.',
    };
  }

  return {
    enabled: true,
    isConfigured: true,
    usingStub: false,
  };




};

// ─── YouTube Data API v3 search ──────────────────────────────────────────────

const fetchYouTubeSearch = async (
  query: string,
  limit: number,
): Promise<YouTubeSearchResponse & { quotaExceeded?: boolean }> => {
  const params = new URLSearchParams({
    part: 'snippet',
    q: `${query} tutorial`,
    type: 'video',
    maxResults: `${limit}`,
    order: 'relevance',
    videoEmbeddable: 'true',
    safeSearch: 'strict',
    key: env.apiKey,
  });

  const response = await fetch(`${env.apiBase}/search?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 403 && text.includes('quotaExceeded')) {
      isQuotaExceeded = true;
      lastQuotaCheck = Date.now();
      return { items: [], quotaExceeded: true };
    }
    throw new Error(`YouTube API error (${response.status}): ${text}`);
  }

  return (await response.json()) as YouTubeSearchResponse;
};

const fetchVideoDetails = async (
  videoIds: string[],
): Promise<Map<string, YouTubeVideoDetails>> => {
  if (!videoIds.length) return new Map();

  const params = new URLSearchParams({
    part: 'contentDetails,statistics,status',
    id: videoIds.join(','),
    key: env.apiKey,
  });

  const response = await fetch(`${env.apiBase}/videos?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) return new Map();

  const data = (await response.json()) as YouTubeVideoDetailsResponse;
  const map = new Map<string, YouTubeVideoDetails>();
  for (const item of data.items ?? []) {
    map.set(item.id, item);
  }
  return map;
};

const fetchYouTubeTrending = async (
  limit: number,
  regionCode: string,
  categoryId: string | null,
): Promise<YouTubeVideosListResponse & { quotaExceeded?: boolean }> => {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics,status',
    chart: 'mostPopular',
    maxResults: `${limit}`,
    regionCode,
    key: env.apiKey,
  });

  if (categoryId) params.set('videoCategoryId', categoryId);

  const response = await fetch(`${env.apiBase}/videos?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();

    // Some categories do not support `chart=mostPopular` and return 404 NOT_FOUND
    // (e.g. category 27 "Education"). In that case, retry without a category filter.
    if (response.status === 404 && categoryId) {
      return fetchYouTubeTrending(limit, regionCode, null);
    }

    if (response.status === 403 && text.includes('quotaExceeded')) {
      isQuotaExceeded = true;
      lastQuotaCheck = Date.now();
      return { items: [], quotaExceeded: true };
    }

    throw new Error(`YouTube API error (${response.status}): ${text}`);
  }

  return (await response.json()) as YouTubeVideosListResponse;
};

// ─── Main search function ────────────────────────────────────────────────────

export const searchYouTubeCourses = async (
  options: YouTubeSearchOptions = {},
): Promise<YouTubeSearchResult> => {
  const started = Date.now();
  const limit = clamp(options.limit ?? 12, 1, 30);

  if (!enabled) {
    return {
      source: 'disabled',
      query: options.query ?? '',
      total: 0,
      items: [],
      tookMs: Date.now() - started,
      error: 'YouTube integration is not configured.',
    };
  }

  // Reset quota flag after cooldown
  if (isQuotaExceeded && Date.now() - lastQuotaCheck > QUOTA_COOLDOWN) {
    isQuotaExceeded = false;
  }

  if (stubMode || !hasCredentials || isQuotaExceeded) {
    return stubSearch(options, limit, started);
  }

  try {
    const keywords = [options.query ?? '', ...(options.topics ?? [])]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(' ');

    if (!keywords.trim()) {
      return stubSearch(options, limit, started);
    }

    const searchResponse = await fetchYouTubeSearch(keywords, limit);
    if (searchResponse.quotaExceeded) {
      return stubSearch(options, limit, started);
    }
    const searchItems = searchResponse.items ?? [];

    // Fetch video details (duration, view count) for each result
    const videoIds = searchItems
      .map((item) => item.id.videoId)
      .filter((id): id is string => Boolean(id));

    const detailsMap = await fetchVideoDetails(videoIds);

    const assets = searchItems.map((item) => {
      const details = item.id.videoId ? detailsMap.get(item.id.videoId) : undefined;
      return toYouTubeAsset(item, details);
    });

    // Apply difficulty filter client-side (YouTube API doesn't support this)
    const filtered =
      options.difficulty && options.difficulty !== 'ALL'
        ? assets.filter((asset) => asset.skillLevel === options.difficulty)
        : assets;

    return {
      source: 'api',
      query: options.query ?? keywords,
      total: filtered.length,
      items: filtered,
      tookMs: Date.now() - started,
    };
  } catch (error) {
    if (!(error as any).message?.includes('quotaExceeded')) {
      console.error('[YouTube] search failed', error);
    }

    // Fall back to stub data on error
    return stubSearch(options, limit, started);
  }
};

// ─── Topic collections ───────────────────────────────────────────────────────

export const getYouTubeTrending = async (
  options: YouTubeTrendingOptions = {},
): Promise<YouTubeSearchResult> => {
  const started = Date.now();
  const limit = clamp(options.limit ?? 12, 1, 30);
  const regionCode = (options.regionCode ?? env.trendingRegionCode).trim() || env.trendingRegionCode;
  const categoryIdRaw = (options.categoryId ?? env.trendingCategoryId).trim();
  const categoryId = categoryIdRaw ? categoryIdRaw : null;

  if (!enabled) {
    return {
      source: 'disabled',
      query: 'TRENDING',
      total: 0,
      items: [],
      tookMs: Date.now() - started,
      error: 'YouTube integration is not configured.',
    };
  }

  // Reset quota flag after cooldown
  if (isQuotaExceeded && Date.now() - lastQuotaCheck > QUOTA_COOLDOWN) {
    isQuotaExceeded = false;
  }

  if (stubMode || !hasCredentials || isQuotaExceeded) {
    return stubTrending(options, limit, started);
  }

  try {
    const response = await fetchYouTubeTrending(limit, regionCode, categoryId);
    if (response.quotaExceeded) {
      return stubTrending(options, limit, started);
    }
    const items = (response.items ?? [])
      .filter((item) => item?.status?.privacyStatus !== 'private')
      .filter((item) => item?.status?.embeddable !== false);

    const assets = items.map(toYouTubeAssetFromVideo);

    const filtered =
      options.difficulty && options.difficulty !== 'ALL'
        ? assets.filter((asset) => asset.skillLevel === options.difficulty)
        : assets;

    return {
      source: 'api',
      query: 'TRENDING',
      total: filtered.length,
      items: filtered,
      tookMs: Date.now() - started,
    };
  } catch (error: any) {
    if (!error.message?.includes('quotaExceeded')) {
      console.error('[YouTube] trending failed', error);
    }
    return stubTrending(options, limit, started);
  }
};

export const getYouTubeCollections = async (
  definitions: YouTubeTopicDefinition[],
  options: Omit<YouTubeSearchOptions, 'query' | 'topics'> & { limitPerTopic?: number } = {},
): Promise<YouTubeTopicCollection[]> => {
  if (!definitions.length) return [];
  const limitPerTopic = clamp(options.limitPerTopic ?? 4, 1, 12);

  const tasks = definitions.map(async (definition) => {
    const result = await searchYouTubeCourses({
      ...options,
      query: definition.query,
      limit: limitPerTopic,
    });
    return { definition, result };
  });

  return Promise.all(tasks);
};
