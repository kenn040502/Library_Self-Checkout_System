// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { checkOut } from '@/lib/sip2';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { createNotification } from '@/app/lib/supabase/notifications';
import { countActiveLoansForPatron } from '@/app/lib/supabase/queries';
import { STUDENT_LOAN_LIMIT } from '@/app/dashboard/loanPolicy';

const SIP2_INSTITUTION_ID = process.env.SIP2_INSTITUTION_ID ?? 'LIB001';
const SIP2_TERMINAL_PASSWORD = process.env.SIP2_TERMINAL_PASSWORD ?? 'term123';
const SIP2_PATRON_PASSWORD = process.env.SIP2_PATRON_PASSWORD ?? 'patron456';

// SIP2 format: YYYYMMDDZZZZHHMMSS (18 chars)
// ZZZZ = timezone offset in HHMM (e.g. 0800 for UTC+8)
const pad = (n: number) => n.toString().padStart(2, '0');

function formatSipDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const abs = Math.abs(offsetMinutes);
  const zzzz = pad(Math.floor(abs / 60)) + pad(abs % 60);

  return `${yyyy}${mm}${dd}${zzzz}${hh}${min}${ss}`;
}

async function lookupBookByBarcode(barcode: string): Promise<{ title: string; author: string }> {
  const supabase = getSupabaseServerClient();
  // Step 1: resolve copy → book_id
  const { data: copy } = await supabase
    .from('Copies')
    .select('book_id')
    .eq('barcode', barcode)
    .maybeSingle();
  if (!copy?.book_id) return { title: barcode, author: '' };
  // Step 2: fetch book title/author
  const { data: book } = await supabase
    .from('Books')
    .select('title, author')
    .eq('id', copy.book_id)
    .maybeSingle();
  return {
    title: (book as { title?: string; author?: string } | null)?.title ?? barcode,
    author: (book as { title?: string; author?: string } | null)?.author ?? '',
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const patronIdentifier = String(body.patronIdentifier ?? '').trim();
    const itemIdentifier   = String(body.itemIdentifier ?? '').trim();
    const dueDateStr       = String(body.dueDate ?? '').trim(); // e.g. "2025-01-25"

    if (!patronIdentifier || !itemIdentifier) {
      return NextResponse.json(
        { success: false, error: 'Missing patronIdentifier or itemIdentifier' },
        { status: 400 },
      );
    }

    // Enforce 3-book limit for student (user) role patrons
    const supabaseForCheck = getSupabaseServerClient();
    const { data: patronRow } = await supabaseForCheck
      .from('Users')
      .select('id, role')
      .eq('id', patronIdentifier)
      .maybeSingle<{ id: string; role: string | null }>();

    if (patronRow && (!patronRow.role || patronRow.role === 'user')) {
      const activeCount = await countActiveLoansForPatron(patronRow.id);
      if (activeCount >= STUDENT_LOAN_LIMIT) {
        return NextResponse.json(
          {
            success: false,
            error: `Loan limit reached (${activeCount}/${STUDENT_LOAN_LIMIT}). Return a book before borrowing another.`,
          },
          { status: 422 },
        );
      }
    }

    const now = new Date();
    const due = dueDateStr
      ? new Date(dueDateStr + 'T00:00:00')
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // fallback 14 days

    const sipPayload = {
      scRenewalPolicy: 'Y',
      noBlock: 'N',
      transactionDate: formatSipDate(now),
      nbDueDate: formatSipDate(due),
      institutionId: SIP2_INSTITUTION_ID,
      patronIdentifier,
      itemIdentifier,
      terminalPassword: SIP2_TERMINAL_PASSWORD,
      itemProperties: 'Web kiosk',
      patronPassword: SIP2_PATRON_PASSWORD,
      feeAcknowledged: 'Y',
      cancel: 'N',
    };

    const result = await checkOut(sipPayload) as { status?: number };
    if (result?.status !== 1) {
      console.warn('[SIP2] Checkout returned non-OK status', result);
    }

    // Fire notification (non-blocking, non-critical)
    lookupBookByBarcode(itemIdentifier)
      .then(({ title, author }) =>
        createNotification(
          'checkout',
          'Book Borrowed',
          `"${title}" was checked out by ${patronIdentifier}.`,
          { bookTitle: title, bookAuthor: author, barcode: itemIdentifier, patronIdentifier },
        ),
      )
      .catch((err) => console.warn('[notifications] checkout notification failed:', err));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Checkout API error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      },
      { status: 500 },
    );
  }
}
