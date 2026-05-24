import { NextResponse } from 'next/server';
import { getDashboardSession } from '@/app/lib/auth/session';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user } = await getDashboardSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'staff' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode')?.trim();
  if (!barcode) {
    return NextResponse.json({ error: 'barcode is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data: copy, error: copyError } = await supabase
      .from('Copies')
      .select('id')
      .eq('barcode', barcode)
      .maybeSingle<{ id: string }>();

    if (copyError) {
      console.error('[api/loans/active-by-barcode] copy lookup failed', copyError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!copy) {
      return NextResponse.json({ active: false });
    }

    const { data: loan, error: loanError } = await supabase
      .from('Loans')
      .select('id')
      .eq('copy_id', copy.id)
      .is('returned_at', null)
      .maybeSingle<{ id: string }>();

    if (loanError) {
      console.error('[api/loans/active-by-barcode] loan lookup failed', loanError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    return NextResponse.json({ active: Boolean(loan), loanId: loan?.id ?? null });
  } catch (error) {
    console.error('[api/loans/active-by-barcode] failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}

