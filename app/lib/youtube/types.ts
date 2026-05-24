export type YouTubeSource = 'api' | 'stub' | 'disabled';

export type YouTubeLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';

export type YouTubeContentType = 'VIDEO' | 'PLAYLIST' | 'CHANNEL' | 'OTHER';

export interface YouTubeAuthor {
  name: string;
  channelUrl?: string | null;
}

export interface YouTubeAsset {
  urn: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  durationInSeconds: number | null;
  durationFormatted: string | null;
  skillLevel: YouTubeLevel | null;
  releasedAt: string | null;
  topics: string[];
  authors: YouTubeAuthor[];
  contentType: YouTubeContentType;
  viewCount?: string | null;
  channelTitle?: string | null;
  embeddable?: boolean | null;
}

export interface YouTubeSearchOptions {
  query?: string;
  topics?: string[];
  limit?: number;
  difficulty?: YouTubeLevel | 'ALL';
}

export interface YouTubeTrendingOptions {
  limit?: number;
  regionCode?: string;
  categoryId?: string;
  difficulty?: YouTubeLevel | 'ALL';
}

export interface YouTubeSearchResult {
  source: YouTubeSource;
  query: string;
  tookMs: number;
  total: number;
  items: YouTubeAsset[];
  error?: string;
}

export interface YouTubeStatus {
  enabled: boolean;
  isConfigured: boolean;
  usingStub: boolean;
  reason?: string;
}

export interface YouTubeTopicDefinition {
  key: string;
  title: string;
  query: string;
  description?: string;
  icon?: string;
}

export interface YouTubeTopicCollection {
  definition: YouTubeTopicDefinition;
  result: YouTubeSearchResult;
}
