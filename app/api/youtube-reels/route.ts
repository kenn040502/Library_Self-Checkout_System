import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ReelVideo = { videoId: string; title: string; channel: string; tags: string[] };

const FALLBACK: ReelVideo[] = [
  { videoId: 'DHjqpvDnNGE', title: 'JavaScript in 100 Seconds',  channel: 'Fireship', tags: ['JavaScript', 'Web Dev']  },
  { videoId: 'x7X9w_GIm1s', title: 'Python in 100 Seconds',      channel: 'Fireship', tags: ['Python', 'Programming'] },
  { videoId: 'hwP7WQkmECE', title: 'Git in 100 Seconds',          channel: 'Fireship', tags: ['Git', 'DevOps']         },
  { videoId: 'zsjvFFKOm3c', title: 'SQL in 100 Seconds',          channel: 'Fireship', tags: ['SQL', 'Database']       },
  { videoId: 'zQnBQ4tB3ZA', title: 'TypeScript in 100 Seconds',  channel: 'Fireship', tags: ['TypeScript', 'Web Dev'] },
  { videoId: 'OEV8gMkCHXQ', title: 'CSS in 100 Seconds',          channel: 'Fireship', tags: ['CSS', 'Web Dev']        },
  { videoId: 'Gjnup-PuquQ', title: 'Docker in 100 Seconds',       channel: 'Fireship', tags: ['Docker', 'DevOps']      },
  { videoId: 'Mus_vwhTCq0', title: 'React in 100 Seconds',        channel: 'Fireship', tags: ['React', 'Web Dev']      },
];

// Published within the last N days
function publishedAfter(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q         = searchParams.get('q') ?? 'programming tutorial';
  const pageToken = searchParams.get('pageToken') ?? '';

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ videos: FALLBACK, nextPageToken: null });
  }

  try {
    // ── Step 1: search for fresh + trending shorts ────────────────────────────
    const params = new URLSearchParams({
      part:             'snippet',
      q,
      type:             'video',
      videoDuration:    'short',
      videoEmbeddable:  'true',
      safeSearch:       'strict',
      maxResults:       '15',
      order:            'viewCount',       // most-viewed = trending
      publishedAfter:   publishedAfter(14), // last 14 days = fresh
      relevanceLanguage:'en',
      key:              apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { cache: 'no-store' },
    );
    if (!searchRes.ok) throw new Error(`YouTube search API ${searchRes.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchData: any = await searchRes.json();
    if (searchData.error) throw new Error(searchData.error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = (searchData.items ?? []).filter((i: any) => i.id?.videoId);
    if (items.length === 0) {
      return NextResponse.json({ videos: FALLBACK, nextPageToken: null });
    }

    const videoIds = items.map((i: any) => i.id.videoId as string).join(',');

    // ── Step 2: fetch full snippet (includes tags) + statistics ───────────────
    const detailParams = new URLSearchParams({
      part: 'snippet,statistics',
      id:   videoIds,
      key:  apiKey,
    });

    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`,
      { cache: 'no-store' },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailMap = new Map<string, any>();
    if (detailRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailData: any = await detailRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const v of (detailData.items ?? [])) {
        detailMap.set(v.id, v);
      }
    }

    const videos: ReelVideo[] = items.map((item: any) => {
      const vid    = item.id.videoId as string;
      const detail = detailMap.get(vid);
      const snippet = detail?.snippet ?? item.snippet;

      // Pick up to 3 meaningful tags from the video's own tag list
      const rawTags: string[] = snippet?.tags ?? [];
      const tags = rawTags
        .filter((t: string) => t.length <= 20)
        .slice(0, 3);

      return {
        videoId: vid,
        title:   snippet?.title   ?? item.snippet.title,
        channel: snippet?.channelTitle ?? item.snippet.channelTitle,
        tags,
      };
    });

    return NextResponse.json({
      videos,
      nextPageToken: (searchData.nextPageToken as string) ?? null,
    });
  } catch (err) {
    console.error('[youtube-reels]', err);
    return NextResponse.json({ videos: FALLBACK, nextPageToken: null });
  }
}
