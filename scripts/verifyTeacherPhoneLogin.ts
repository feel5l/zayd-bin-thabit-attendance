/**
 * Live audit: every official teacher phone/national ID must resolve via
 * teacher-login to the matching teacher id and return a deviceToken.
 *
 * Usage:
 *   npx tsx scripts/verifyTeacherPhoneLogin.ts
 *   TEACHER_LOGIN_URL=https://…/functions/v1/teacher-login npx tsx …
 *
 * Does not print raw phone numbers or tokens — only ids and pass/fail.
 */
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';

const DEFAULT_URL =
  'https://dhpvladkiqajorowrlhj.supabase.co/functions/v1/teacher-login';
const URL = (process.env.TEACHER_LOGIN_URL || DEFAULT_URL).replace(/\/$/, '');

type Probe = {
  http: number;
  found: boolean;
  returnedId: string | null;
  idMatch: boolean;
  hasDeviceToken: boolean;
  ambiguous: boolean;
};

async function probe(identifier: string, expectedId: string): Promise<Probe> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const teacher = body.teacher as { id?: string } | undefined;
  return {
    http: res.status,
    found: Boolean(body.found),
    returnedId: teacher?.id ?? null,
    idMatch: teacher?.id === expectedId,
    hasDeviceToken: typeof body.deviceToken === 'string' && body.deviceToken.length > 0,
    ambiguous: Boolean(body.ambiguous),
  };
}

async function main() {
  const failures: string[] = [];
  let phoneOk = 0;
  let nidOk = 0;

  for (const t of OFFICIAL_TEACHERS_LIST) {
    if (!t.phone) {
      failures.push(`${t.id}: missing phone in teachersData`);
      continue;
    }
    const phone = await probe(t.phone, t.id);
    if (phone.idMatch && phone.hasDeviceToken) {
      phoneOk += 1;
      console.log(`OK phone  ${t.id} → ${phone.returnedId}`);
    } else {
      failures.push(
        `${t.id}: phone login failed http=${phone.http} found=${phone.found} returned=${phone.returnedId} token=${phone.hasDeviceToken}`,
      );
    }

    if (t.nationalId) {
      const nid = await probe(t.nationalId, t.id);
      if (nid.idMatch && nid.hasDeviceToken) {
        nidOk += 1;
        console.log(`OK nid    ${t.id} → ${nid.returnedId}`);
      } else {
        failures.push(
          `${t.id}: nationalId login failed http=${nid.http} found=${nid.found} returned=${nid.returnedId} token=${nid.hasDeviceToken}`,
        );
      }
    }
  }

  console.log(
    `\nSummary: phone ${phoneOk}/${OFFICIAL_TEACHERS_LIST.length}, nationalId ${nidOk}, failures ${failures.length}`,
  );
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
