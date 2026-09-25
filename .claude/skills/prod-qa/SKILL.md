---
name: prod-qa
description: Test the DEPLOYED Zayd Bin Thabit attendance app end to end (icons, labels, links, touch targets, dead buttons, console/network errors, login, and the admin add / edit / transfer / remove / Period-2 reassignment commands) and report only the defects that break or endanger the production workflow. Use when asked to test, QA, audit, smoke-test, or check the live/production/Vercel site (اختبر التطبيق المنشور، فحص الموقع، تدقيق الإنتاج). Report-first; excludes feature ideas and cosmetic polish.
---

# prod-qa — test the deployed app, fix only what matters

Goal: find what stops the school from **recording Period-2 absence and
managing its roster on the live site**, prove each finding with evidence, and
propose (or, if asked, make) the smallest fix. Everything else is excluded.

Read `AGENTS.md` first. Its constraints (Period 2 = 07:45–08:30, no invented
students, sync honesty, 44px targets, lucide icons, secrets never in UI) are
the pass/fail criteria here.

## 0. Ground rules (non-negotiable)

- **Target:** `https://zayd-bin-thabit-attendance.vercel.app` unless the user names another URL.
- **Read-only by default.** The UI crawler never clicks destructive commands.
  Write tests run only through `scripts/admin_api.mjs`, which uses test data exclusively.
- **Test data only:** ids `e2e_*` / `s_e2e_*`, fake phones `05990001xx`,
  national ids `19999999xx`, attendance date `2025-01-02` (before go-live).
  Never edit, move, or delete a real teacher or student; never submit attendance for a real school day.
- **Always clean up** with `scripts/cleanup.sql`, then verify zero `e2e` rows (step 5).
- **No PII in output:** never paste student names, national ids, or phone numbers into
  reports, PRs, or logs. Refer to students/teachers by id.
- **Secrets:** the admin password comes from the user or the project's private notes and is
  passed as the env var `ADMIN_PASS`. Never write it into this repo, a commit, a PR, or a report.
- **Don't claim unrun tests.** Every PASS/FAIL cites the command output it came from.

## 1. Setup (cloud)

The Claude Code container usually cannot reach `vercel.app` / `supabase.co`. Run everything
in a **Vercel Sandbox** (project `prj_wUe6poW68hvALnknYEouqxV1tBrC`), network policy `custom` with
`allowedDomains`: `zayd-bin-thabit-attendance.vercel.app`, `dhpvladkiqajorowrlhj.supabase.co`,
`registry.npmjs.org`, plus the third-party hosts the page loads (currently `cdn.tailwindcss.com`,
`cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`). A finding with severity `ENV`
means a host was not allowed. Add it to the allowlist (`update_session_network_policy`) and rerun.
Don't report it as a site bug. Stop the sandbox when done.

1. Upload `scripts/` into `/vercel/qa/` as one base64 tarball: locally,
   `tar czf qa.tgz -C .claude/skills/prod-qa/scripts . && base64 -w0 qa.tgz`. Then in the sandbox,
   `mkdir -p /vercel/qa && cd /vercel/qa && echo '<b64>' | base64 -d | tar xz`.
2. `bash /vercel/qa/setup.sh`: installs Playwright + headless Chromium with the libs/fonts it needs.
3. Every browser run: `cd /vercel/qa && . ./env.sh && <env vars> node ui_crawl.mjs > out.json`.
   A logged-in crawl takes 1–4 minutes, longer than the MCP call timeout (~60s). Start it with
   `wait: false`, then read the output later with `list_session_commands` / `get_session_command_logs`
   (or `cat out.json`).

`ANON` is the public anon key (not a secret). Vite bakes it into the deployed bundle, so extract it
in the sandbox: `grep -o 'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*' <chunks>`. Keep only the
key whose payload decodes to `"role":"anon"`. Never use a `service_role` key here.

## 2. What to run

| # | Check | How |
|---|---|---|
| A | Site is up, bundle is current | `curl -s -o /dev/null -w '%{http_code}'` on `/` = 200. Grep the JS chunks for `admin-manage`. |
| B | Login screen: icons, labels, links, targets, errors | `ROLE=none node ui_crawl.mjs` |
| C | Admin UI (mobile, then desktop) | `ROLE=admin ADMIN_PASS=… node ui_crawl.mjs` and again with `VIEWPORT=desktop` |
| D | Admin commands: add / edit / phone change / duplicate refusal / add student / Period-2 reassign → new teacher submits → admin sees it / transfer / remove (history kept) / deactivate | `ANON=… ADMIN_PASS=… node admin_api.mjs` (expects `RESULT 30 passed, 0 failed`) |
| E | Teacher UI | Create a test teacher first: admin-manage `teacher.save` `{id:'e2e_qa_t', name:'معلم فحص', phone:'0599000150'}`. Then run `ROLE=teacher TEACHER_PHONE=0599000150 node ui_crawl.mjs`. Deactivate the teacher afterwards. |
| F | Admin UI commands actually call the server (optional, when D passes but users report UI problems) | Drive Playwright by visible Arabic text through: إدارة → إدارة المعلمين والفصول والشعب → add test teacher (fake phone) → confirm the toast is the success toast (not «محفوظ محلياً»). Then in دليل الطلاب: add, transfer, and remove a `s_e2e_` student. Confirm each change with `get-schedule` / `get-student-contacts` (roster). |
| G | Sync honesty | During C/E, a 401/403 from `submit-attendance` / `get-attendance` must show the re-login or «غير مسند» message, never a silent success. |

`ui_crawl.mjs` reports:
- uncaught JS errors and console errors;
- HTTP 4xx/5xx and failed requests;
- controls with no label or icon, icons rendering at 0 size;
- dead or `#` links, broken same-origin links, and the external hosts linked to;
- touch targets under 44px (mobile view).

It tags each item `P0`/`P1`/`P2` (see §3), plus:
- `CHECK`: a non-destructive button whose click changed nothing. Often this is the active tab
  or a filter already applied, so confirm by hand before calling it a dead button.
- `ENV`: the sandbox couldn't reach a host.

`node summarize.mjs out.json` prints P0/P1/CHECK in full and groups P2/ENV by area.
The crawler's severity is a first guess; §3 decides.

## 3. Triage: keep only what matters

Classify every finding. **Only P0 and P1 go into the fix list.**

- **P0 — blocks the workflow or endangers data/security:**
  - login fails for a valid user;
  - Period-2 submit fails or is lost;
  - the admin doesn't see a submission;
  - add / edit / transfer / remove / reassign fails or is only saved locally;
  - uncaught JS error on a main screen;
  - 5xx from a function;
  - PII or a secret visible where it shouldn't be;
  - a wrong-role user can act (teacher token accepted by `admin-manage`).
- **P1 — degrades the workflow:**
  - a core command gives a wrong or misleading message (e.g. local save reported as synced);
  - a dead button or broken link on a core path;
  - an icon missing on a core control;
  - a 4xx that the UI swallows;
  - an unlabeled core control;
  - a touch target < 44px on the teacher's attendance sheet or the Period-2 submit.
- **P2 — excluded (list in one line, don't fix):**
  - cosmetic spacing, colours, wording preferences;
  - small targets on rarely used admin-only desktop screens;
  - console noise with no user impact.
- **Out of scope — never propose:**
  - new features (roadmap items: Noor export, SMS/WhatsApp gateway, NFC, analytics);
  - redesigns, refactors, dependency upgrades not tied to a P0/P1;
  - extra settings.

Core paths are: login (both roles); teacher roster + Period-2 submit; the admin Period-2 monitor and
reminders; admin management of teachers, students, the Period-2 table and homeroom; and exports
under تصدير.

Before reporting any finding, reproduce it once more and name the root cause with a `file:line`
in the repo. "Flaky" is not a root cause.

## 4. Report (to the user, in Arabic)

Start with the verdict in one line (e.g. «الموقع صالح للعمل: 0 حرجة، 2 متوسطة»), then:

1. **Table of checks A–G:** PASS / FAIL, with the evidence (command + key output line).
2. **Fix list (P0/P1 only):** for each item: the symptom, reproduction steps, the root cause at
   `file:line`, the minimal fix, and the risk.
3. **Excluded:** P2 items in one line each, with the reason for excluding them.
4. **Not tested / uncertain:** anything you could not run (e.g. external links not fetched,
   buttons skipped as destructive).
5. **Cleanup proof:** the counts from step 5.

## 5. Cleanup and verification (always)

1. `execute_sql`: `SELECT class_id, day_of_week FROM daily_period_assignments WHERE teacher_id LIKE 'e2e_%';`
   must return 0 rows. If not, restore it with the `RESTORE-INFO` line.
2. `apply_migration` with the contents of `scripts/cleanup.sql`.
3. `execute_sql`: counts of `teachers`/`students`/`device_tokens`/`attendance_submissions` rows with e2e ids = 0.
   Active students and active teachers must be unchanged from before the run: record both counts first.
4. Stop the sandbox.

## 6. Fixing (only when the user asks)

- Fix only P0/P1 items from the report, one minimal change per root cause, on the
  designated branch. Follow `AGENTS.md` §9: `npm run lint && npm test && npm run build`,
  add a regression test when the logic is testable, and document the fix in `ENGINEERING_HISTORY.md`.
- Edge Function changes: deploy, then rerun check D. UI changes: after merge, deploy production
  manually (the Vercel project does not auto-deploy from git), then rerun B/C/E against production.
- Never "fix" by hiding a control, skipping a test, or loosening a server check.
