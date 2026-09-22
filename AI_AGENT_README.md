# AI_AGENT_README.md — Architecture Blueprint for Coding Agents

**System:** Zayd Bin Thabit Elementary Attendance & Discipline Platform  
**Role:** Principal engineering reference for autonomous agents  
**Label:** `v2.6.0`  
**App ID:** `e18b3982-4516-4e7a-aa23-07b607fd09c1`  
**Production:** https://zayd-bin-thabit-attendance.vercel.app  

Companion docs: [`AGENTS.md`](./AGENTS.md) (ops rules), [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md) (change/bug log), [`SYNC_DESIGN.md`](./SYNC_DESIGN.md).

---

## 1. High-level design

Offline-first SPA with optional Supabase cloud sync.

```text
┌──────────────────────── Presentation (React 19) ────────────────────────┐
│ AdminDashboard │ TeacherAttendanceSheet │ Navbar │ Modals (export/manage) │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────┐
│ AttendanceService (singleton) — canonical attendance + period validation │
│ ContactsService / GoogleContactsService                                  │
│ syncAdapter + deviceAuth + teacherAuth/adminAuth                         │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────┐
│ LocalStorage (v4 keys)  ◄──►  In-memory cache                            │
│ Optional: Supabase Edge Functions + Postgres (RLS)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Not primary:** Firebase remains in the repo for legacy/optional paths; **do not** treat Firestore as the attendance sync source of truth. Live multi-device attendance sync is Supabase.

---

## 2. Stack (verified)

| Layer | Tech | Notes |
|-------|------|--------|
| Language | TypeScript ~5.8 | Strict; no `any` on core entities |
| UI | React 19 | Root layout (no `src/` app tree) |
| Build | Vite 6 | Dev port 3000, `host: 0.0.0.0` |
| Style | Tailwind v4 | Utility-first |
| Icons | lucide-react | Exclusive |
| Charts | recharts | Admin KPIs |
| PDF | jspdf + html2canvas | Official A4 |
| Sheets | xlsx | Import/export |
| Backend | Supabase JS + Edge Functions | Sync + auth |
| Tests | vitest + happy-dom | `npm test` |

---

## 3. Directory taxonomy

```text
App.tsx, index.tsx, types.ts, vite.config.ts
components/     # UI only
services/       # Business logic + static official data + sync/auth
supabase/       # Migrations + Edge Functions
tests/          # Vitest suites (sync, security, roster, timetable)
*.md            # Agent + ops documentation
```

Official data must come from `services/officialStudentsData.ts` and grade/class/teacher modules — never random mock rosters.

---

## 4. Domain rules

### Period validation
- Period 2 is the **official** absence window: **07:45–08:30**.
- Teacher must be assigned for that day (timetable) and/or homeroom rules (client + Edge aligned).
- Default student status: `present`. Exceptions: `absent` | `late` | `excused`.

### Events (cross-component / cross-tab)
- `ATTENDANCE_UPDATE_EVENT`, `NOTIFICATION_EVENT`, `SCHEDULE_CHANGE_EVENT`, `SYNC_STATUS_EVENT`
- Admin UI should refresh from these + cloud poll without requiring F5.

### QA tools
- `services/qaTools.ts`: `?debug=1` or `localStorage.zayd_qa_tools=1`
- Gates `TimeSimulatorBar`, teacher live simulator, notification simulate buttons.

### Admin chrome (post-declutter)
- Primary job: **monitor Period 2 + remind late teachers**.
- Secondary tools live under **تصدير** (PDF / Sheets / print) and **إدارة** (roster, teachers, contacts, settings) menus — not a dense emoji CTA strip.
- Do **not** treat submit confetti / celebratory animations as required product behavior (removed from the default teacher submit path).

---

## 5. Sync pipeline (must understand before editing)

1. Login issues **`deviceToken`** (`teacher-login` / `admin-login`).
2. Teacher submit → `AttendanceService.saveAttendanceSubmission` → `pushSubmission`.
3. Push requires `x-device-token` and body field **`items`**.
4. Admin poll → `get-attendance` → `applyServerSubmissions` (LWW).
5. UI must show sync warnings when `needsAuth` / `notAssigned` / network fail.

Full postmortem of silent push bugs: [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md) §12.

---

## 6. Environment

```bash
# .env.local (never commit)
VITE_ADMIN_PASSWORD=
VITE_SUPABASE_URL=https://dhpvladkiqajorowrlhj.supabase.co
VITE_SUPABASE_ANON_KEY=
# optional
VITE_BASE_PATH=/
```

Vite embeds `VITE_*` at **build** time. Production env lives on Vercel; redeploy after env changes.

---

## 7. Agent change protocol

1. Confirm request does not violate Period 2 / roster / AttendanceService rules (see `.cursorrules` + AGENTS.md).
2. Implement in `/services` (logic) or `/components` (UI).
3. Add/adjust tests when touching sync/auth/merge.
4. Run `npm run lint && npm test && npm run build`.
5. If behavior is non-obvious, append a short entry to ENGINEERING_HISTORY.md.

---

## 8. What “done” means for common tasks

| Task | Done when |
|------|-----------|
| Sync fix | Unit tests + live submit/pull + admin UI reflection |
| UI declutter | Production UX focused on monitor + Export/Manage menus; QA only with `?debug=1` |
| Deploy | Vercel production Ready; bundle has Supabase URL; no service_role |

---

## 9. Explicit non-goals for casual PRs

- Do not widen Period 2.
- Do not re-introduce password placeholders in Login UI.
- Do not enqueue 401/403 push failures.
- Do not restore the dense admin emoji CTA strip as default chrome.
- Do not create a second attendance store beside `AttendanceService`.
