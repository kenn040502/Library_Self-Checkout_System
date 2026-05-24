/**
 * @jest-environment node
 */
import { POST, GET, DELETE } from '@/app/api/generalChatHistory/route';

const insertMock = jest.fn().mockResolvedValue({ error: null });
const orderMock = jest.fn().mockResolvedValue({
  data: [{ id: 'r1', message_id: 'm1', sender: 'user', text: 'hi', created_at: '2026-05-07T00:00:00Z' }],
  error: null,
});
const eqSelectMock = jest.fn().mockReturnValue({ order: orderMock });
const selectMock = jest.fn().mockReturnValue({ eq: eqSelectMock });
const eqDeleteMock = jest.fn().mockResolvedValue({ error: null });
const deleteMock = jest.fn().mockReturnValue({ eq: eqDeleteMock });
const fromMock = jest.fn(() => ({ insert: insertMock, select: selectMock, delete: deleteMock }));

jest.mock('@/app/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: fromMock }),
}));

jest.mock('@/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 'user-uuid', email: 'a@b.com', role: 'user' }),
}));

beforeEach(() => {
  insertMock.mockClear();
  orderMock.mockClear();
  eqSelectMock.mockClear();
  selectMock.mockClear();
  eqDeleteMock.mockClear();
  deleteMock.mockClear();
  fromMock.mockClear();
});

test('GET returns messages for the session user', async () => {
  const req = new Request('http://localhost/api/generalChatHistory');
  const res = await GET(req);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.messages).toHaveLength(1);
  expect(body.messages[0]).toEqual({
    id: 'm1',
    sender: 'user',
    text: 'hi',
    timestamp: '2026-05-07T00:00:00Z',
  });
  expect(fromMock).toHaveBeenCalledWith('GeneralChatHistory');
  expect(eqSelectMock).toHaveBeenCalledWith('user_id', 'user-uuid');
});

test('POST appends a row for the session user', async () => {
  const req = new Request('http://localhost/api/generalChatHistory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: 'm1', sender: 'user', text: 'hello' }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(insertMock).toHaveBeenCalledWith({
    user_id: 'user-uuid',
    message_id: 'm1',
    sender: 'user',
    text: 'hello',
  });
});

test('POST rejects invalid sender', async () => {
  const req = new Request('http://localhost/api/generalChatHistory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: 'bot', text: 'hi' }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
  expect(insertMock).not.toHaveBeenCalled();
});

test('POST rejects empty text', async () => {
  const req = new Request('http://localhost/api/generalChatHistory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: 'user', text: '   ' }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('DELETE clears all rows for the session user', async () => {
  const req = new Request('http://localhost/api/generalChatHistory', { method: 'DELETE' });
  const res = await DELETE(req);
  expect(res.status).toBe(200);
  expect(eqDeleteMock).toHaveBeenCalledWith('user_id', 'user-uuid');
});
