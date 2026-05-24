/** @jest-environment node */
export {};

const fetchMock = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.DEEPSEEK_API_KEY = 'test-key';
  process.env.DEEPSEEK_MODEL = 'deepseek-v4-flash';
  process.env.DEEPSEEK_API_BASE_URL = 'https://example.test';
  process.env.DEEPSEEK_TIMEOUT_MS = '50';
  jest.resetModules();
});

const chatResponse = (content: string) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
    text: () => Promise.resolve(content),
  } as unknown as Response);

test('callDeepSeekJson posts to /chat/completions with json mode and parses the content', async () => {
  fetchMock.mockReturnValueOnce(chatResponse('{"intent":"greeting"}'));
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');

  const result = await callDeepSeekJson('sys', 'hello', { maxTokens: 64 });

  expect(result).toEqual({ ok: true, data: { intent: 'greeting' } });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://example.test/chat/completions');
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.model).toBe('deepseek-v4-flash');
  expect(body.response_format).toEqual({ type: 'json_object' });
  expect(body.stream).toBe(false);
  expect(body.messages).toEqual([
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'hello' },
  ]);
  expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-key' });
});

test('callDeepSeekJson classifies a 429 as rate_limit', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve('slow down') } as unknown as Response),
  );
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'rate_limit' });
});

test('callDeepSeekJson classifies a 401 as auth', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('bad key') } as unknown as Response),
  );
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'auth' });
});

test('callDeepSeekJson classifies a 403 as auth', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('forbidden') } as unknown as Response),
  );
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'auth' });
});

test('callDeepSeekJson classifies a 500 as server', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('oops') } as unknown as Response),
  );
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'server' });
});

test('callDeepSeekJson classifies unparseable content as bad_response', async () => {
  fetchMock.mockReturnValueOnce(chatResponse('not json at all'));
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'bad_response' });
});

test('callDeepSeekJson classifies an aborted/slow request as timeout', async () => {
  fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
    return new Promise((_resolve, reject) => {
      const signal = init.signal as AbortSignal;
      signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  });
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'timeout' });
});

test('callDeepSeekJson returns auth when the key is missing', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  jest.resetModules();
  const { callDeepSeekJson } = await import('@/app/lib/ai/deepseek');
  expect(await callDeepSeekJson('s', 'u')).toEqual({ ok: false, kind: 'auth' });
  expect(fetchMock).not.toHaveBeenCalled();
});

function sseStreamResponse(lines: string[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(enc.encode(line));
      controller.close();
    },
  });
  return { ok: true, status: 200, body } as unknown as Response;
}

test('streamDeepSeekText yields delta chunks parsed from OpenAI-style SSE', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve(
      sseStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"there"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    ),
  );
  const { streamDeepSeekText } = await import('@/app/lib/ai/deepseek');

  const chunks: string[] = [];
  let sawError = false;
  for await (const ev of streamDeepSeekText('sys', 'hi')) {
    if (ev.type === 'delta') chunks.push(ev.text);
    if (ev.type === 'error') sawError = true;
  }
  expect(sawError).toBe(false);
  expect(chunks.join('')).toBe('Hello there');

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://example.test/chat/completions');
  const reqBody = JSON.parse((init as RequestInit).body as string);
  expect(reqBody.stream).toBe(true);
  expect(reqBody.response_format).toBeUndefined();
});

test('streamDeepSeekText handles SSE lines split across network chunks', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve(
      sseStreamResponse([
        'data: {"choices":[{"delta":{"con',
        'tent":"AB"}}]}\n\ndata: {"choices":[{"delta":{"content":"CD"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    ),
  );
  const { streamDeepSeekText } = await import('@/app/lib/ai/deepseek');
  const chunks: string[] = [];
  for await (const ev of streamDeepSeekText('s', 'u')) {
    if (ev.type === 'delta') chunks.push(ev.text);
  }
  expect(chunks.join('')).toBe('ABCD');
});

test('streamDeepSeekText yields an error event on a 500', async () => {
  fetchMock.mockReturnValueOnce(
    Promise.resolve({ ok: false, status: 502, text: () => Promise.resolve('bad gateway') } as unknown as Response),
  );
  const { streamDeepSeekText } = await import('@/app/lib/ai/deepseek');
  const events: Array<{ type: string }> = [];
  for await (const ev of streamDeepSeekText('s', 'u')) events.push(ev);
  expect(events).toEqual([{ type: 'error', kind: 'server' }]);
});

test('streamDeepSeekText yields auth error when the key is missing', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  jest.resetModules();
  const { streamDeepSeekText } = await import('@/app/lib/ai/deepseek');
  const events: Array<{ type: string }> = [];
  for await (const ev of streamDeepSeekText('s', 'u')) events.push(ev);
  expect(events).toEqual([{ type: 'error', kind: 'auth' }]);
  expect(fetchMock).not.toHaveBeenCalled();
});
