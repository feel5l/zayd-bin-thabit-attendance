/**
 * QA / test-tools gate for admin simulators and debug chrome.
 * Enable with ?debug=1 or localStorage key zayd_qa_tools=1.
 * Disabled by default so daily school use stays focused.
 */

const STORAGE_KEY = 'zayd_qa_tools';

export function isQaToolsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1' || params.get('qa') === '1') {
      return true;
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setQaToolsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}
