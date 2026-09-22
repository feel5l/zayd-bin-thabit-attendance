# Engineering History — Zayd Bin Thabit Attendance

**Audience:** Coding agents and engineers joining the repo.  
**Purpose:** Explain *what* changed, *why*, and *which bugs* were real — so future work does not reintroduce regressions.  
**Repo tip:** Prefer this file + [`AGENTS.md`](./AGENTS.md) over outdated narrative in older plans.

**Production (canonical):** https://zayd-bin-thabit-attendance.vercel.app  
**Supabase project:** `dhpvladkiqajorowrlhj`  
**App version label:** `v2.6.0` (+ sync + UI declutter)

---

## How to use this document

For each entry:

| Field | Meaning |
|-------|---------|
| Symptom | What operators / agents observed |
| Root cause | Why it happened (not the surface bug) |
| Change | What we changed in code / infra |
| Why this design | Constraint or trade-off that must stay |
| Verify | How to prove it still works |

Do **not** invent mock students. Do **not** widen Period 2 beyond **07:45–08:30**. Do **not** fork attendance state outside `AttendanceService`.

---

## Architecture snapshot (current)

```text
Teacher / Admin UI (React 19 + Vite)
        │
        ▼
AttendanceService  ◄── single source of truth (LocalStorage + in-memory)
        │
        ▼
syncAdapter.ts  ──push──►  Edge: submit-attendance  (x-device-token)
        │                   Edge: get-attendance     (poll ~8s)
        │                   Edge: teacher-login / admin-login
        ▼
Supabase Postgres (RLS) + device_tokens
```

Offline-first: without `VITE_SUPABASE_URL` the app still runs locally; cloud sync is a no-op.

---

## Chronological engineering log

### 1) Phase-1 critical UX / lock (PR #5)

- **Symptom:** Attendance could be submitted outside Period 2; session and schedule behavior were inconsistent; simulators cluttered teacher UX.
- **Root cause:** Soft / incomplete enforcement of period window and session rules in the client.
- **Change:** Harden Period 2 lock, session handling, schedule sync hooks; hide simulators from day-to-day teacher chrome (later strengthened again in #18).
- **Why this design:** Ministry workflow treats Period 2 as the official absence window.
- **Verify:** With real clock outside 07:45–08:30, teacher submit is blocked unless QA time sim is enabled.

### 2) Excel timetable import (PR #6)

- **Symptom:** Manual timetable edits did not scale; Period 2 assignments drifted.
- **Root cause:** No structured import path for ministry-style Excel timetables.
- **Change:** `TimetableImportModal` + `timetableImportService` to import and map Period 2 assignments.
- **Why this design:** School already maintains Excel schedules; import beats hand-editing JSON.
- **Verify:** Import a schedule file; Period 2 rows appear in daily assignments.

### 3) Sync design + remediation docs (PR #7, remediation plans)

- **Symptom:** Cross-device sync requirements were unclear for agents.
- **Root cause:** Architecture lived only in chat / ad-hoc notes.
- **Change:** [`SYNC_DESIGN.md`](./SYNC_DESIGN.md), remediation plans.
- **Why this design:** Agents need a durable contract before touching Edge Functions.
- **Verify:** Read SYNC_DESIGN before changing `syncAdapter.ts`.

### 4) Security: remove exposed credentials (PR #8 / `65f24e7` and follow-ups)

- **Symptom:** Passwords / identifiers appeared in UI or client payloads.
- **Root cause:** Client-side “convenience” auth leaked secrets.
- **Change:** Stop displaying admin passwords; strengthen phone matching; move sensitive matching server-side over time (`teacher-login` hashes).
- **Why this design:** School PII and admin secrets must never ship in placeholders or error text.
- **Verify:** Login UI shows no password hints; `tests/security.test.ts` passes.

### 5) Schedule teacher-id resolution + server schedule sync (`95c7fbc` and follow-ups)

- **Symptom:** Wrong teacher assigned to Period 2; schedule edits on admin device not seen by teachers.
- **Root cause:** Unstable / mismatched teacher IDs between timetable rows and user records; schedule lived only in LocalStorage.
- **Change:** Resolve teacher IDs to canonical accounts (`AttendanceService.resolveTeacherLoginId`); pull schedule from Supabase (`get-schedule`).
- **Why this design:** Homeroom + daily assignment must agree with Edge authorization rules.
- **Verify:** `tests/teacherIdResolution.test.ts`, `tests/timetableData.test.ts`.

### 6) Privacy: stop shipping teacher phones / national IDs in the browser bundle

- **Symptom:** Full faculty PII downloadable from the SPA JS.
- **Root cause:** Client matched phone numbers against an embedded roster.
- **Change:** `teacher-login` Edge Function hashes/compares server-side; client stores only public profile + device trust cache.
- **Why this design:** PII minimization for a public SPA.
- **Verify:** Bundle must not contain raw teacher phone lists used for auth matching.

### 7) Homeroom backfill for old LocalStorage caches

- **Symptom:** Older devices missing `homeroom_teacher_id` / assigned class broke assignment checks.
- **Root cause:** Cached class records predated homeroom fields.
- **Change:** Backfill missing homeroom locally without overriding admin reassignments.
- **Why this design:** Safe migration beats forcing every tablet to wipe storage.
- **Verify:** Devices with old cache still allow assigned teachers to submit.

### 8) Full Supabase sync infrastructure (PR #12)

- **Symptom:** No durable multi-device attendance pipeline.
- **Root cause:** LocalStorage-only state.
- **Change:** Schema + RLS seed; Edge Functions; `syncAdapter.ts` (push, pull, offline queue, realtime hooks); storage keys v3→v4 migration.
- **Why this design:** Dual-mode: works offline, syncs when configured.
- **Verify:** With env set, `teacher-login` returns `deviceToken`; without env, app still boots.

### 9) Cross-tab admin updates (PR #14)

- **Symptom:** Teacher submits in one tab; admin tab on same browser stays stale until reload.
- **Root cause:** Missing / incomplete `storage` + custom event propagation for submissions.
- **Change:** Cross-tab listeners (`ATTENDANCE_UPDATE_EVENT`, storage handlers) so admin KPIs refresh quickly.
- **Why this design:** Same-browser ops should feel instant even before cloud poll.
- **Verify:** `tests/crossTabSync.test.ts`.

### 10) Deploy / CI / handover docs (PR #15–#16)

- **Symptom:** Agents and school ops lacked a single deploy story.
- **Root cause:** Secrets and Pages workflow drifted.
- **Change:** `npm ci` in deploy workflows; HANDOVER + DEPLOYMENT_REPORT (later superseded for primary host — see Vercel below).
- **Why this design:** Reproducible builds.
- **Verify:** CI install uses lockfile.

### 11) Pull path: admin cannot see remote absences (`e3e5f05` and follow-ups)

- **Symptom:** Teacher data existed somehow, but admin dashboard never showed other devices’ sheets.
- **Root cause:** Push alone is insufficient; no reliable `get-attendance` pull + `applyServerSubmissions` merge.
- **Change:** `get-attendance` Edge Function; client poll (~8s); LWW merge in `AttendanceService.applyServerSubmissions`.
- **Why this design:** Admin must converge without manual refresh.
- **Verify:** `tests/applyServerSubmissions.test.ts`; live admin pull returns submissions.

### 12) Silent push failure — absences never reach admin (PR #17 / #67d9da3)

- **Symptom:** Teacher UI showed success; admin never updated across devices.
- **Root causes (compound):**
  1. Sessions without `deviceToken` still “succeeded” locally.
  2. Device-cache teacher login skipped token when Supabase was configured.
  3. Edge required `x-device-token`; client often omitted it.
  4. Payload field mismatch (`studentItems` vs `items`).
  5. `403 not_assigned_to_class` was enqueued forever instead of surfacing.
  6. Homeroom / assignment fallback incomplete on server.
  7. Date boundaries without Asia/Riyadh caused wrong day keys.
- **Change:**
  - `services/deviceAuth.ts` + persist tokens on teacher/admin login.
  - Refuse token-less device-cache login when Supabase configured; amber re-auth banner in `App.tsx`.
  - `pushSubmission` sends `items` + `x-device-token`; returns `needsAuth` / `notAssigned`; no enqueue on 401/403.
  - Teacher UI distinguishes sync OK vs warning.
  - `submit-attendance` homeroom / `homeroom_teacher_id` fallback; FK-safe upsert.
  - Riyadh date helper for “today”.
- **Why this design:** Local save must never be mistaken for cloud sync; permanent auth failures must not poison the offline queue.
- **Verify:** `tests/pushSubmission.test.ts`, `tests/deviceAuth.test.ts`, `tests/riyadhDate.test.ts`; live: submit → admin `get-attendance` sees absent student; production UI shows class counted (e.g. `1 / 11`).

### 13) UI declutter + QA gate (PR #18)

- **Symptom:** Admin dashboard and chrome were dense (simulators, emoji CTA strips, duplicate portals) — high cognitive load during Period 2 ops.
- **Root cause:** Tools and QA chrome shared the same visual weight as live monitoring.
- **Change:**
  - `services/qaTools.ts` — enable with `?debug=1` or `localStorage zayd_qa_tools=1`.
  - Hide `TimeSimulatorBar`, live teacher simulator, notification “simulate” unless QA.
  - Admin header: date + remind teachers + **تصدير** / **إدارة** menus; remove duplicate admin hub strip.
  - Slimmer Navbar utility bar; simpler LoginModal; compact teacher tallies; remove submit confetti.
- **Why this design:** Production UX = monitor + act; QA tools remain available without shipping noise.
- **Verify:** Production bundle must not contain “بوابة الإدارة والتعديل الشامل” / “فتح محاكي رصد المعلمين”; `?debug=1` shows time simulator.

### 14) Primary production host = Vercel (ops, Sep 2026)

- **Symptom:** GitHub Pages docs were treated as canonical while Vercel became the live sync host with env vars.
- **Root cause:** Dual hosting without a single source of truth in docs.
- **Change:** Deploy `main` to Vercel with `VITE_ADMIN_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; verify bundle + E2E sync on https://zayd-bin-thabit-attendance.vercel.app
- **Why this design:** Vite env is build-time — env changes require redeploy. Vercel holds production env.
- **Verify:** Production deploy of `main` @ `fa45302` (example deployment `dpl_3LGGTxjpHExrRjdKbW2BWp7TdfiG`); bundle contains `dhpvladkiqajorowrlhj.supabase.co` and no `service_role`; after teacher submit, admin UI shows class ratio (e.g. `1 / 11`) without hard refresh (poll ≤ ~8s).

### 15) Ignore Vercel / env artifacts (PR #19)

- **Symptom:** `vercel link` / `env pull` created `.vercel/` and `.env` locally — risk of secret commit.
- **Root cause:** `.gitignore` did not cover those paths.
- **Change:** Ignore `.vercel`, `.env`, `.env.*` (keep `.env.example`).
- **Why this design:** Secrets never enter git history.
- **Verify:** `git check-ignore .env .vercel`.

### 16) Professional agent/ops documentation (PR #20)

- **Symptom:** HANDOVER/DEPLOYMENT still pointed agents at GitHub Pages; AI_AGENT_README framed Firebase as the cloud layer; no single engineering history of bugs and reasons.
- **Root cause:** Docs lagged the Supabase + Vercel + declutter reality.
- **Change:** Add [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md); rewrite [`AGENTS.md`](./AGENTS.md) / [`AI_AGENT_README.md`](./AI_AGENT_README.md) (English for agents); refresh Arabic [`HANDOVER.md`](./HANDOVER.md) / [`DEPLOYMENT_REPORT.md`](./DEPLOYMENT_REPORT.md); index links in [`README.md`](./README.md).
- **Why this design:** A new agent should start at AGENTS → ENGINEERING_HISTORY → lint/test without rediscovering silent-push bugs.
- **Verify:** Doc links resolve; production URL is Vercel; Firebase is documented as non-primary only.

---

## Critical files map

| Path | Role |
|------|------|
| `services/attendanceService.ts` | Canonical attendance state, validation, applyServerSubmissions |
| `services/syncAdapter.ts` | push/pull/queue/poll |
| `services/deviceAuth.ts` | device token storage |
| `services/teacherAuth.ts` / `adminAuth.ts` | login + token persistence |
| `services/qaTools.ts` | QA chrome gate |
| `services/officialStudentsData.ts` (+ grade files) | Official roster — do not replace with mocks |
| `supabase/functions/submit-attendance/` | Authorized push |
| `supabase/functions/get-attendance/` | Authorized pull |
| `supabase/functions/teacher-login/` / `admin-login/` | Issue tokens |
| `components/AdminDashboard.tsx` | Live ops UI |
| `components/TeacherAttendanceSheet.tsx` | Recording UI |
| `App.tsx` | Shell, QA gate wiring, re-auth banner |

---

## Regression checklist (agents)

Before claiming “sync works”:

1. `npm run lint && npm test && npm run build`
2. Teacher login returns `deviceToken` when Supabase env is set
3. Submit returns sync success (not “local only” / needsAuth / notAssigned)
4. Admin `get-attendance` includes the class/absent student
5. Admin dashboard updates without manual reload (cross-tab and/or poll)

Before claiming “UI declutter shipped”:

1. Without `?debug=1`, no Period-2 time simulator bar for admin
2. Export/Manage menus exist; old hub strip gone

---

## Related documents

- [`AGENTS.md`](./AGENTS.md) — day-to-day agent operating rules
- [`AI_AGENT_README.md`](./AI_AGENT_README.md) — architecture blueprint
- [`SYNC_DESIGN.md`](./SYNC_DESIGN.md) — sync contract depth
- [`HANDOVER.md`](./HANDOVER.md) — Arabic ops handover
- [`DEPLOYMENT_REPORT.md`](./DEPLOYMENT_REPORT.md) — deploy truth
- [`USER_MANUAL.md`](./USER_MANUAL.md) — school staff manual (Arabic)
