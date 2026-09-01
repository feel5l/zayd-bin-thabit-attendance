# 🤖 AI_AGENT_README.md — Autonomous Agent Architecture & Operational Blueprint
**Target System:** Zayd Bin Thabit Elementary Attendance & Student Discipline Tracking Platform  
**System Role:** Principal Software Engineer Reference Manual for Autonomous Coding Agents  
**Production Release:** `v2.6.0`  
**Application ID:** `e18b3982-4516-4e7a-aa23-07b607fd09c1`  
**Locale / Target Domain:** Saudi Arabian Elementary Education System (Ministry of Education Rules)

---

## 1. System Architecture & High-Level Design

The application is built on an **Offline-First, Event-Driven Client-Side Single Page Application (SPA)** architecture with dual-layer cloud persistence capability.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER (React 19)                     │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌───────────────┐  │
│  │   AdminDashboard.tsx    │  │TeacherAttendanceSheet │  │  Modals / QA  │  │
│  │  (Real-Time Analytics)  │  │ (1-Touch Attendance)  │  │ (Tools & Export│ │
│  └────────────┬────────────┘  └───────────┬───────────┘  └───────┬───────┘  │
└───────────────┼───────────────────────────┼──────────────────────┼──────────┘
                │                           │                      │
┌───────────────▼───────────────────────────▼──────────────────────▼──────────┐
│                      SERVICE & BUSINESS LOGIC LAYER                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        AttendanceService (Singleton)                  │  │
│  │  - Period Validation Engine (07:45 - 08:30 Period 2 Enforcement)      │  │
│  │  - Assigned Teacher Resolution (getClassAssignedTeacherForDay)        │  │
│  │  - Daily Aggregates & KPI Computation (<3ms In-Memory Compute)        │  │
│  │  - Audit Logging & Seha Medical Excuse Reconciliation                 │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │    ContactsService (Local Phonebook) & GoogleContactsService (OAuth2) │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            DATA PERSISTENCE LAYER                           │
│  ┌──────────────────────────────┐          ┌─────────────────────────────┐  │
│  │  In-Memory Reactive Cache    │ ◄──────► │ LocalStorage Key-Value Store│  │
│  │  (Instant UI state updates)  │          │ (Resilient browser offline) │  │
│  └──────────────┬───────────────┘          └──────────────┬──────────────┘  │
│                 │                                         │                 │
│                 ▼                                         ▼                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               Optional Cloud Layer (Firebase Firestore)               │  │
│  │               - collection('attendance_submissions')                  │  │
│  │               - collection('audit_logs')                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Highlights:
1. **Zero-Latency In-Memory Aggregations:** Attendance statistics (present, absent, late, excused, percentage) are computed synchronously on state mutations without database roundtrips.
2. **Deterministic Schedule Validation:** Periods and timetable assignments are evaluated deterministically using standard ISO time ranges (`HH:mm`) and localized day keys (`sunday` through `thursday`).
3. **Event-Driven Inter-Component Communication:** Uses native window custom events (`attendanceUpdated`, `storage`) to trigger instant re-renders in `< 3 seconds` across tabs and split views.

---

## 2. Tech Stack & Verified Versions

| Category | Technology / Library | Version | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `~5.8.2` | Strict type safety, no implicit `any`, exhaustive interfaces. |
| **Core Framework** | React | `^19.2.3` | Functional components, hooks (`useCallback`, `useMemo`, `useEffect`). |
| **DOM Renderer** | React DOM | `^19.2.3` | React 19 concurrent client rendering. |
| **Build Engine** | Vite | `^6.2.0` | Fast dev server, ESM bundling, production optimization. |
| **Styling Framework** | Tailwind CSS (v4) | `@import "tailwindcss"` | Pure utility classes, responsive grid, zero inline styles. |
| **Icons Library** | Lucide React | `^1.33.0` | Exclusive vector icon provider (all icons MUST come from here). |
| **Data Visualization**| Recharts | `^3.6.0` | Attendance trends, class comparison charts, KPIs. |
| **PDF Generation** | jsPDF + html2canvas | `^4.2.1` / `^1.4.1` | Vector-accurate official A4 attendance sheet rendering. |
| **Spreadsheet Engine**| xlsx (SheetJS) | `^0.18.5` | Excel (.xlsx) / CSV roster import and export engine. |
| **Cloud Backend** | Firebase (Firestore) | `^12.18.0` | Dual-mode persistent remote document storage. |
| **AI Integration** | @google/genai | `^1.34.0` | Official Google GenAI SDK for server-side operations. |
| **Micro-FX** | canvas-confetti | `^1.9.4` | Submission confirmation celebration effects. |

---

## 3. Directory Structure & File Taxonomy

```text
├── components/                            # Presentation & Modal UI Components
│   ├── AdminDashboard.tsx                 # [CRITICAL] Admin command center, KPI widgets, class grid
│   ├── TeacherAttendanceSheet.tsx         # [CRITICAL] Mobile-first 1-touch attendance recording interface
│   ├── LoginModal.tsx                     # [CRITICAL] RBAC login interface with secret shielding
│   ├── StudentDirectory.tsx               # Student database, individual profile drawer, history
│   ├── ExcuseManager.tsx                  # Medical excuse processing, Seha integration, approvals
│   ├── NotificationCenterModal.tsx        # WhatsApp instant message templating & broadcast engine
│   ├── PrintableDailyReport.tsx           # Formal Ministry-compliant A4 print view
│   ├── PdfReportsExportModal.tsx          # Export modal for PDF reports
│   ├── GoogleSheetsExportModal.tsx        # Cloud spreadsheet export modal
│   ├── ContactsManager.tsx                # Phonebook directory, multi-tier search, vCard export
│   ├── ContactsManagerModal.tsx           # Modal wrapper for ContactsManager
│   ├── TeacherAndClassManagerModal.tsx    # Faculty management & class assignment editor
│   ├── StudentImportModal.tsx             # Excel/CSV parser and roster bulk importer
│   ├── SchoolSettingsModal.tsx            # School terms, period timings, and system customization
│   ├── TimeSimulatorBar.tsx               # Developer/QA time simulation bar for Period 2 testing
│   ├── ToastNotificationContainer.tsx    # Global interactive toast feedback
│   └── Navbar.tsx                         # Header navigation, time ticker, role switcher
│
├── services/                              # Business Logic, Data Storage & Static Baselines
│   ├── attendanceService.ts               # [CORE ENGINE] Central singleton for all attendance logic
│   ├── contactsService.ts                 # Phonebook storage, search, filter, and vCard export
│   ├── googleContactsService.ts           # Google People API OAuth2 client integration
│   ├── officialStudentsData.ts            # [SOURCE OF TRUTH] 364 real enrolled students
│   ├── studentsGrade3.ts                  # Grade 3 roster (3 sections: ثالث 1, ثالث 2, ثالث 3)
│   ├── studentsGrade4.ts                  # Grade 4 roster (3 sections: رابع 1, رابع 2, رابع 3)
│   ├── studentsGrade5.ts                  # Grade 5 roster (3 sections: خامس 1, خامس 2, خامس 3)
│   ├── studentsGrade6.ts                  # Grade 6 roster (2 sections: سادس 1, سادس 2)
│   ├── officialClassesData.ts             # 11 School Classes, room mappings, assigned teachers
│   ├── teachersData.ts                    # 20+ Official faculty and staff records
│   └── initialData.ts                     # Seed system settings, period schedules, templates
│
├── types.ts                               # [MASTER SCHEMA] Master TypeScript interfaces & enums
├── App.tsx                                # Root React component & view router
├── main.tsx                               # Application entrypoint
├── index.html                             # HTML host & metadata tags
├── metadata.json                          # Platform permissions & app capabilities
├── USER_MANUAL.md                         # Arabic end-user manual for school staff
├── AGENTS.md                              # AI agent reference manual
├── README.md                              # Public documentation
└── AI_AGENT_README.md                     # This file (Technical Agent Blueprint)
```

---

## 4. State Management & Data Flow

### 4.1 Single Source of Truth
The canonical source of truth for the entire application is the **`AttendanceService` singleton** (`/services/attendanceService.ts`).

```
                               ┌──────────────────────────┐
                               │   AttendanceService.ts   │
                               │ (Canonical State Engine) │
                               └────────────┬─────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
               ▼                            ▼                            ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │  Classes State  │          │ Students State  │          │Submissions State│
      │  (11 Sections)  │          │  (364 Records)  │          │  (Daily Logs)   │
      └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │
                                            ▼
                                ┌──────────────────────┐
                                │ App.tsx State Router │
                                └───────────┬──────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
          ┌───────────────────────┐                   ┌───────────────────────┐
          │  AdminDashboard View  │                   │ TeacherAttendance View│
          │  (Reads all classes)  │                   │(Reads assigned class) │
          └───────────────────────┘                   └───────────────────────┘
```

### 4.2 Local Storage Keys
| Storage Key | Type | Description |
| :--- | :--- | :--- |
| `attendance_submissions` | `ClassAttendanceSubmission[]` | Historical and daily submitted attendance sheets. |
| `attendance_drafts` | `Record<string, ClassAttendanceSubmission>` | Unsubmitted auto-saved in-progress drafts. |
| `attendance_excuses` | `StudentExcuse[]` | Medical excuses, Seha platform notes, parent notes. |
| `attendance_audit_logs` | `AuditLogEntry[]` | Tamper-evident history of all actions with timestamps. |
| `school_settings` | `SchoolSettings` | Term configurations, period timings, and alert templates. |
| `school_teachers` | `Teacher[]` | Updated list of teachers, credentials, and phones. |
| `school_classes` | `SchoolClass[]` | Class metadata, room numbers, and assigned homeroom teachers. |
| `school_students` | `Student[]` | Full 364-student roster with dynamic updates. |
| `active_user_session` | `User` | Current logged-in user (Admin vs. Teacher). |

---

## 5. Execution, Verification & Testing Commands

All autonomous agents MUST use these exact standard commands for verification:

```bash
# 1. Type & Interface Integrity Validation (Linter)
# Must return 0 errors / clean exit before completing any task
npm run lint

# 2. Production Bundle Compilation (Build)
# Compiles Vite production bundle into /dist
npm run build

# 3. Local Development Server
# Dev server runs on host 0.0.0.0, port 3000
npm run dev
```

### 5.1 Automated Self-Sanity Test Pattern
When verifying schedule rules or period locks, always run synthetic assertions against `attendanceService.validatePeriodAttendance`:
- `07:44 AM` -> Must evaluate `isAllowed: false`, `status: 'outside_schedule'`.
- `07:45 AM` -> Must evaluate `isAllowed: true`, `status: 'allowed'` (Period 2 active).
- `08:00 AM (Unassigned Teacher)` -> Must evaluate `isAllowed: false`, `status: 'unassigned_teacher'`.
- `08:30 AM` -> Must evaluate `isAllowed: true`, `status: 'allowed'`.
- `08:31 AM` -> Must evaluate `isAllowed: false`, `status: 'outside_schedule'`.

---

## 6. Strict Agent Constraints & Anti-Hallucination Rules

> [!CAUTION]
> **ANY VIOLATION OF THESE RULES REPRESENTS A CRITICAL SYSTEM DEFECT.**

1. **NO Hardcoded Admin Credentials in UI:**
   - NEVER expose administrator passwords in input placeholders, labels, helper tooltips, or error toasts.
   - Credentials must only be verified through `attendanceService.validateAdminPassword()` in a concealed manner.

2. **NO Mock or Placeholder Data Generation:**
   - NEVER invent dummy student names (e.g. "طالب تجريبي", "John Doe", "Student 1").
   - The system MUST always use the official 364 student database aggregated in `/services/officialStudentsData.ts`.

3. **Strict Period 2 (الحصة الثانية) Time Enforcement:**
   - Period 2 timing is strictly **`07:45` to `08:30`**.
   - Do NOT alter this range unless the user explicitly requests changing school timetable settings via `SchoolSettingsModal`.

4. **Timetable Assignment Gate:**
   - Teachers can ONLY record Period 2 attendance for the class section assigned to them on the given day in `getClassAssignedTeacherForDay()`.
   - Admin users have universal override permissions for audit and correction.

5. **Icon Imports:**
   - All icons MUST be imported exclusively from `lucide-react`. Custom SVG elements are forbidden.

6. **Mobile Touch Target Mandate:**
   - All interactive controls (buttons, status pills, checkboxes) MUST have a minimum tap area of **`44px × 44px`** with `touch-manipulation`.

7. **Zero CSS File Fragmentation:**
   - Do NOT create standalone `.css` files (e.g. `App.css`, `Sheet.css`). All styling must reside in Tailwind CSS utility classes.

---

## 7. Current Project Roadmap & Next Expansion Steps

### ✅ Completed & Battle-Tested (Production Version 2.6.0):
- [x] Full 364-student database across 11 classes (Grades 3, 4, 5, 6).
- [x] 20+ Official faculty profiles with national IDs and phone numbers.
- [x] 1-Touch mobile-optimized attendance sheet (`TeacherAttendanceSheet.tsx`).
- [x] Timetable-based period validation engine with assigned teacher lock.
- [x] Concealed admin login authentication with zero UI credential leakage.
- [x] Real-time Admin Dashboard with sub-3-second multi-view synchronization.
- [x] WhatsApp instant parental notification dispatch.
- [x] Comprehensive Contact Directory (`ContactsManager.tsx`) with Google Contacts OAuth.
- [x] Official A4 PDF and Excel report generation conforming to Ministry formats.
- [x] Sanity Test Suite with automated schedule assertion matrix.

### 🎯 Immediate Next Planned Steps (Future Roadmap):
1. **Ministry Noor System Automation (تكامل نظام نور الوزاري):**
   - Implement an automated export converter that formats daily absence payloads into Noor-compliant CSV/XML structures.
2. **Server-Side Automated WhatsApp Gateway (بوابة واتساب الآلية):**
   - Connect a backend Twilio / WhatsApp Cloud API web hook to trigger batch notifications automatically upon Period 2 closure at 08:30 AM without manual button clicks.
3. **Chronic Absenteeism Predictive Analytics (التحليل التنبؤي للغياب):**
   - Implement statistical trend modeling to detect students at risk of exceeding Ministry absence thresholds (5%, 10%, 15%) before formal warning letters are triggered.
