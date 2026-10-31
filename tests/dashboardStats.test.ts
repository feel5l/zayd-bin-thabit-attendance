import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rateOf, shiftDate, weekdayArabic, buildTrend, averageRate, buildReasonBreakdown } from '../services/dashboardStats';

const sub = (date: string, present: number, absent: number) => ({ date, presentCount: present, absentCount: absent }) as any;

describe('rateOf', () => {
  it('is present / (present + absent), rounded', () => {
    expect(rateOf(30, 1)).toBe(97);
    expect(rateOf(67, 1)).toBe(99);
    expect(rateOf(0, 5)).toBe(0); // a real 0% must stay 0, not become a placeholder
  });
  it('is null when nothing was recorded (never a made-up percentage)', () => {
    expect(rateOf(0, 0)).toBeNull();
  });
});

describe('dates', () => {
  it('shifts across month ends and names the weekday', () => {
    expect(shiftDate('2026-11-02', -4)).toBe('2026-10-29');
    expect(shiftDate('2026-11-02', 1)).toBe('2026-11-03');
    expect(weekdayArabic('2026-11-02')).toBe('الإثنين');
    expect(weekdayArabic('2026-11-01')).toBe('الأحد');
  });
});

describe('buildTrend', () => {
  const store: Record<string, any[]> = {
    '2026-11-01': [sub('2026-11-01', 90, 10)],
    '2026-11-02': [sub('2026-11-02', 30, 2), sub('2026-11-02', 20, 0)],
  };
  const get = (d: string) => store[d] ?? [];

  it('plots only days that have sheets, with the real rate', () => {
    const pts = buildTrend('2026-11-02', get);
    expect(pts.map(p => p.date)).toEqual(['2026-11-01', '2026-11-02']);
    expect(pts[0]).toMatchObject({ day: 'الأحد', attendance: 90, absence: 10 });
    expect(pts[1]).toMatchObject({ day: 'الإثنين', attendance: 96, absence: 4 }); // 50 / 52
  });
  it('returns no points when there is no data at all', () => {
    expect(buildTrend('2026-11-02', () => [])).toEqual([]);
  });
  it('averages what is plotted, one decimal, and is null for nothing', () => {
    expect(averageRate(buildTrend('2026-11-02', get))).toBe(93);
    expect(averageRate([])).toBeNull();
  });
});

describe('buildReasonBreakdown', () => {
  it('lists only categories that have real cases', () => {
    expect(buildReasonBreakdown({ absentCount: 1, excusedCount: 0, lateCount: 2 }).map(s => [s.name, s.value])).toEqual([['غياب بدون عذر', 1], ['تأخر', 2]]);
    expect(buildReasonBreakdown({ absentCount: 0, excusedCount: 0, lateCount: 0 })).toEqual([]);
  });
});

describe('regression guard: the dashboard shows no invented numbers', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf-8');

  it('AdminDashboard has no placeholder percentages or hard-coded chart data', () => {
    const src = read('components/AdminDashboard.tsx');
    expect(src).not.toMatch(/attendanceRate\s*\|\|\s*95/);
    expect(src).not.toContain('95.4%');
    expect(src).not.toMatch(/attendance:\s*9[0-9],\s*absence/);
    expect(src).not.toMatch(/gradeComparisonData/);
    expect(src).not.toMatch(/ظرف عائلي طارئ/);
    expect(src).not.toMatch(/\{ name: 'مرض بعذر طبي'/);
  });

  it('reminders never claim a message was sent when nothing is delivered', () => {
    for (const file of ['components/AdminDashboard.tsx', 'components/TeacherReminderModal.tsx']) {
      const src = read(file);
      expect(src, file).not.toMatch(/تم إرسال (إشعار تذكير|تنبيه)/);
    }
  });

  it('submit-attendance takes the class labels from the classes table', () => {
    const src = read('supabase/functions/submit-attendance/index.ts');
    expect(src).toMatch(/from\("classes"\)\s*\.select\("short_name, grade_level"\)/);
    expect(src).toMatch(/class_name:\s*classInfo\?\.short_name/);
    expect(src).toMatch(/grade_level:\s*classInfo\?\.grade_level/);
  });
});
