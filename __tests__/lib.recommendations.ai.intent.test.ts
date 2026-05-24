/** @jest-environment node */

import type { AiIntent } from '@/app/lib/recommendations/ai';

test('AiIntent includes loan_status', () => {
  const intent: AiIntent = 'loan_status';
  expect(intent).toBe('loan_status');
});
