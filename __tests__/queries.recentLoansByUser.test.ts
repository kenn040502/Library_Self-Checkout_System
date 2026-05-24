import { fetchRecentLoansByUser } from '@/app/lib/supabase/queries';

jest.mock('@/app/lib/supabase/server', () => {
  const mockFrom = jest.fn();
  return {
    getSupabaseServerClient: () => ({ from: mockFrom }),
    __mockFrom: mockFrom,
  };
});

const { __mockFrom: mockFrom } = jest.requireMock('@/app/lib/supabase/server') as {
  __mockFrom: jest.Mock;
};

const buildLoanRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'loan-1',
  borrowed_at: '2026-05-01T00:00:00Z',
  due_at: '2026-05-31T00:00:00Z',
  returned_at: null,
  renewed_count: 0,
  copy: {
    id: 'copy-1',
    book: {
      id: 'book-1',
      title: 'Test Title',
      author: 'A. Author',
      isbn: '9780000000000',
      cover_image_url: null,
    },
  },
  ...overrides,
});

describe('fetchRecentLoansByUser', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns active and returned loans, newest first, limited to N', async () => {
    const rows = [
      buildLoanRow({ id: 'loan-3', borrowed_at: '2026-05-05T00:00:00Z' }),
      buildLoanRow({ id: 'loan-2', borrowed_at: '2026-05-04T00:00:00Z', returned_at: '2026-05-06T00:00:00Z' }),
      buildLoanRow({ id: 'loan-1', borrowed_at: '2026-05-03T00:00:00Z' }),
    ];

    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);

    expect(mockFrom).toHaveBeenCalledWith('Loans');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(order).toHaveBeenCalledWith('borrowed_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(5);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 'loan-3',
      action: 'borrowed',
      book: { id: 'book-1', title: 'Test Title' },
    });
    expect(result[1]).toMatchObject({ id: 'loan-2', action: 'returned' });
  });

  it('returns "renewed" action when renewed_count > 0 and not yet returned', async () => {
    const rows = [
      buildLoanRow({ id: 'loan-r', renewed_count: 2, returned_at: null }),
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);
    expect(result[0].action).toBe('renewed');
  });

  it('returns [] when supabase reports an error', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);
    expect(result).toEqual([]);
  });

  it('prefers "returned" action when a loan was both renewed and returned', async () => {
    const rows = [
      buildLoanRow({ id: 'loan-rr', renewed_count: 2, returned_at: '2026-05-10T00:00:00Z' }),
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);
    expect(result[0].action).toBe('returned');
  });
});
