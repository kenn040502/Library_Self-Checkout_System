const {
  SETUP_SQL,
  buildSetupPlan,
  isPlaceholderValue,
  parseCliArgs,
  resolveDatabaseUrl,
  shouldUseSsl,
} = require('../scripts/setup-database.cjs');

describe('setup-database helpers', () => {
  test('buildSetupPlan runs one consolidated Supabase setup script', () => {
    const plan = buildSetupPlan();

    expect(SETUP_SQL).toBe('supabase/setup.sql');
    expect(plan).toEqual([SETUP_SQL]);
  });

  test('resolveDatabaseUrl prefers non-pooling Supabase URL and rejects placeholders', () => {
    expect(
      resolveDatabaseUrl({
        POSTGRES_URL: 'postgres://pooled.example',
        POSTGRES_URL_NON_POOLING: 'postgres://direct.example',
      }),
    ).toBe('postgres://direct.example');

    expect(() =>
      resolveDatabaseUrl({
        POSTGRES_URL_NON_POOLING: '<To-be-generated>',
        POSTGRES_URL: '',
      }),
    ).toThrow(/POSTGRES_URL_NON_POOLING/);
  });

  test('placeholder detection catches redacted handoff values', () => {
    expect(isPlaceholderValue('<To-be-generated>')).toBe(true);
    expect(isPlaceholderValue('')).toBe(true);
    expect(isPlaceholderValue('postgres://user:pass@example.com/db')).toBe(false);
  });

  test('parseCliArgs supports dry-run and seed flags', () => {
    expect(parseCliArgs(['--dry-run', '--with-seed'])).toEqual({
      dryRun: true,
      withSeed: true,
    });
  });

  test('shouldUseSsl skips local databases and uses SSL for hosted databases', () => {
    expect(shouldUseSsl('postgres://postgres:postgres@localhost:54322/postgres')).toBe(false);
    expect(shouldUseSsl('postgres://postgres:postgres@127.0.0.1:54322/postgres')).toBe(false);
    expect(shouldUseSsl('postgres://postgres:secret@db.example.supabase.co:5432/postgres')).toBe(true);
  });
});
