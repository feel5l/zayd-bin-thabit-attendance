import { describe, it, expect, beforeEach } from 'vitest';
import { setDeviceToken, getDeviceToken, clearDeviceToken, getDeviceTokenMeta } from '../services/deviceAuth';

describe('deviceAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves device token with meta', () => {
    setDeviceToken('abc123token', { teacherId: 'teacher-1', role: 'teacher' });
    expect(getDeviceToken()).toBe('abc123token');
    expect(getDeviceTokenMeta()).toEqual(
      expect.objectContaining({ teacherId: 'teacher-1', role: 'teacher' })
    );
  });

  it('clears token on logout', () => {
    setDeviceToken('tok', { teacherId: 'admin', role: 'admin' });
    clearDeviceToken();
    expect(getDeviceToken()).toBeNull();
    expect(getDeviceTokenMeta()).toBeNull();
  });
});
