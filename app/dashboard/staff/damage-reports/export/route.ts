import { NextResponse } from 'next/server';
import { getDashboardSession } from '@/app/lib/auth/session';
import {
  fetchDamageReports,
  type DamageSeverity,
} from '@/app/lib/supabase/queries';

const escapeCsv = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const parseDaysBack = (range?: string): number | undefined => {
  if (range === '7') return 7;
  if (range === '30') return 30;
  if (range === '90') return 90;
  return undefined;
};

export async function GET(request: Request) {
  const { user } = await getDashboardSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'staff' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const severityParam = searchParams.get('severity');
  const rangeParam = searchParams.get('range') ?? undefined;
  const searchParam = searchParams.get('q') ?? undefined;

  const severity = severityParam
    ? (severityParam.split(',').filter((s) =>
        ['damaged', 'lost', 'needs_inspection'].includes(s),
      ) as DamageSeverity[])
    : undefined;

  const reports = await fetchDamageReports({
    severity,
    daysBack: parseDaysBack(rangeParam),
    search: searchParam,
    limit: 1000,
  });

  const headers = [
    'Date',
    'Severity',
    'Book Title',
    'Author',
    'Copy Barcode',
    'Borrower',
    'Borrower Email',
    'Reporter',
    'Reporter Email',
    'Photos',
    'Notes',
  ];

  const rows = reports.map((r) => {
    const sevLabel =
      r.severity === 'needs_inspection'
        ? 'Needs inspection'
        : r.severity.charAt(0).toUpperCase() + r.severity.slice(1);
    return [
      new Date(r.createdAt).toISOString(),
      sevLabel,
      r.copy?.book?.title ?? '',
      r.copy?.book?.author ?? '',
      r.copy?.barcode ?? '',
      r.borrower?.displayName ?? '',
      r.borrower?.email ?? '',
      r.reportedBy?.displayName ?? '',
      r.reportedBy?.email ?? '',
      String(r.photoPaths.length),
      r.notes ?? '',
    ].map(escapeCsv).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="damage-reports-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
