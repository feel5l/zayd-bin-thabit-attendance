import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  validateStudentIdentity,
  normalizeSaudiMobile,
  normalizeNationalId,
  IDENTITY_MESSAGES,
  MISSING_VALUE_LABEL,
} from '../services/studentValidation';

const roster = [
  { id: 's1', nationalId: '1098765432' },
  { id: 's2', nationalId: '2087654321' },
];

describe('normalizers', () => {
  it('converts Arabic-Indic digits and strips separators', () => {
    expect(normalizeNationalId('١٠٩٨ ٧٦٥-٤٣٣')).toBe('1098765433');
  });

  it.each([
    ['0512345678', '0512345678'],
    ['512345678', '0512345678'],
    ['+966512345678', '0512345678'],
    ['00966512345678', '0512345678'],
    ['966 51 234 5678', '0512345678'],
    ['٠٥١٢٣٤٥٦٧٨', '0512345678'],
  ])('normalises %s -> %s', (raw, expected) => {
    expect(normalizeSaudiMobile(raw)).toBe(expected);
  });
});

describe('validateStudentIdentity (new student)', () => {
  const ctx = { existing: roster, selfId: 's_new' };

  it('accepts a valid citizen id and mobile', () => {
    const r = validateStudentIdentity({ nationalId: '1011111111', parentPhone: '0555555555' }, ctx);
    expect(r).toEqual({ ok: true, nationalId: '1011111111', parentPhone: '0555555555' });
  });

  it('accepts a resident (iqama) id starting with 2', () => {
    expect(validateStudentIdentity({ nationalId: '2011111111', parentPhone: '0555555555' }, ctx).ok).toBe(true);
  });

  it('rejects an empty national id instead of generating one', () => {
    const r = validateStudentIdentity({ nationalId: '', parentPhone: '0555555555' }, ctx);
    expect(r).toEqual({ ok: false, field: 'nationalId', message: IDENTITY_MESSAGES.nationalIdRequired });
  });

  it.each(['123', '3011111111', '10111111111', '10111a1111'])('rejects malformed id %s', (id) => {
    const r = validateStudentIdentity({ nationalId: id, parentPhone: '0555555555' }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('nationalId');
  });

  it('rejects a duplicate national id', () => {
    const r = validateStudentIdentity({ nationalId: '1098765432', parentPhone: '0555555555' }, ctx);
    expect(r).toEqual({ ok: false, field: 'nationalId', message: IDENTITY_MESSAGES.nationalIdDuplicate });
  });

  it('rejects the untouched "05" prefill and malformed phones', () => {
    expect(validateStudentIdentity({ nationalId: '1011111111', parentPhone: '05' }, ctx).ok).toBe(false);
    const bad = validateStudentIdentity({ nationalId: '1011111111', parentPhone: '0412345678' }, ctx);
    expect(bad).toEqual({ ok: false, field: 'parentPhone', message: IDENTITY_MESSAGES.parentPhoneFormat });
  });
});

describe('validateStudentIdentity (edit)', () => {
  it('does not flag the student against their own id', () => {
    const r = validateStudentIdentity(
      { nationalId: '1098765432', parentPhone: '0555555555' },
      { existing: roster, selfId: 's1', original: { nationalId: '1098765432', parentPhone: '0555555555' } },
    );
    expect(r.ok).toBe(true);
  });

  it('does not block unrelated edits on a legacy record with a non-standard id', () => {
    const r = validateStudentIdentity(
      { nationalId: '4455667', parentPhone: '0555555555' },
      { existing: roster, selfId: 's9', original: { nationalId: '4455667', parentPhone: '0555555555' } },
    );
    expect(r.ok).toBe(true);
  });

  it('validates a legacy id once it is changed', () => {
    const r = validateStudentIdentity(
      { nationalId: '4455668', parentPhone: '0555555555' },
      { existing: roster, selfId: 's9', original: { nationalId: '4455667', parentPhone: '0555555555' } },
    );
    expect(r.ok).toBe(false);
  });
});

describe('regression guard: no invented identity data in the UI', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf-8');

  it('StudentDirectory never generates national ids or student numbers', () => {
    const src = read('components/StudentDirectory.tsx');
    expect(src).not.toMatch(/nationalId:\s*`[^`]*Math\.random/);
    expect(src).not.toMatch(/studentNumber:\s*`[^`]*Math\.random/);
  });

  it('PrintableDailyReport never prints random ids or the 050xxxxxxx placeholder', () => {
    const src = read('components/PrintableDailyReport.tsx');
    expect(src).not.toMatch(/nationalId:[^\n]*Math\.random/);
    expect(src).not.toContain('050xxxxxxx');
    expect(src).toContain('MISSING_VALUE_LABEL');
  });

  it('exposes a stable label for missing values', () => {
    expect(MISSING_VALUE_LABEL).toBe('غير مسجّل');
  });
});
