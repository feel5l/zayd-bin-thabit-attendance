import { describe, it, expect } from 'vitest';
import { getTodayDateString, getPastDateString } from '../services/initialData';

describe('Riyadh date helpers', () => {
  it('returns YYYY-MM-DD for today in Asia/Riyadh', () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a past date that is still YYYY-MM-DD', () => {
    const past = getPastDateString(1);
    expect(past).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(past <= getTodayDateString()).toBe(true);
  });
});
