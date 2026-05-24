import { buildSystemPrompt } from '@/app/lib/readingAssistant/systemPrompt';
import { studentFaqSections } from '@/app/ui/dashboard/studentFaqData';

describe('buildSystemPrompt', () => {
  test('includes every FAQ section title', () => {
    const prompt = buildSystemPrompt();
    for (const section of studentFaqSections) {
      expect(prompt).toContain(section.title);
    }
  });

  test('includes Reading Assistant role + tone + emoji ban', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/Reading Assistant/i);
    expect(prompt).toMatch(/Swinburne/i); // university scoping
    expect(prompt).toMatch(/never use emoji|no emoji/i);
  });

  test('mentions both capabilities (FAQ answers + book recommendations)', () => {
    const prompt = buildSystemPrompt();
    // FAQ branch
    expect(prompt).toMatch(/library policies|loans|holds|renewals/i);
    // Recommendation branch
    expect(prompt).toMatch(/find books|recommend|catalogue/i);
  });

  test('includes at least one full FAQ question and answer', () => {
    const prompt = buildSystemPrompt();
    const firstSection = studentFaqSections[0];
    const firstItem = firstSection.items[0];
    expect(prompt).toContain(firstItem.question);
    // Answer might be split across array; pick the first paragraph and check
    expect(prompt).toContain(firstItem.answer[0]);
  });

  test('total prompt size stays under 32 KB', () => {
    const prompt = buildSystemPrompt();
    const bytes = Buffer.byteLength(prompt, 'utf8');
    expect(bytes).toBeLessThan(32 * 1024);
  });

  test('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(500);
  });
});
