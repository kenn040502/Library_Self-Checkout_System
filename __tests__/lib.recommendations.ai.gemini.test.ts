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

test('callGemini puts system prompt in systemInstruction (not contents)', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"greeting","reply":"hi","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  await ai.classifyAndExtract('hi', undefined);

  expect(fetchMock).toHaveBeenCalled();
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.systemInstruction).toBeDefined();
  expect(body.systemInstruction.parts[0].text).toMatch(/library assistant/i);
  expect(body.contents.length).toBeGreaterThan(0);
  body.contents.forEach((c: { role: string }) => {
    expect(['user', 'model']).toContain(c.role);
  });
});

test('callGemini emits alternating user/model turns when history provided', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"answer","reply":"ok","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  await ai.classifyAndExtract(
    'history!',
    undefined,
    [
      { sender: 'user', text: 'recommend a Japan book' },
      { sender: 'assistant', text: 'What aspect of Japan?' },
    ],
  );

  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.contents).toHaveLength(3);
  expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'recommend a Japan book' }] });
  expect(body.contents[1]).toEqual({ role: 'model', parts: [{ text: 'What aspect of Japan?' }] });
  expect(body.contents[2]).toEqual({ role: 'user', parts: [{ text: 'history!' }] });
});
