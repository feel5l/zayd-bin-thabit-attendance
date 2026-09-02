# خطة بناء المزامنة — Supabase (Phase Sync 1–4)

> يبني هذا الملف على `SYNC_DESIGN.md` الموجود في جذر المشروع. لا تبدأ التنفيذ قبل قراءته كاملًا — هو مصدر الحقيقة لكل قرار معماري (المخطط، قواعد التعارض، مسار الاستيراد). هذا الملف يحوّله إلى خطوات تنفيذ فقط.
>
> **النطاق هنا: Sync-1 إلى Sync-4 فقط — البناء والاختبار، بلا لمس بيانات المدرسة الحقيقية.**
> **Sync-5 (الترحيل الفعلي وقطع الخدمة الحي) أمر منفصل تمامًا، لا يُرسَل إلا بعد أن يعمل كل شيء هنا ويُختبر، وبموعد تختاره أنت من قسم ٧.٢ في SYNC_DESIGN.md.**

---

## ⛔ Gate A — قبل أن ترسل أي أمر للوكيل

هذه أفعال لا يستطيع أي وكيل القيام بها نيابة عنك — تحتاج بيانات دفع وحسابًا باسمك.

1. **أنشئ مشروع Supabase جديدًا** (ليس مشتركًا مع `ghiyabi` — القرار محسوم في SYNC_DESIGN.md §1.2). من [supabase.com](https://supabase.com) → مشروع جديد → اختر منطقة قريبة (Frankfurt أو Singapore أقرب لجدة/الرياض من الخيارات المتاحة).

2. **من إعدادات المشروع (Settings → API)، انسخ:**
   - `Project URL`
   - `anon public key`
   - `service_role key` (⚠️ سرّي — لا يُشارك، لا يُكتب في أي ملف يُرفع لـ git، ولا يبدأ بـ `VITE_`)

3. **قرار مزوّد OTP بالجوال** (مطلوب لتفعيل Supabase Phone Auth): Twilio أو Vonage أو MessageBird. أنشئ حسابًا واحصل على مفاتيح API. **بديل أبسط للبداية:** استخدم Supabase Auth بالبريد الإلكتروني بدل الجوال في هذه المرحلة، وأجّل OTP الجوال لمرحلة لاحقة — إن اخترت هذا قل ذلك للوكيل صراحة في الأمر أدناه.

4. **لا تلصق أيًا من المفاتيح الثلاثة في محادثتك مع أي وكيل.** ضعها مباشرة في:
   - `.env.local` (تطوير محلي — موجود بالفعل من إصلاحات الأمن السابقة، أضف الأسطر الجديدة إليه)
   - إعدادات البيئة في منصة النشر (Firebase Hosting / GitHub Pages Actions secrets)

أضف لملف `.env.local` (بنفسك، أو اطلب من الوكيل إضافة الأسطر فقط بلا قيم):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# service_role key لا يوضع هنا إطلاقًا — فقط في بيئة الخادم (Edge Functions secrets)
```

**بدون هذه الأربعة (المشروع + الرابط + anon key + قرار OTP)، الوكيل سيتوقف عند أول مهمة تحتاجها.**

---

## RULES FOR THE EXECUTING AGENT

1. اعمل داخل `C:\Users\Tonjo\Projects\zayd-bin-thabit-attendance` فقط. لا تلمس `ghiyabi` ولا أي مشروع آخر.
2. فرع جديد: `git checkout -b feature/supabase-sync`
3. اقرأ `SYNC_DESIGN.md` كاملًا أولًا. أي قرار معماري فيه (المخطط، قواعد LWW، مسار الاستيراد) **ثابت ولا يُعاد التفاوض عليه** هنا — التزم به حرفيًا.
4. **لا تكتب `service_role key` في أي ملف يُتتبَّع بـ git.** تحقق بعد كل commit: `git diff --cached | grep -i "service_role\|SUPABASE_SERVICE"` يجب أن يعيد شيئًا فارغًا.
5. **قاعدة عدم الكسر الإلزامية:** التطبيق يجب أن يعمل بكامل وظائفه محليًا حتى لو `VITE_SUPABASE_URL` غير مضبوطة أو الشبكة معطوبة. أي كود مزامنة يُضاف يُغلَّف بفحص توفّر الاتصال، ولا يستبدل مسار `AttendanceService` المحلي — يضيف طبقة فوقه فقط، تمامًا كما ورد في §4.2 "القاعدة الذهبية" من SYNC_DESIGN.md.
6. لا تنفّذ Sync-5 (الترحيل الفعلي). توقف عند نهاية Sync-4.
7. بعد كل PHASE: شغّل `npx tsc --noEmit` و`npx vitest run` و`npm run verify:data` و`npm run build`. أي فشل يوقفك قبل الانتقال للمرحلة التالية.
8. commit بعد كل PHASE برسالة تصف ما بُني، منتهية بـ:
   ```
   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   ```
9. لا تُنشئ حسابات أو موارد فعلية على Supabase بنفسك — المشروع أُنشئ مسبقًا من المالك (Gate A). أنت تكتب SQL وكودًا يُطبَّق عليه.

---

## PHASE Sync-1 — المخطط + RLS + البذور

**الهدف:** قاعدة بيانات جاهزة على مشروع Supabase الذي أنشأه المالك، تعكس بيانات المدرسة الحالية تمامًا.

1. ثبّت أدوات Supabase محليًا:
   ```bash
   npm install -D supabase
   npx supabase init
   npx supabase link --project-ref <من رابط المشروع في Gate A>
   ```

2. أنشئ ملف migration واحد `supabase/migrations/0001_initial_schema.sql` يحتوي **حرفيًا** كل جداول القسم ٢ من `SYNC_DESIGN.md` (من `schools` حتى `school_settings`، ١٥ جدولًا). لا تُعدّل أسماء الأعمدة أو الأنواع.

3. أضف سياسات RLS في `supabase/migrations/0002_rls_policies.sql`. القاعدة العامة من §3.3:
   - المعلم: `SELECT` على `students`/`attendance_submissions` حيث `class_id` ضمن فصوله المُسندة اليوم فقط (عبر `daily_period_assignments` أو `classes.homeroom_teacher_id`).
   - المعلم: لا يرى `phone`/`national_id` لأي معلم آخر، ولا `parent_phone` لطالب خارج فصله.
   - المدير (`role = 'admin'` في `teachers`): وصول كامل لكل الجداول ضمن `school_id` الخاص به.
   - لا وصول بلا مصادقة (`auth.uid()` غير NULL) على أي جدول فيه بيانات شخصية.

4. اكتب سكربت بذر `scripts/seedSupabase.ts` يقرأ من الملفات المحلية الموجودة فعلًا ويكتب إلى Supabase عبر `service_role key` (من متغيّر بيئة، ليس مكتوبًا في الكود):
   - `schools`: صف واحد `id = 'zbt-primary'`
   - `teachers`: من `services/teachersData.ts` — احسب `phone_hash` بدل تخزين الجوال نصًا صريحًا كما في §3.3
   - `classes`: من `services/officialClassesData.ts`
   - `students`: من `services/studentsGrade3.ts` إلى `studentsGrade6.ts`
   - `period_schedules`: من جدول §2 (البذور موثّقة هناك حرفيًا)
   - `timetable_entries` + `timetable_versions` + `daily_period_assignments`: من `services/timetableData.ts` (`OFFICIAL_TIMETABLE_RECORDS` + `extractPeriod2AssignmentsFromTimetable()`) — أنشئ `timetable_versions` واحدة بحالة `published` كنسخة أولى

5. شغّل السكربت مرة واحدة يدويًا: `npx tsx scripts/seedSupabase.ts`

**VERIFY:**
- عدّ الصفوف في Supabase Table Editor يطابق: ~20 معلمًا، 11 فصلًا، ~360 طالبًا، 15 جدول موجودة كلها.
- من SQL Editor في Supabase: استعلام بحساب معلم عشوائي يجب ألا يعيد `phone` نصًا صريحًا — فقط `phone_hash`.
- `npx tsc --noEmit`

**COMMIT:** `"feat(sync): Supabase schema, RLS policies, and initial data seed"`

---

## PHASE Sync-2 — SyncAdapter + مفاتيح v4 + طابور دون اتصال

**الهدف:** طبقة مزامنة تضاف فوق `AttendanceService` الحالي دون تعديل واجهته العامة.

1. أنشئ `services/syncAdapter.ts`. يطبّق جدول §4.2 من SYNC_DESIGN.md بالضبط — لكل كاش من الـ12، اتجاه المزامنة المحدد هناك (سحب فقط / سحب+Realtime / دفع فوري / محلي فقط).

2. **لا تلمس المنطق العام لـ `AttendanceService`.** `SyncAdapter` يقرأ من نفس مفاتيح `localStorage` ويكتب إليها، ثم يستدعي `AttendanceService.reloadScheduleCaches()` الموجودة فعلًا — لا تُعِد كتابة منطق الأعمال.

3. رقّم مفاتيح التخزين إلى `v4` حسب §6.5: عند عدم وجود مفتاح `v4`، اقرأ من `v3` المقابل وانسخه مرة واحدة (لا حذف لـ `v3` بعد — الاحتفاظ به احتياطًا حتى Sync-5).

4. أضف طابور دون اتصال `zbt_offline_queue_v1` عبر IndexedDB (لا مكتبة جديدة — `indexedDB` API مباشرة كافٍ لهذا الحجم). كل عملية دفع فاشلة تُضاف بـ `client_op_id` (UUID)، وتُعاد عند عودة الاتصال بترتيب FIFO — تطبيقًا حرفيًا لجدول §4.3.

5. طبّق قاعدة التعارض في §4.4 (LWW لنفس المعلم، رفض + إشعار للمعلم المختلف) داخل `SyncAdapter.push()` لجدول `attendance_submissions`.

6. أضف مؤشر واجهة بسيط (شريط صغير في `Navbar.tsx` أو مكان مشابه): «متصل» / «وضع دون اتصال — سيتم الرفع تلقائيًا» — حسب حالة `SyncAdapter`.

**VERIFY:**
- بدون `VITE_SUPABASE_URL` مضبوطة إطلاقًا: شغّل `npm run dev` وتأكد أن كل شيء يعمل تمامًا كاليوم — تسجيل دخول، رصد حضور، حفظ. هذا الفحص **لا يجوز أن يفشل**.
- مع `VITE_SUPABASE_URL` مضبوطة: افتح جهازين (تبويبين)، عدّل إعدادًا من "المدير" في أحدهما، وتأكد من ظهوره في الآخر خلال ثوانٍ عبر Realtime لا عبر `storage` event المحلي فقط.
- اقطع الشبكة (DevTools → Network → Offline)، سجّل حضورًا، أعد الاتصال، تأكد من وصوله لـ Supabase.
- `npx tsc --noEmit` و`npx vitest run` و`npm run build`

**COMMIT:** `"feat(sync): SyncAdapter with offline queue and conflict resolution"`

---

## PHASE Sync-3 — OTP + إزالة البيانات الشخصية من الحزمة

**الهدف:** تسجيل دخول حقيقي، وحزمة الواجهة لا تحمل جوال أو هوية أي معلم.

> إن اخترت في Gate A البريد الإلكتروني بدل OTP الجوال للمرحلة الأولى، استبدل "Phone OTP" أدناه بـ "Supabase Auth Email/Password" — بقية الخطوات كما هي.

1. أنشئ `services/teachersPublic.ts`: نسخة آمنة تحوي فقط `{ id, display_name, subject, avatar, role }` — بلا `phone`/`nationalId`/`email`. هذا ما يُشحن في الحزمة الأمامية بدل `teachersData.ts` الكامل.

2. عدّل `components/LoginModal.tsx`:
   - إن كانت `VITE_SUPABASE_URL` مضبوطة: نموذج الدخول يستخدم Supabase Auth Phone OTP (6 أرقام، صلاحية 5 دقائق) بدل مطابقة `getUsers()` محليًا.
   - إن لم تكن مضبوطة: يبقى المسار المحلي الحالي (بعد إصلاحات Phase 0 السابقة) كما هو تمامًا — للتطوير وبيئات بلا خادم.
   - بعد نجاح OTP أول مرة: خزّن `zbt_device_trust_v1` (30 يومًا) — فتحات لاحقة على الجهاز نفسه بلا OTP.

3. `AttendanceService.setCurrentUser()` عند المصادقة عبر Supabase يستقبل الملف من استجابة الخادم **بدون** `phone`/`nationalId`/`email` — تلك الحقول تبقى على الخادم فقط، تُقرأ عبر RLS حين يحتاجها المدير تحديدًا.

4. تأكد أن أي مكان في الواجهة يعرض جوال/هوية معلم (مثل `TeacherAndClassManagerModal.tsx`) يجلبها عند الطلب من الخادم (المدير فقط، عبر RLS) لا من كاش محلي دائم.

**VERIFY:**
- `npm run build` ثم افحص حزمة الإخراج: `grep -r "0508869616\|1061885511" dist/` (أرقام حقيقية من `teachersData.ts` اليوم) — **يجب ألا تظهر شيئًا** بعد هذه المرحلة.
- تسجيل دخول معلم فعليًا عبر OTP على جهاز اختبار.
- `npx tsc --noEmit` و`npx vitest run`

**COMMIT:** `"feat(sync): phone OTP login and remove teacher PII from the bundle"`

---

## PHASE Sync-4 — مسار نشر الجدول والطلاب من الخادم

**الهدف:** رفع Excel من جهاز المدير يظهر على كل الأجهزة، لا على جهازه فقط.

1. اربط `components/TimetableImportModal.tsx` بخط الأنابيب `import_batches` من §5.2: نفس واجهة Upload→Preview→Validate الموجودة اليوم بدون تغيير، لكن `handleApply()` يستدعي الآن نقطة نهاية `publish` بدل الكتابة المباشرة في `localStorage`.

2. أنشئ Supabase Edge Function `publish-import-batch`:
   - يتحقق أن المستدعي `admin` (عبر RLS/JWT).
   - يُدرج `timetable_versions` (حالة `published`) + `timetable_entries` + `daily_period_assignments` دفعة واحدة (transaction).
   - يبث تغييرًا عبر Realtime على `timetable_versions`.

3. `SyncAdapter` (من Sync-2) يستمع لـ `timetable_versions WHERE status = 'published'`، ويحدّث `zbt_period_assignments_prod_v4` محليًا، ثم يستدعي `dispatchScheduleChange('assignments')` الموجودة فعلًا — لا منطق جديد هنا، فقط وصل المصدر.

4. نفس النمط لـ `StudentImportModal.tsx` مع `import_batches` نوع `students`.

**VERIFY:**
- من "جهاز المدير" (تبويب أول): استورد ملف Excel الجدول ونفّذ "اعتماد ونشر".
- من "جهاز معلم" (تبويب ثانٍ، بلا إعادة تحميل): تأكد أن الإسناد الجديد وصل خلال ثوانٍ.
- افصل الجهاز الثاني عن الشبكة قبل النشر، أعد الاتصال بعده، تأكد من وصول التحديث عند العودة.
- `npx tsc --noEmit` و`npx vitest run` و`npm run verify:data` و`npm run build`

**COMMIT:** `"feat(sync): publish timetable and student imports to all devices"`

---

## نهاية النطاق هنا

بعد Sync-4، أبلغني بنتيجة كل VERIFY أعلاه صراحة (نجح/فشل، وأي انحراف عن SYNC_DESIGN.md وسببه). **لا تنتقل لـ Sync-5.**

Sync-5 (تصدير بيانات كل جهاز، الدمج على الخادم، ونافذة القطع الفعلية الخميس 12:30 – السبت 23:59 من §7.2) يحتاج تنسيقًا مع جدول مدرسي حقيقي وموعدًا تختاره أنت — سأكتبه كأمر منفصل عند الجاهزية.
