import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';
import { PUBLIC_TEACHERS_LIST } from '../services/teachersPublic';
import { normaliseSaudiPhone } from '../services/teacherAuth';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('teacher phone ↔ login id linkage', () => {
  it('every official teacher has a unique normalised phone linked to a stable id', () => {
    const phones = new Map<string, string>();
    for (const t of OFFICIAL_TEACHERS_LIST) {
      expect(t.phone, `${t.id} must have a phone for login`).toBeTruthy();
      const norm = normaliseSaudiPhone(t.phone!);
      expect(norm, `${t.id} phone must normalise`).toMatch(/^05\d{8}$/);
      expect(phones.has(norm), `duplicate phone for ${t.id} and ${phones.get(norm)}`).toBe(false);
      phones.set(norm, t.id);
    }
    expect(phones.size).toBe(OFFICIAL_TEACHERS_LIST.length);
  });

  it('public roster ids match official roster (no orphan login targets)', () => {
    const officialIds = OFFICIAL_TEACHERS_LIST.map((t) => t.id).sort();
    const publicIds = PUBLIC_TEACHERS_LIST.map((t) => t.id).sort();
    expect(publicIds).toEqual(officialIds);
  });

  it('phone and national-id hashes are unique across the roster', () => {
    const phoneHashes = new Set<string>();
    const nidHashes = new Set<string>();
    for (const t of OFFICIAL_TEACHERS_LIST) {
      const ph = sha256Hex(normaliseSaudiPhone(t.phone!));
      expect(phoneHashes.has(ph), `phone_hash collision for ${t.id}`).toBe(false);
      phoneHashes.add(ph);

      if (t.nationalId) {
        const nh = sha256Hex(t.nationalId.trim());
        expect(nidHashes.has(nh), `national_id_hash collision for ${t.id}`).toBe(false);
        nidHashes.add(nh);
      }
    }
  });

  it('normalises common Saudi phone input variants to the same login key', () => {
    const base = '0508869616';
    const variants = [
      base,
      '966508869616',
      '+966508869616',
      '00966508869616',
      '508869616',
      '050 886 9616',
      '050-886-9616',
    ];
    const hashes = variants.map((v) => sha256Hex(normaliseSaudiPhone(v)));
    expect(new Set(hashes).size).toBe(1);
    expect(hashes[0]).toBe(sha256Hex(base));
  });
});
