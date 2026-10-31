/**
 * Client-side validation for student identity fields.
 *
 * The rules mirror the server (supabase/functions/admin-manage/index.ts):
 *   - national id / iqama: exactly 10 digits, starting with 1 or 2
 *   - guardian mobile:     05xxxxxxxx
 *   - national id is unique per school
 *
 * The client never invents these values. An empty or malformed value is
 * rejected with a message the admin can act on; it is never replaced by a
 * generated one.
 */

export const NATIONAL_ID_RE = /^[12]\d{9}$/;
export const SAUDI_MOBILE_RE = /^05\d{8}$/;

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Arabic-Indic / Persian digits (typed on Arabic keyboards) to 0-9. */
export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_INDIC.indexOf(ch);
    if (a >= 0) return String(a);
    return String(EASTERN_ARABIC_INDIC.indexOf(ch));
  });
}

export function normalizeNationalId(raw: string): string {
  return toLatinDigits(raw ?? '').replace(/[\s-]/g, '');
}

/**
 * Normalise a Saudi mobile to 05xxxxxxxx. Accepts 05xxxxxxxx, 5xxxxxxxx,
 * +9665xxxxxxxx, 009665xxxxxxxx and 9665xxxxxxxx, with spaces or dashes.
 * Anything else is returned cleaned but unchanged so validation rejects it.
 */
export function normalizeSaudiMobile(raw: string): string {
  const cleaned = toLatinDigits(raw ?? '').replace(/[\s\-().]/g, '');
  const digits = cleaned.replace(/^\+/, '');
  if (/^009665\d{8}$/.test(digits)) return '0' + digits.slice(5);
  if (/^9665\d{8}$/.test(digits)) return '0' + digits.slice(3);
  if (/^5\d{8}$/.test(digits)) return '0' + digits;
  return digits;
}

export type StudentIdentityField = 'nationalId' | 'parentPhone';

// Every member declares every property so access type-checks even where the
// project's tsconfig does not narrow discriminated unions (strict is off).
export type StudentIdentityResult =
  | { ok: true; nationalId: string; parentPhone: string; field?: undefined; message?: undefined }
  | { ok: false; field: StudentIdentityField; message: string; nationalId?: undefined; parentPhone?: undefined };

export interface StudentIdentityInput {
  nationalId: string;
  parentPhone: string;
}

export interface StudentIdentityContext {
  /** Students already on the roster, for the uniqueness check. */
  existing: ReadonlyArray<{ id: string; nationalId?: string }>;
  /** Id of the student being edited (excluded from the uniqueness check). */
  selfId: string;
  /**
   * When editing, the stored values. A legacy value that is left untouched is
   * not re-validated, so unrelated edits (e.g. fixing a name) are not blocked
   * by older records; changing the field does validate it.
   */
  original?: { nationalId?: string; parentPhone?: string };
}

export const IDENTITY_MESSAGES = {
  nationalIdRequired: 'رقم الهوية/الإقامة مطلوب ولا يُولَّد تلقائيًا.',
  nationalIdFormat: 'رقم الهوية/الإقامة يجب أن يكون 10 أرقام يبدأ بـ 1 أو 2.',
  nationalIdDuplicate: 'رقم الهوية مسجّل لطالب آخر.',
  parentPhoneRequired: 'جوال ولي الأمر مطلوب.',
  parentPhoneFormat: 'جوال ولي الأمر غير صحيح. الصيغة المطلوبة: 05xxxxxxxx',
} as const;

export function validateStudentIdentity(
  input: StudentIdentityInput,
  ctx: StudentIdentityContext,
): StudentIdentityResult {
  const nationalId = normalizeNationalId(input.nationalId);
  const parentPhone = normalizeSaudiMobile(input.parentPhone);

  const originalNid = ctx.original?.nationalId?.trim();
  const nidUnchanged = originalNid !== undefined && originalNid !== '' && nationalId === originalNid;
  if (!nationalId) {
    return { ok: false, field: 'nationalId', message: IDENTITY_MESSAGES.nationalIdRequired };
  }
  if (!nidUnchanged && !NATIONAL_ID_RE.test(nationalId)) {
    return { ok: false, field: 'nationalId', message: IDENTITY_MESSAGES.nationalIdFormat };
  }
  const clash = ctx.existing.some((s) => s.id !== ctx.selfId && (s.nationalId ?? '').trim() === nationalId);
  if (clash) {
    return { ok: false, field: 'nationalId', message: IDENTITY_MESSAGES.nationalIdDuplicate };
  }

  const originalPhone = ctx.original?.parentPhone?.trim();
  const phoneUnchanged = originalPhone !== undefined && originalPhone !== '' && parentPhone === originalPhone;
  if (!parentPhone || parentPhone === '05') {
    return { ok: false, field: 'parentPhone', message: IDENTITY_MESSAGES.parentPhoneRequired };
  }
  if (!phoneUnchanged && !SAUDI_MOBILE_RE.test(parentPhone)) {
    return { ok: false, field: 'parentPhone', message: IDENTITY_MESSAGES.parentPhoneFormat };
  }

  return { ok: true, nationalId, parentPhone };
}

/** Text shown on printed reports when a stored value is missing. Never random. */
export const MISSING_VALUE_LABEL = 'غير مسجّل';
