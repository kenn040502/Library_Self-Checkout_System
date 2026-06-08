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
});
