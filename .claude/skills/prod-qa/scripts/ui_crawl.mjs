// UI crawl of the deployed app: icons, labels, links, touch targets, dead
// buttons, console/network errors. Read-only: destructive commands are never
// clicked (see DESTRUCTIVE). Runs in a Vercel Sandbox (see SKILL.md §Setup).
//
// env:
//   BASE          default https://zayd-bin-thabit-attendance.vercel.app
//   ROLE          admin | teacher | none   (default admin)
//   ADMIN_PASS    admin password (never printed)
//   TEACHER_PHONE a TEST teacher phone (05990001xx), never a real teacher
//   VIEWPORT      mobile | desktop         (default mobile)
//   MAX_CLICKS    default 80
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';

const BASE = process.env.BASE || 'https://zayd-bin-thabit-attendance.vercel.app';
const ROLE = process.env.ROLE || 'admin';
const MOBILE = (process.env.VIEWPORT || 'mobile') === 'mobile';
const MAX_CLICKS = Number(process.env.MAX_CLICKS || 80);

// Anything that writes, sends, deletes or ends the session is never clicked.
const DESTRUCTIVE = /حذف|إزالة|ازالة|إيقاف|ايقاف|مسح|تصفير|استبدال|إرسال|ارسال|اعتماد|حفظ|نشر|رفع|استيراد|أرشف|ارشف|خروج|تبديل الحساب|تسجيل الدخول|دخول|نقل|تعيين|تأكيد|delete|remove|reset|logout|submit|save|publish|import|confirm/i;

const issues = [];
const add = (severity, area, what, where = '') => issues.push({ severity, area, what, where: String(where).slice(0, 80) });
const short = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 40);

const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
const ctx = await browser.newContext(MOBILE
  ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar-SA' }
  : { viewport: { width: 1366, height: 900 }, locale: 'ar-SA' });
const page = await ctx.newPage();

page.on('pageerror', (e) => add('P0', 'js', `uncaught: ${short(e.message)}`, page.url()));
// A host the sandbox can't resolve is an environment limit, not a site bug:
// report it as ENV so the agent widens the sandbox allowlist and reruns.
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  add(/ERR_NAME_NOT_RESOLVED|ERR_BLOCKED/.test(t) ? 'ENV' : 'P1', 'console', short(t), page.url());
});
page.on('response', (r) => {
  const u = new URL(r.url());
  if (r.status() >= 400) add(r.status() >= 500 ? 'P0' : 'P1', 'network', `${r.request().method()} ${u.pathname} -> ${r.status()}`, u.host);
});
page.on('requestfailed', (r) => {
  const u = new URL(r.url());
  const err = r.failure()?.errorText || '';
  if (/ERR_ABORTED/.test(err)) return; // navigation/cancelled fetches
  add(/ERR_NAME_NOT_RESOLVED|ERR_BLOCKED|ERR_CONNECTION_REFUSED/.test(err) ? 'ENV' : 'P1', 'network', `failed ${u.pathname}: ${err}`, u.host);
});

const settle = () => page.waitForTimeout(600);

async function login() {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (ROLE === 'none') return;
  if (ROLE === 'admin') {
    await page.getByText('إدارة المدرسة').first().click();
    await page.getByPlaceholder('admin').fill('admin');
    await page.locator('input[type="password"]').fill(process.env.ADMIN_PASS || '');
    await page.getByText('دخول لوحة التحكم المركزية').click();
  } else {
    await page.getByText('معلم / مربي فصل').first().click();
    await page.locator('input[type="tel"]').fill(process.env.TEACHER_PHONE || '');
    await page.getByText('تسجيل الدخول').last().click();
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  // The login modal's own submit buttons are the reliable signal (dashboards have tel inputs too).
  const stillLogin = await page.getByText(/دخول لوحة التحكم المركزية|جاري التحقق والدخول/).first().isVisible().catch(() => false);
  if (stillLogin) {
    const msg = await page.locator('[role="alert"], .text-rose-600, .text-red-600').first().innerText().catch(() => '');
    add('P0', 'auth', `login as ${ROLE} did not leave the login form ${short(msg)}`);
  }
}

// Snapshot of visible interactive elements (outside table rows = per-student data).
const snapshot = () => page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  return [...document.querySelectorAll('button, a, [role="button"]')].filter(vis).map((el, i) => {
    const r = el.getBoundingClientRect();
    const svg = el.querySelector('svg');
    const sr = svg ? svg.getBoundingClientRect() : null;
    return {
      i, tag: el.tagName.toLowerCase(),
      name: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim(),
      w: Math.round(r.width), h: Math.round(r.height),
      hasSvg: !!svg, svgOk: sr ? sr.width > 0 && sr.height > 0 : null,
      href: el.getAttribute('href'), inRow: !!el.closest('tr, [data-row]'), disabled: el.disabled === true,
    };
  });
});

async function audit(label) {
  const els = await snapshot();
  for (const e of els) {
    const where = `${label} | ${short(e.name) || e.tag}`;
    if (!e.name && !e.hasSvg) add('P1', 'a11y', 'control with no label and no icon', where);
    if (!e.name && e.hasSvg) add('P2', 'a11y', 'icon-only control without aria-label/title', where);
    if (e.hasSvg && e.svgOk === false) add('P1', 'icon', 'icon renders at 0 size', where);
    if (MOBILE && !e.inRow && (e.w < 44 || e.h < 44)) add('P2', 'touch', `target ${e.w}x${e.h} < 44px`, where);
    if (e.tag === 'a') {
      if (!e.href || e.href === '#' || e.href.startsWith('javascript:')) add('P1', 'link', `dead href "${e.href ?? ''}"`, where);
      else links.add(e.href);
    }
  }
  return els;
}

const links = new Set();
const dead = [];
await login();
await settle();
const base = await audit(`home(${ROLE})`);

let clicks = 0;
for (const e of base) {
  if (clicks >= MAX_CLICKS) break;
  if (e.tag === 'a' || e.inRow || e.disabled || !e.name || DESTRUCTIVE.test(e.name)) continue;
  clicks++;
  const before = await page.evaluate(() => ({ len: document.body.innerText.length, dlg: document.querySelectorAll('[role="dialog"], .fixed.inset-0').length, url: location.href }));
  try {
    await page.getByRole('button', { name: e.name, exact: true }).first().click({ timeout: 3000 });
  } catch {
    continue; // element moved/hidden after a previous click; not a finding by itself
  }
  await settle();
  const after = await page.evaluate(() => ({ len: document.body.innerText.length, dlg: document.querySelectorAll('[role="dialog"], .fixed.inset-0').length, url: location.href }));
  const changed = after.len !== before.len || after.dlg !== before.dlg || after.url !== before.url;
  if (!changed) dead.push(short(e.name));
  else await audit(`after "${short(e.name)}"`);
  // close whatever opened
  await page.keyboard.press('Escape');
  const closeBtn = page.locator('[aria-label*="إغلاق"], [title*="إغلاق"], button:has-text("إغلاق")').first();
  if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
  await settle();
}
// Not a verdict: idempotent buttons (the active tab, a filter already applied)
// also show no change. The agent must confirm each CHECK by hand before reporting.
for (const d of dead) add('CHECK', 'command', 'click produced no visible change — confirm by hand (may be the active tab/filter)', d);

// Same-origin links must resolve; external ones are listed, not fetched.
const external = [];
for (const href of links) {
  const u = new URL(href, BASE);
  if (u.origin === new URL(BASE).origin) {
    const r = await page.request.get(u.href).catch(() => null);
    if (!r || r.status() >= 400) add('P1', 'link', `broken ${u.pathname} -> ${r?.status() ?? 'error'}`);
  } else external.push(`${u.protocol}//${u.host}`);
}

await browser.close();

// De-duplicate and print. No PII: labels are truncated UI strings; table rows are skipped.
const seen = new Set();
const out = issues.filter((x) => { const k = `${x.severity}|${x.area}|${x.what}|${x.where}`; if (seen.has(k)) return false; seen.add(k); return true; });
const order = { P0: 0, P1: 1, CHECK: 2, P2: 3, ENV: 4 };
out.sort((a, b) => order[a.severity] - order[b.severity]);
console.log(JSON.stringify({ base: BASE, role: ROLE, viewport: MOBILE ? 'mobile' : 'desktop', clicked: clicks, externalHosts: [...new Set(external)], issues: out }, null, 2));
const n = (sev) => out.filter((x) => x.severity === sev).length;
console.log(`\nSUMMARY P0=${n('P0')} P1=${n('P1')} CHECK=${n('CHECK')} P2=${n('P2')} ENV=${n('ENV')}`);
