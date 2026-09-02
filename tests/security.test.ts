import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const LEGACY_ADMIN_PASSWORD = ['Aa', '12345'].join('');
const LEGACY_ALT_PASSWORD = 'admin' + '123';

describe('security hardening', () => {
  it('does not contain hardcoded admin passwords in source files', () => {
    const targets = [
      'components/LoginModal.tsx',
      'components/TeacherAndClassManagerModal.tsx'
    ];

    targets.forEach(relativePath => {
      const content = readFileSync(join(ROOT, relativePath), 'utf8');
      expect(content).not.toContain(LEGACY_ADMIN_PASSWORD);
      expect(content).not.toContain(LEGACY_ALT_PASSWORD);
      expect(content).toContain('VITE_ADMIN_PASSWORD');
    });
  });

  it('removes quick admin login bypass from LoginModal', () => {
    const content = readFileSync(join(ROOT, 'components/LoginModal.tsx'), 'utf8');
    expect(content).not.toContain('handleQuickAdminLogin');
    expect(content).not.toContain('دخول فوري مباشر للإدارة');
  });

  it('never matches a phone number fuzzily in LoginModal', () => {
    const content = readFileSync(join(ROOT, 'components/LoginModal.tsx'), 'utf8');
    // The original bug was endsWith() matching, where a short input could log
    // someone in as a different teacher. Matching now happens server side on a
    // SHA-256 hash, which cannot be partial — but keep the guard so no local
    // fuzzy comparison creeps back in.
    expect(content).not.toContain('.endsWith(');
    expect(content).not.toContain('.includes(cleanDigits');
    expect(content).toContain('lookupTeacher(');
  });

  it('does not ship teacher phone numbers or national IDs in app code', () => {
    // services/teachersData.ts still holds the real details for build-time
    // scripts, but no file the bundler follows from the app may import it:
    // doing so publishes 20 teachers' personal data to every visitor.
    const appFiles = [
      'services/initialData.ts',
      'services/teachersPublic.ts',
      'components/LoginModal.tsx'
    ];
    for (const file of appFiles) {
      const content = readFileSync(join(ROOT, file), 'utf8');
      expect(content, `${file} must not import the PII roster`).not.toContain("from './teachersData'");
      expect(content, `${file} must not import the PII roster`).not.toContain("from '../services/teachersData'");
    }

    const publicRoster = readFileSync(join(ROOT, 'services/teachersPublic.ts'), 'utf8');
    expect(publicRoster).not.toMatch(/\b05\d{8}\b/);
    expect(publicRoster).not.toMatch(/\b\d{10}\b/);
    expect(publicRoster).not.toContain('@');
  });
});
