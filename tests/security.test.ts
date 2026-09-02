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

  it('uses exact phone matching without endsWith in LoginModal', () => {
    const content = readFileSync(join(ROOT, 'components/LoginModal.tsx'), 'utf8');
    expect(content).not.toContain('.endsWith(');
    expect(content).toContain('uPhoneDigits === cleanDigits');
  });
});
