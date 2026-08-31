# 🚀 AGENTS.md — Developer & AI Agent Reference Manual
**Project:** Zayd Bin Thabit Elementary Attendance System (نظام متابعة ورصد الغياب المبتكر)  
**Target Environment:** React 18+ / TypeScript / Vite / Tailwind CSS / Firebase Firestore Ready / Cloud Run Ready  
**Application ID:** `e18b3982-4516-4e7a-aa23-07b607fd09c1`  
**Current Production Version:** `v2.5.0`

---

## 1. Project Overview & Architecture

This application is a specialized, production-ready school attendance and student discipline tracking platform, tailored for primary education institutions (specifically modeled on Saudi Arabian elementary school workflows focusing on **Period 2 / الحصة الثانية** official absence recording and compliance with Ministry of Education regulations).

### Key Architectural Pillars
- **Frontend Stack**: React 18 with TypeScript, Vite, Tailwind CSS v4, Lucide React icons, and Motion (`motion/react`).
- **Data Layer**: Standardized client-side LocalStorage caching with dual-mode Firestore synchronization capability via `attendanceService.ts`.
- **Roster Baseline**: 364 real enrolled students structured across 11 official class sections (Grade 3 to Grade 6) and 20+ official faculty profiles.
- **Role-Based Access Control (RBAC)**:
  - **Administrator (`admin`)**: Full control over class allocations, period schedules, student directories, PDF/Excel reports, WhatsApp blast triggers, audit trails, and system settings.
  - **Teacher (`teacher`)**: Focused single-purpose view for Period 2 attendance recording, quick status toggling, offline draft caching, and parental communication.

---

## 2. Directory Structure & Key Files

```text
├── components/                     # UI Subcomponents & Modals
│   ├── AdminDashboard.tsx          # Administrator main command center & live statistics
│   ├── ContactsManager.tsx         # Contacts directory, phonebook & search/sort manager
│   ├── ContactsManagerModal.tsx    # Modal wrapper for quick contact access
│   ├── TeacherAttendanceSheet.tsx  # Optimized mobile/desktop 1-touch attendance recording sheet
│   ├── TeacherAndClassManagerModal.tsx # Teacher assignment & class roster allocation
│   ├── StudentDirectory.tsx        # Comprehensive student roster & individual student profiles
│   ├── StudentImportModal.tsx      # Excel / CSV smart bulk roster importer
│   ├── ExcuseManager.tsx           # Absence excuses management & medical report approvals
│   ├── PrintableDailyReport.tsx    # Official A4 formatted daily attendance printouts
│   ├── PdfReportsExportModal.tsx   # PDF export engine for statistical sheets
│   ├── GoogleSheetsExportModal.tsx # Cloud spreadsheet synchronization
│   ├── NotificationCenterModal.tsx # WhatsApp notifications & automated parental alerts
│   ├── SchoolSettingsModal.tsx     # School configuration (terms, period timings, branding)
│   ├── TimeSimulatorBar.tsx        # Period 2 / school time simulation and lock testing
│   ├── ToastNotificationContainer.tsx # Global action feedback notifications
│   └── Navbar.tsx                  # Global responsive header & role switcher
├── services/                       # Data services & static baselines
│   ├── contactsService.ts          # Local phonebook database CRUD, search, filter, and vCard
│   ├── googleContactsService.ts    # Google People API OAuth2 integration (import & export)
│   ├── attendanceService.ts        # Central business logic, persistence, and CRUD methods
│   ├── officialStudentsData.ts     # Aggregated roster of 364 official students
│   ├── studentsGrade3.ts           # Grade 3 classes (3 sections: ثالث 1, ثالث 2, ثالث 3)
│   ├── studentsGrade4.ts           # Grade 4 classes (3 sections: رابع 1, رابع 2, رابع 3)
│   ├── studentsGrade5.ts           # Grade 5 classes (3 sections: خامس 1, خامس 2, خامس 3)
│   ├── studentsGrade6.ts           # Grade 6 classes (2 sections: سادس 1, سادس 2)
│   ├── officialClassesData.ts      # 11 School Classes with capacities, room numbers, and teachers
│   ├── teachersData.ts             # 20+ Official faculty and staff records with phone/credentials
│   └── initialData.ts              # System default seed configurations and period schemas
├── types.ts                        # Master TypeScript interfaces, schemas, and types
├── USER_MANUAL.md                  # Comprehensive Arabic user manual for school staff
└── AGENTS.md                       # This technical architecture and developer guide
```

---

## 3. Core Workflows & Logic

### 3.1 Attendance Recording (Period 2 / الحصة الثانية)
- Default state for all students is `present` (حاضر).
- Teachers toggle exceptions: `absent` (غائب), `late` (متأخر), `excused` (بعذر).
- **Mobile Optimization**: Single-touch 44px targets with quick preset buttons for reasons (`غياب بدون عذر`, `مرض / عذر طبي`, `ظرف أسري طارئ`, `سفر`).
- Instant summary bar at screen bottom: counts present, absent, and late tallies dynamically.

### 3.2 Live Synchronization
- Submissions update local storage and trigger event listeners that update the `AdminDashboard` in `< 3 seconds` without requiring manual browser reloads.
- Audit logs capture timestamp, teacher ID, class, student status changes, and device metadata.

### 3.3 Excuses & Discipline Rules
- Pre-approved medical excuses (e.g. from Seha platform) automatically convert "Unexcused Absence" to "Excused Absence" in cumulative statistics.

---

## 4. Development & Maintenance Guidelines for AI Agents

When modifying or extending this codebase, adhere strictly to these engineering standards:

1. **Type Safety**: Keep `types.ts` synchronized with all changes. Never use `any` for core data entities (`Student`, `SchoolClass`, `ClassAttendanceSubmission`, `User`).
2. **Component Separation**: Avoid bloating `App.tsx`. Extract modals and viewers into `/components/`.
3. **Responsive Design**:
   - Ensure all touch targets on mobile viewports are at least `44px` with `touch-manipulation`.
   - Test layouts against standard Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
4. **Icons**: Use `lucide-react` exclusively. Do not write custom inline SVGs.
5. **No Mock Placeholder Data**: Always utilize the official data structures exported from `/services/` containing real class and student names.
6. **Linter & Compilation Verification**: Always run `npm run lint` (`tsc --noEmit`) and `npm run build` after changes to ensure zero compiler warnings or broken imports.

---

## 5. Completed Capabilities Matrix

- [x] Complete 364-student database distributed across 11 classes (Grades 3, 4, 5, 6).
- [x] 20+ Official teacher accounts with national IDs and phone credentials.
- [x] One-touch mobile-optimized attendance sheet (`TeacherAttendanceSheet.tsx`) with Responsive Grid (1-col mobile, 2-col tablet, 3-col desktop) and 44px touch targets.
- [x] Real-time Admin Dashboard with instantaneous KPI gauges and < 3s synchronization.
- [x] In-memory high-speed caching layer with resilient LocalStorage persistence.
- [x] WhatsApp direct parental notifications generator.
- [x] Full-fledged Contacts Directory (`ContactsManager.tsx`) with local persistence, fast multi-field search, multi-tier sorting, 1-click roster synchronization, and Google Contacts (People API) OAuth integration.
- [x] Formal A4 PDF / Print daily attendance report layout matching official ministry standards.
- [x] Smart CSV / Excel roster import and export engine.
- [x] Master End-to-End QA Test Plan (`QA-MTP-ATTENDANCE-2026-V2.0`) covering RBAC login, Period 2 scheduling, concurrency, resilience, and UI accessibility.

---

## 6. Future Expansion Roadmap & Suggestions

1. **Ministry System Integration (Noor API)**:
   - Provide automated nightly export payloads formatted for direct upload into the Noor Educational System.
2. **Direct SMS / WhatsApp Business API Gateway**:
   - Integrate server-side WhatsApp Cloud API / Twilio SMS for automatic batch messaging to all parents of absent students upon Period 2 lock.
3. **Smart Facial Recognition / NFC Terminal**:
   - Add optional classroom tablet kiosk mode with NFC tag student check-in.
4. **Automated Behavioral Analytics (AI Insights)**:
   - Predict chronic absenteeism patterns using machine learning trends across days of the week (e.g., Sunday/Thursday absence spikes).
