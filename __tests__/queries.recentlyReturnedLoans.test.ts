/** @jest-environment node */

const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockGte = jest.fn(() => ({ order: mockOrder }));
const mockEqAfterNot = jest.fn(() => ({ gte: mockGte }));
const mockNot = jest.fn(() => ({ gte: mockGte, eq: mockEqAfterNot }));
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

beforeEach(() => {
  mockLimit.mockReset();
  mockOrder.mockReset().mockReturnValue({ limit: mockLimit });
  mockGte.mockReset().mockReturnValue({ order: mockOrder });
  mockEqAfterNot.mockReset().mockReturnValue({ gte: mockGte });
  mockNot.mockReset().mockReturnValue({ gte: mockGte, eq: mockEqAfterNot });
  mockSelect.mockReset().mockReturnValue({ not: mockNot });
  mockFrom.mockReset().mockReturnValue({ select: mockSelect });
});

test('fetchRecentlyReturnedLoans filters by user, non-null returned_at, and within window', async () => {
  mockLimit.mockResolvedValue({ data: [], error: null });

  const { fetchRecentlyReturnedLoans } = await import('@/app/lib/supabase/queries');
  const result = await fetchRecentlyReturnedLoans('user-uuid', 14, 5);

  expect(result).toEqual([]);
  expect(mockFrom).toHaveBeenCalledWith('Loans');
  expect(mockNot).toHaveBeenCalledWith('returned_at', 'is', null);
  expect(mockEqAfterNot).toHaveBeenCalledWith('user_id', 'user-uuid');
  expect(mockGte).toHaveBeenCalled();
  const [col, value] = mockGte.mock.calls[0];
  expect(col).toBe('returned_at');
  expect(typeof value).toBe('string');
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('fetchRecentlyReturnedLoans maps rows into Loan shape', async () => {
  mockLimit.mockResolvedValue({
    data: [
      {
        id: 'loan-1',
        copy_id: 'copy-1',
        user_id: 'user-uuid',
        borrowed_at: '2026-04-01T00:00:00Z',
        due_at: '2026-04-15T00:00:00Z',
        returned_at: '2026-04-14T00:00:00Z',
        renewed_count: 0,
        handled_by: null,
        created_at: null,
        updated_at: null,
        copy: { id: 'copy-1', barcode: 'B1', book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: '123' } },
        borrower: null,
        handler: null,
      },
    ],
    error: null,
  });

  const { fetchRecentlyReturnedLoans } = await import('@/app/lib/supabase/queries');
  const result = await fetchRecentlyReturnedLoans('user-uuid', 14);

  expect(result).toHaveLength(1);
  expect(result[0].book?.title).toBe('Sapiens');
  expect(result[0].returnedAt).toBe('2026-04-14T00:00:00Z');
  expect(result[0].status).toBe('returned');
});
