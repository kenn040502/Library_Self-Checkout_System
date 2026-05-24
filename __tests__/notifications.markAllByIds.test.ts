/**
 * Behavioral test for the new mark-by-ids contract.
 * Asserts that calling markNotificationsReadByIds upserts read rows
 * exactly for those IDs. Mocks the Supabase server client.
 */
import { markNotificationsReadByIds } from '@/app/lib/supabase/notifications';

const upsertMock = jest.fn().mockResolvedValue({ error: null });
const fromMock = jest.fn().mockReturnValue({ upsert: upsertMock });

jest.mock('@/app/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  upsertMock.mockClear();
  fromMock.mockClear();
});

test('upserts a NotificationReads row per id, all for the same user', async () => {
  await markNotificationsReadByIds('user-uuid', ['n1', 'n2', 'n3']);
  expect(fromMock).toHaveBeenCalledWith('NotificationReads');
  expect(upsertMock).toHaveBeenCalledTimes(1);
  expect(upsertMock).toHaveBeenCalledWith(
    [
      { notification_id: 'n1', user_id: 'user-uuid' },
      { notification_id: 'n2', user_id: 'user-uuid' },
      { notification_id: 'n3', user_id: 'user-uuid' },
    ],
    { onConflict: 'notification_id,user_id' },
  );
});

test('no-ops cleanly on empty array', async () => {
  await markNotificationsReadByIds('user-uuid', []);
  expect(fromMock).not.toHaveBeenCalled();
});
