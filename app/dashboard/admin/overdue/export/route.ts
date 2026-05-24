import { NextRequest, NextResponse } from 'next/server';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchOverdueLoans } from '@/app/lib/supabase/queries';
import { toCsv, csvResponse } from '@/app/lib/csv';
import type { OverdueBucket } from '@/app/lib/supabase/types';

const validBucket = (v?: string | null): OverdueBucket =>
  v === '1-7' || v === '8-30' || v === '30+' ? v : 'all';

export async function GET(request: NextRequest) {
  const { user } = await getDashboardSession();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  if (user.role !== 'admin' && user.role !== 'staff') return NextResponse.redirect(new URL('/dashboard', request.url));

  const params = request.nextUrl.searchParams;
  const bucket = validBucket(params.get('bucket'));
  const q = params.get('q') ?? undefined;

  const loans = await fetchOverdueLoans({ bucket, search: q });

  const headers = [
    'Loan ID', 'Title', 'Author', 'ISBN', 'Copy barcode',
    'Borrower', 'Student ID', 'Email', 'Borrowed', 'Due',
    'Days overdue', 'Last reminded at', 'Last reminded by',
  ];
  const rows = loans.map((l) => [
    l.id,
    l.book?.title ?? '',
    l.book?.author ?? '',
    l.book?.isbn ?? '',
    l.copy?.barcode ?? '',
    l.borrower?.displayName ?? '',
    l.borrower?.studentId ?? '',
    l.borrower?.email ?? '',
    new Date(l.borrowedAt),
    new Date(l.dueAt),
    l.daysOverdue,
    l.lastRemindedAt ? new Date(l.lastRemindedAt) : null,
    l.lastRemindedByName ?? '',
  ]);
  const filename = `overdue-${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(filename, toCsv(headers, rows));
}
