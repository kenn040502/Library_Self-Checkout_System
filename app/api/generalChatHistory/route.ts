import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { getSessionUser } from '@/auth';

async function currentUserId(): Promise<string | null> {
  try {
    const user = await getSessionUser();
    return user.id;
  } catch {
    return null;
  }
}

export async function GET(_request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('GeneralChatHistory')
    .select('id, message_id, sender, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[generalChatHistory] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = (data ?? []).map((r: Record<string, unknown>) => ({
    id: (r.message_id as string | null) ?? (r.id as string),
    sender: r.sender as string,
    text: r.text as string,
    timestamp: r.created_at as string,
  }));

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sender = body?.sender;
  const text = body?.text;
  const message_id = body?.message_id;

  if (sender !== 'user' && sender !== 'assistant') {
    return NextResponse.json({ error: 'Invalid sender' }, { status: 400 });
  }
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('GeneralChatHistory').insert({
    user_id: userId,
    message_id: typeof message_id === 'string' ? message_id : null,
    sender,
    text,
  });

  if (error) {
    console.error('[generalChatHistory] POST error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('GeneralChatHistory')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[generalChatHistory] DELETE error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
