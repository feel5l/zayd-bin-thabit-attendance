import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  validateGuardianPhone,
  normalizeSaudiMobile,
  PHONE_MESSAGES,
  MISSING_VALUE_LABEL,
} from '../services/studentValidation';

describe('normalizeSaudiMobile', () => {
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

describe('validateGuardianPhone', () => {
  it('accepts a valid mobile and returns it normalised', () => {
    expect(validateGuardianPhone('+966555555555')).toEqual({ ok: true, parentPhone: '0555555555' });
  });

  it('rejects an empty value and the untouched "05" prefill', () => {
    expect(validateGuardianPhone('')).toEqual({ ok: false, message: PHONE_MESSAGES.required });
    expect(validateGuardianPhone('05')).toEqual({ ok: false, message: PHONE_MESSAGES.required });
  });

  it.each(['0412345678', '051234567', '05123456789', '05abc45678'])('rejects malformed %s', (p) => {
    expect(validateGuardianPhone(p)).toEqual({ ok: false, message: PHONE_MESSAGES.format });
  });

  it('does not block unrelated edits on a legacy record with a non-standard phone', () => {
    expect(validateGuardianPhone('05123456789', '05123456789').ok).toBe(true);
  });

  it('validates a legacy phone once it is changed', () => {
    expect(validateGuardianPhone('05123456780', '05123456789').ok).toBe(false);
  });
});

describe('regression guard: student national ids are not collected, shown or invented', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf-8');

  it.each([
    'components/StudentDirectory.tsx',
    'components/StudentImportModal.tsx',
    'components/PrintableDailyReport.tsx',
    'components/StudentReferralModal.tsx',
  ])('%s has no national id handling', (file) => {
    expect(read(file)).not.toMatch(/nationalId|national_id/);
  });

  it('no UI file generates random identity or phone placeholders', () => {
    for (const file of ['components/StudentDirectory.tsx', 'components/StudentImportModal.tsx', 'components/PrintableDailyReport.tsx']) {
      const src = read(file);
      expect(src, file).not.toMatch(/studentNumber:\s*`[^`]*Math\.random/);
      expect(src, file).not.toContain('050xxxxxxx');
    }
  });

  it('the Student type and the Google Sheets student export carry no national id', () => {
    const types = read('types.ts');
    const student = types.slice(types.indexOf('export interface Student {'));
    expect(student.slice(0, student.indexOf('}'))).not.toMatch(/nationalId/);
    expect(read('services/googleSheetsService.ts')).not.toMatch(/st\.nationalId|رقم الهوية الوطنية/);
  });

  it('the edge functions never require, return or store a student national id', () => {
    expect(read('supabase/functions/get-student-contacts/index.ts')).not.toMatch(/national_id/);
    const admin = read('supabase/functions/admin-manage/index.ts');
    const studentSave = admin.slice(admin.indexOf('async function studentSave'));
    expect(studentSave.slice(0, studentSave.indexOf('\nasync function ', 10) > 0 ? studentSave.indexOf('\nasync function ', 10) : undefined)).not.toMatch(/national_id|nationalId/);
  });

  it('exposes a stable label for missing values', () => {
    expect(MISSING_VALUE_LABEL).toBe('غير مسجّل');
  });
});
