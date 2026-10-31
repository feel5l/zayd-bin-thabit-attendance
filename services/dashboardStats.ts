import type { ClassAttendanceSubmission } from '../types';

/**
 * Pure helpers behind the admin dashboard charts. Every number comes from
 * stored attendance submissions; nothing is invented. When there is no data the
 * helpers return null / an empty list so the UI can say so instead of showing a
 * made-up figure.
 */

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** present / (present + absent) as a whole percent; null when nothing was recorded. */
export function rateOf(present: number, absent: number): number | null {
  const total = present + absent;
  return total > 0 ? Math.round((present / total) * 100) : null;
}

export function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function weekdayArabic(date: string): string {
  return WEEKDAYS_AR[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

export interface TrendPoint {
  day: string;
  date: string;
  attendance: number;
  absence: number;
}

/**
 * Attendance rate per day for the last `days` calendar days ending at
 * `selectedDate`. Days on which no class sheet exists are left out (a gap, not
 * a guessed value).
 */
export function buildTrend(
  selectedDate: string,
  getSubmissions: (date: string) => ClassAttendanceSubmission[],
  days = 7,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const date = shiftDate(selectedDate, -back);
    const subs = getSubmissions(date);
    const rate = rateOf(
      subs.reduce((n, s) => n + (s.presentCount || 0), 0),
      subs.reduce((n, s) => n + (s.absentCount || 0), 0),
    );
    if (rate === null) continue;
    points.push({ day: weekdayArabic(date), date, attendance: rate, absence: 100 - rate });
  }
  return points;
}

/** Mean of the plotted days, one decimal; null when there is nothing to average. */
export function averageRate(points: TrendPoint[]): number | null {
  if (points.length === 0) return null;
  return Math.round((points.reduce((n, p) => n + p.attendance, 0) / points.length) * 10) / 10;
}

export interface ReasonSlice {
  name: string;
  value: number;
  color: string;
}

/** Today's absence breakdown by status. Categories with no cases are omitted. */
export function buildReasonBreakdown(counts: { absentCount: number; excusedCount: number; lateCount: number }): ReasonSlice[] {
  return [
    { name: 'غياب بعذر', value: counts.excusedCount, color: '#3B82F6' },
    { name: 'غياب بدون عذر', value: counts.absentCount, color: '#EF4444' },
    { name: 'تأخر', value: counts.lateCount, color: '#F59E0B' },
  ].filter((slice) => slice.value > 0);
}
