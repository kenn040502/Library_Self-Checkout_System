import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/auth';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { embed, buildBookEmbeddingText } from '@/app/lib/recommendations/embeddings';

export const maxDuration = 300; // 5 min — embedding all books can take a while on first run

export async function POST(req: NextRequest) {
  try {
    await requireStaff();

    const body = await req.json().catch(() => null);
    const reembed: boolean = Boolean(body?.reembed);

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('Books')
      .select(`id, title, author, publisher, classification, category,
               book_tag_links:BookTagsLinks(tag:BookTags(name))`)
      .limit(1000);

    if (!reembed) {
      query = query.is('embedding', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    const books = (data ?? []).map((b: any) => ({
      id: b.id as string,
      title: b.title ?? '',
      author: b.author ?? null,
      publisher: b.publisher ?? null,
      classification: b.classification ?? null,
      category: b.category ?? null,
      tags: ((b.book_tag_links ?? []) as any[])
        .map((l) => l?.tag?.name)
        .filter((n: any): n is string => typeof n === 'string' && n.length > 0),
    }));

    if (!books.length) {
      return NextResponse.json({ ok: true, embedded: 0 });
    }

    let embedded = 0;
    let failed = 0;

    for (const book of books) {
      try {
        const text = buildBookEmbeddingText(book);
        if (!text.trim()) continue;
        const vector = await embed(text);

        const { error: updateError } = await supabase
          .from('Books')
          .update({ embedding: vector })
          .eq('id', book.id);

        if (updateError) {
          failed += 1;
          console.error(`[embed-all] failed to save book ${book.id}`, updateError);
        } else {
          embedded += 1;
        }
      } catch (err) {
        failed += 1;
        console.error(`[embed-all] failed to embed book ${book.id}`, err);
      }
    }

    return NextResponse.json({ ok: true, embedded, failed });
  } catch (err: unknown) {
    console.error('[embed-all] error', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.toLowerCase().includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
