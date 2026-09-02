# تسليم العمل — نظام حضور مدرسة زيد بن ثابت

**آخر تحديث:** ٢ سبتمبر ٢٠٢٦  
**الإصدار على `main`:** v2.6.0 + مزامنة Supabase + تحديث cross-tab للوحة المدير

هذا الملف مكتوب لك أنت، لا للمبرمجين. يشرح ما يعمل الآن، وما بقي عليك يدويًا.

---

## ١. ما اكتمل (مدمج في `main`)

| الميزة | الحالة |
|--------|--------|
| مزامنة الجدول والإسناد عبر Supabase | مدمج (PR #11, #12) |
| SyncAdapter + Edge Functions + طابور Offline | مدمج |
| إصلاح ٣٤ إسنادًا خاطئًا للمعلمين | مدمج |
| إزالة أرقام الجوالات من الواجهة | مدمج |
| ترقية مفاتيح التخزين v3 → v4 | مدمج |
| **تحديث لوحة المدير فور رصد المعلم (بين التبويبات)** | مدمج (PR #14) |
| backfill رائد الفصل للأجهزة القديمة | مدمج في الكود (لا تدمج PR #10 — قديم) |

---

## ٢. المشكلة الأصلية — هل حُلَّت؟

**«المدير يعدّل الجدول، والمعلمون لا يرون التعديل»** → **نعم** (عند ضبط Supabase).

**«رصد المعلم لا يظهر فورًا عند المدير»** → **نعم** في نفس المتصفح بين التبويبات (< 3 ثوانٍ). بين جهازين مختلفين يحتاج Supabase مفعّلًا.

---

## ٣. ما يجب أن تفعله بيدك — إلزامي للنشر

### (أ) أسرار GitHub Actions

من المستودع → **Settings → Secrets and variables → Actions → New repository secret**:

| الاسم | القيمة |
|-------|--------|
| `VITE_ADMIN_PASSWORD` | كلمة مرور قوية للمدير |
| `VITE_SUPABASE_URL` | `https://dhpvladkiqajorowrlhj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | من Supabase → Settings → API → anon public |
| `FIREBASE_SERVICE_ACCOUNT` | (اختياري) JSON حساب Firebase للنشر على Hosting |

**بدون الثلاثة الأولى:** البناء ينجح لكن المدير لا يدخل والمزامنة معطّلة.

### (ب) التطوير المحلي

انسخ `.env.example` إلى `.env.local` واملأ:

```
VITE_ADMIN_PASSWORD=كلمة-قوية
VITE_SUPABASE_URL=https://dhpvladkiqajorowrlhj.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### (ج) نشر Supabase (مرة واحدة من جهازك)

```bash
npx supabase login
npx supabase link --project-ref dhpvladkiqajorowrlhj
npm run supabase:migrate
npm run supabase:deploy-functions
```

ثم من لوحة Supabase → Edge Functions → Secrets: أضف `SUPABASE_SERVICE_ROLE_KEY`.

### (د) اجعل المستودع خاصًا (موصى به)

Settings → Change visibility → **Private** (بيانات PII في تاريخ git).

### (هـ) أعد تشغيل النشر

بعد ضبط الأسرار: Actions → **Deploy to GitHub Pages** → Run workflow.

> **ملاحظة:** النشر كان يفشل لأن CI استخدم `bun` بينما المشروع يعتمد `package-lock.json`. تم إصلاح workflows لاستخدام `npm ci`.

---

## ٤. ما لم يُنفَّذ بعد

| البند | الحالة |
|-------|--------|
| OTP كامل للمعلمين (SMS) | مؤجّل — يحتاج مزوّد مدفوع |
| Sync-5 ترحيل الإنتاج الكامل | مؤجّل |
| نشر استيراد الطلاب للخادم | جزئي (الجدول فقط) |
| المعلمان بلا حساب (القحطاني، الدوسري) | قرارك |
| «مكمل لغة» في الجدول | قرارك |

---

## ٥. الفحوصات — يجب أن تمر قبل أي نشر

```
npm run lint          →  0 أخطاء
npx vitest run        →  15/15
npm run verify:data   →  0 أخطاء
npm run build         →  نجاح
```

---

## ٦. PRs مفتوحة — ماذا تفعل؟

| PR | التوصية |
|----|---------|
| **#10** homeroom backfill | **أغلقه** — الكود أدمج في `main` + v4؛ الفرع قديم (v3) |
| **#13** cursorrules | **لا تدمجه** — يحذف بنية Supabase |
| **#2** draft قديم | تجاهله أو أغلقه |

---

## ٧. معلومات تقنية

- **Supabase:** `dhpvladkiqajorowrlhj` (خطة مجانية — قد تتوقف بعد أسبوع بلا استخدام)
- **GitHub Pages:** `/zayd-bin-thabit-attendance/`
- **Firebase:** `nizam-tracker-d8cdc`
- **الحصة الثانية:** 07:45 – 08:30 (ثابت — لا تغيّر)

---

## ٨. أول اختبار بعد النشر

1. افتح الموقع على جهازين (أو تبويبين)
2. سجّل دخول المدير في الأول والمعلم في الثاني
3. سجّل غيابًا من المعلم
4. تأكد أن لوحة المدير تتحدّث خلال ثوانٍ بدون تحديث يدوي

إن تعطّل شيء، صِف ما رأيته بالضبط.
