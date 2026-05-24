import { computeRoleCounts } from '@/app/ui/dashboard/admin/roleTabs';
import type { ManagedRole } from '@/app/ui/dashboard/admin/userProfileFields';

const u = (role: ManagedRole) => ({ id: role + Math.random(), role } as { id: string; role: ManagedRole });

describe('computeRoleCounts', () => {
  it('counts users by role and reports total', () => {
    const users = [u('user'), u('user'), u('user'), u('staff'), u('staff'), u('admin')];
    expect(computeRoleCounts(users)).toEqual({ all: 6, user: 3, staff: 2, admin: 1 });
  });

  it('returns all-zeros for empty list', () => {
    expect(computeRoleCounts([])).toEqual({ all: 0, user: 0, staff: 0, admin: 0 });
  });
});
