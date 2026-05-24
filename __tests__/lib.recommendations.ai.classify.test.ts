/** @jest-environment node */

const fetchMock = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash-lite';
  process.env.GEMINI_API_BASE_URL = 'https://example.test/v1beta';
  jest.resetModules();
});

const okResponse = (text: string) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
  } as unknown as Response);

test('classifyAndExtract injects active loans + recent returns into systemInstruction', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"loan_status","reply":"You have one due in 2 days","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  const today = new Date('2026-05-07T00:00:00Z');

  await ai.classifyAndExtract(
    "what's due tomorrow?",
    undefined,
    [],
    [
      {
        id: 'l1',
        copyId: 'c1',
        bookId: 'b1',
        borrowerId: 'u1',
        borrowerName: null,
        borrowerEmail: null,
        borrowerIdentifier: null,
        borrowerRole: null,
        handledBy: null,
        status: 'borrowed',
        borrowedAt: '2026-04-01T00:00:00Z',
        dueAt: '2026-05-09T00:00:00Z',
        returnedAt: null,
        renewedCount: 0,
        createdAt: null,
        updatedAt: null,
        book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null, coverImageUrl: null, classification: null },
      },
    ] as unknown as Parameters<typeof ai.classifyAndExtract>[3],
    [],
    today,
  );

  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.systemInstruction.parts[0].text).toContain('"Sapiens"');
  expect(body.systemInstruction.parts[0].text).toMatch(/Today's date: 2026-05-07/);
});

test('classifyAndExtract returns loan_status intent verbatim', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"loan_status","reply":"You have 1 book due","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  const result = await ai.classifyAndExtract("what's due?");
  expect(result.intent).toBe('loan_status');
});
