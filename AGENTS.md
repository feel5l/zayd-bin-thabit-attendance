# AGENTS.md — Developer & AI Agent Operating Manual

**Project:** Zayd Bin Thabit Elementary Attendance (نظام متابعة ورصد الغياب المبتكر)  
**Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Supabase (Edge Functions)  
**Application ID:** `e18b3982-4516-4e7a-aa23-07b607fd09c1`  
**Label version:** `v2.6.0`  
**Canonical production:** https://zayd-bin-thabit-attendance.vercel.app  

**Read next:** [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md) (why things changed), [`SYNC_DESIGN.md`](./SYNC_DESIGN.md) (sync contract), [`HANDOVER.md`](./HANDOVER.md) (Arabic ops).

---

## 1. Mission

Saudi elementary attendance / discipline tracking focused on **Period 2 / الحصة الثانية (07:45–08:30)** as the official absence recording window, with RBAC for admin and teachers, offline-first LocalStorage, and optional Supabase multi-device sync.

### Roles
- **admin:** Live Period-2 monitoring, reminders, exports, roster/tools, settings.
- **teacher:** Record attendance for assigned class/period; parental WhatsApp helpers.

---

## 2. Non-negotiable constraints

1. **Period 2 bounds are fixed:** `07:45`–`08:30`. Do not change.
2. **Roster:** Official baseline is **364 students** across 11 classes (`officialStudentsData` / grade files). Never invent mock students.
3. **State:** All attendance balances through `AttendanceService`. No parallel local sources of truth.
4. **Touch targets:** Interactive controls ≥ **44px** + `touch-manipulation` on mobile.
5. **Secrets:** Never expose admin passwords, tokens, or raw credential structures in UI.
6. **Sync honesty:** Local save ≠ cloud sync. Surface `needsAuth` / `notAssigned` / network failure.
7. **Dates:** Use Asia/Riyadh “today” helpers for attendance dates and day keys.
8. **QA chrome:** Simulators stay behind `?debug=1` or `localStorage zayd_qa_tools=1` (`services/qaTools.ts`).

---

## 3. Architecture (current)

```text
UI (components/*)
  → AttendanceService (canonical)
  → LocalStorage
  → syncAdapter (optional)
       → teacher-login / admin-login  → deviceToken
       → submit-attendance (push)
       → get-attendance (pull, ~8s poll)
       → applyServerSubmissions (LWW merge)
```

Supabase project ref: `dhpvladkiqajorowrlhj`  
Without `VITE_SUPABASE_*`, sync is a silent no-op and the app remains usable offline.

---

## 4. Critical paths & files

| Area | Files |
|------|--------|
| Attendance core | `services/attendanceService.ts`, `types.ts` |
| Sync | `services/syncAdapter.ts`, `services/deviceAuth.ts`, `services/supabaseClient.ts` |
| Auth | `services/teacherAuth.ts`, `services/adminAuth.ts`, `components/LoginModal.tsx` |
| QA gate | `services/qaTools.ts`, `App.tsx` |
| Admin UI | `components/AdminDashboard.tsx`, `components/Navbar.tsx` |
| Teacher UI | `components/TeacherAttendanceSheet.tsx` |
| Roster | `services/officialStudentsData.ts`, `studentsGrade3..6.ts`, `officialClassesData.ts`, `teachersData.ts` |
| Edge | `supabase/functions/submit-attendance`, `get-attendance`, `teacher-login`, `admin-login`, `get-schedule` |

Layout is **root-level** (no `src/` app tree). Do not create a parallel `src/` app.

---

## 5. Sync contract (agents)

### Login
- Teacher: phone via `teacher-login` → store `deviceToken`.
- Admin: password via `admin-login` → store `deviceToken`.
- If Supabase configured and token missing → force re-login (amber banner). Do not allow device-cache login without token.

### Push (`pushSubmission`)
- Headers: `Authorization` + `apikey` + **`x-device-token`**
- Body: `{ submission, items, clientOpId }` (`items`, not `studentItems`)
- **401** → `needsAuth` (do not enqueue)
- **403** → `notAssigned` (do not enqueue)
- Other failures may enqueue for retry

### Assignment rules (server mirrors client)
Teacher may submit if daily Period assignment matches **OR** homeroom `assigned_class_id` **OR** `classes.homeroom_teacher_id` when no daily row.

### Pull
- Admin/teacher poll `get-attendance?date=YYYY-MM-DD` with device token.
- Merge via `AttendanceService.applyServerSubmissions`.

### Verify sync end-to-end
1. Teacher submit with token for assigned/homeroom class.
2. Admin `get-attendance` includes class + absent student.
3. Admin dashboard count updates without hard refresh (poll ~8s).

---

## 6. Local development

```bash
cp .env.example .env.local
# fill VITE_ADMIN_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

npm install
npm run lint      # tsc --noEmit
npm test          # vitest (expect 24+ passing)
npm run build
npm run dev       # http://localhost:3000
```

QA tools: open `http://localhost:3000/?debug=1`.

---

## 7. Production deploy (Vercel)

```bash
npx vercel link --yes --project zayd-bin-thabit-attendance   # once
npx vercel env ls
npx vercel deploy --prod --yes
```

Required env (Production/Preview/Development):

- `VITE_ADMIN_PASSWORD`
- `VITE_SUPABASE_URL` = `https://dhpvladkiqajorowrlhj.supabase.co`
- `VITE_SUPABASE_ANON_KEY` (anon/publishable only — never service_role in Vite)

**Vite bakes env at build time** — changing env requires a new production deploy.

Historical GitHub Pages (`gh-pages`) may still exist; **do not treat it as canonical** unless explicitly asked.

Supabase function/schema changes:

```bash
npm run supabase:migrate
npm run supabase:deploy-functions
```

---

## 8. UI product rules (post-declutter)

- Admin dashboard primary job: **monitor Period 2 + remind late teachers**.
- Tools live under **تصدير** and **إدارة** menus — do not restore the dense emoji CTA strip / “بوابة الإدارة والتعديل الشامل” hub.
- Keep Navbar light; put deep tools in menus / settings.
- Teacher sheet: roster + submit first; avoid celebratory confetti on submit.

---

## 9. Engineering standards

1. Keep `types.ts` aligned; no `any` on core entities.
2. Prefer `/components` and `/services` over bloating `App.tsx`.
3. Icons: `lucide-react` only.
4. After code changes: `npm run lint`, `npm test`, `npm run build`.
5. Document non-obvious fixes in [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md).

---

## 10. Roadmap (do not confuse with done)

- Noor ministry export
- WhatsApp Business / SMS gateway
- Optional NFC / kiosk
- Absenteeism analytics

---

## 11. Doc index

| Doc | Audience |
|-----|----------|
| [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md) | Agents — bugs, reasons, verify |
| [`AI_AGENT_README.md`](./AI_AGENT_README.md) | Agents — architecture depth |
| [`SYNC_DESIGN.md`](./SYNC_DESIGN.md) | Agents — sync design |
| [`DEPLOYMENT_REPORT.md`](./DEPLOYMENT_REPORT.md) | Ops — deploy truth |
| [`HANDOVER.md`](./HANDOVER.md) | School ops (Arabic) |
| [`USER_MANUAL.md`](./USER_MANUAL.md) | Staff (Arabic) |
| [`README.md`](./README.md) | Entry point |
