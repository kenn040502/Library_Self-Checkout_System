const fs = require('node:fs');

describe('handoff cleanup', () => {
  test('handoff docs and auto-tag route do not advertise OpenAI fallback env vars', () => {
    const files = [
      '.env.example',
      'README.md',
      'app/api/book/auto-tag/route.ts',
    ];

    for (const file of files) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/OPENAI_|callOpenAI|OpenAI fallback/);
    }
  });

  test('handoff branch keeps one database setup path and no legacy maintenance scripts', () => {
    const removedPaths = [
      'supabase/schema.sql',
      'supabase/migrations',
      'scripts/seed-books.mjs',
      'scripts/fill-cover-images.mjs',
      'scripts/verify-books-openlibrary.mjs',
      'scripts/verify-books-titlesearch.mjs',
      'scripts/verify-covers.mjs',
      'app/dev',
      'app/admin/page.tsx',
      'app/staff/page.tsx',
      'app/user/page.tsx',
    ];

    for (const removedPath of removedPaths) {
      expect(fs.existsSync(removedPath)).toBe(false);
    }

    expect(fs.existsSync('supabase/setup.sql')).toBe(true);
    expect(fs.existsSync('scripts/setup-database.cjs')).toBe(true);
    expect(fs.existsSync('scripts/seed-books-bulk.mjs')).toBe(true);
  });
});
