import { NextResponse } from 'next/server';

export async function GET() {
  const base = (process.env.LMSTUDIO_BASE_URL?.trim() || 'http://localhost:1234/v1').replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/models`, {
      signal: AbortSignal.timeout(3000),
    });
    const live = res.ok;
    return NextResponse.json({ live }, { status: 200 });
  } catch {
    return NextResponse.json({ live: false }, { status: 200 });
  }
}
