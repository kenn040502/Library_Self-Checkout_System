import {
  getYouTubeStatus,
  searchYouTubeCourses,
  getYouTubeCollections,
  getYouTubeTrending,
} from '@/app/lib/youtube/service';
import type {
  YouTubeSearchOptions,
  YouTubeSearchResult,
  YouTubeTopicCollection,
  YouTubeTopicDefinition,
  YouTubeTrendingOptions,
} from '@/app/lib/youtube/types';

export type LearningStatus = {
  isLive: boolean;
  usingStub: boolean;
  reason?: string;
};

export const getLearningStatus = async (): Promise<LearningStatus> => {
  const status = await getYouTubeStatus();
  const isLive = status.enabled && status.isConfigured && !status.usingStub;
  return { isLive, usingStub: status.usingStub, reason: status.reason };
};

export const searchLearningCourses = async (
  options: YouTubeSearchOptions = {},
): Promise<YouTubeSearchResult> => {
  return searchYouTubeCourses(options);
};

export const getLearningCollections = async (
  definitions: YouTubeTopicDefinition[],
  options: Omit<YouTubeSearchOptions, 'query' | 'topics'> & {
    limitPerTopic?: number;
  } = {},
): Promise<YouTubeTopicCollection[]> => {
  return getYouTubeCollections(definitions, options);
};

export const getLearningTrending = async (
  options: YouTubeTrendingOptions = {},
): Promise<YouTubeSearchResult> => {
  return getYouTubeTrending(options);
};
