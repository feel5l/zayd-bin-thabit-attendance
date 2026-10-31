/**
 * Client-side validation for the guardian mobile number.
 *
 * National / iqama ids are intentionally NOT collected, stored or shown for
 * students: the app has no use for them. The rule below mirrors the server
 * (supabase/functions/admin-manage/index.ts): guardian mobile = 05xxxxxxxx.
 * The client never invents a value; a malformed one is rejected with a message
 * the admin can act on.
 */

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

// Both members declare every property so access type-checks even where the
// project's tsconfig does not narrow discriminated unions (strict is off).
export type GuardianPhoneResult =
  | { ok: true; parentPhone: string; message?: undefined }
  | { ok: false; message: string; parentPhone?: undefined };

export const PHONE_MESSAGES = {
  required: 'جوال ولي الأمر مطلوب.',
  format: 'جوال ولي الأمر غير صحيح. الصيغة المطلوبة: 05xxxxxxxx',
} as const;

/**
 * @param original the stored phone when editing. A legacy value that is left
 * untouched is not re-validated, so unrelated edits are not blocked by older
 * records; changing it does validate it.
 */
export function validateGuardianPhone(rawPhone: string, original?: string): GuardianPhoneResult {
  const parentPhone = normalizeSaudiMobile(rawPhone);
  const originalTrimmed = original?.trim();
  const unchanged = !!originalTrimmed && parentPhone === originalTrimmed;
  if (!parentPhone || parentPhone === '05') return { ok: false, message: PHONE_MESSAGES.required };
  if (!unchanged && !SAUDI_MOBILE_RE.test(parentPhone)) return { ok: false, message: PHONE_MESSAGES.format };
  return { ok: true, parentPhone };
}

/** Text shown on printed reports when a stored value is missing. Never random. */
export const MISSING_VALUE_LABEL = 'غير مسجّل';
