# تقرير النشر — نظام حضور مدرسة زيد بن ثابت

**التاريخ:** ٢ سبتمبر ٢٠٢٦  
**الحالة:** ✅ منشور ويعمل  
**الإصدار:** v2.6.0 + مزامنة Supabase

---

## ١. الرابط النهائي

| البند | القيمة |
|-------|--------|
| **رابط الإنتاج** | https://feel5l.github.io/zayd-bin-thabit-attendance/ |
| **منصة الاستضافة** | GitHub Pages |
| **فرع النشر** | `gh-pages` |
| **المسار الأساسي** | `/zayd-bin-thabit-attendance/` |

---

## ٢. ملخص ما تم تنفيذه

### أ) إعداد Supabase

| الخطوة | الحالة | التفاصيل |
|--------|--------|----------|
| جلب مفتاح `anon` | ✅ | من Supabase API (مفتاح legacy JWT) |
| قاعدة البيانات | ✅ | ٢٨ migration مُطبَّقة مسبقاً |
| Edge Functions | ✅ | `get-schedule`, `teacher-login`, `admin-login`, `submit-attendance`, `get-attendance` |
| دالة إضافية | ✅ | `publish-import-batch` (نُشرت أثناء هذا التسليم) |
| التحقق | ✅ | `get-schedule` يعيد بيانات الجدول بنجاح |

**معرّف المشروع:** `dhpvladkiqajorowrlhj`  
**رابط API:** `https://dhpvladkiqajorowrlhj.supabase.co`

### ب) بناء التطبيق للإنتاج

```bash
VITE_BASE_PATH=/zayd-bin-thabit-attendance/
VITE_ADMIN_PASSWORD=<مضبوطة>
VITE_SUPABASE_URL=https://dhpvladkiqajorowrlhj.supabase.co
VITE_SUPABASE_ANON_KEY=<مضبوطة>
npm run build
```

| الفحص | النتيجة |
|-------|---------|
| `npm run lint` | ✅ 0 أخطاء |
| `npm test` (vitest) | ✅ 15/15 |
| `npm run build` | ✅ نجاح |

### ج) النشر على GitHub Pages

| الخطوة | الحالة | التفاصيل |
|--------|--------|----------|
| رفع البناء على `gh-pages` | ✅ | commit `854a64c` |
| تفعيل GitHub Pages | ✅ | من المستخدم — Source: branch `gh-pages` / `(root)` |
| التحقق من الموقع | ✅ | HTTP 200 + واجهة تسجيل الدخول العربية |
| تحميل الأصول (JS/CSS) | ✅ | جميع الملفات تُحمَّل |
| تضمين Supabase في البناء | ✅ | مُتحقَّق في حزمة الإنتاج |

### د) ما لم يُنجَز (قيود تقنية)

| البند | السبب |
|-------|--------|
| ضبط أسرار GitHub Actions عبر API | صلاحيات التوكن المحدودة (403) |
| تفعيل Pages تلقائياً | يتطلب تسجيل دخول GitHub من المالك |
| نشر Firebase Hosting | `FIREBASE_SERVICE_ACCOUNT` غير مضاف (اختياري) |

> **ملاحظة:** النشر الحالي عبر فرع `gh-pages` مباشرة (وليس عبر workflow Actions). الأسرار مُضمَّنة في البناء وقت التجميع.

---

## ٣. طريقة الاستخدام بعد النشر

### دخول المدير
1. افتح الرابط أعلاه
2. اختر **إدارة المدرسة**
3. أدخل كلمة مرور المدير (المُزوَّدة عند النشر)

### دخول المعلم
1. اختر **معلم / محضر فصل**
2. أدخل رقم الجوال المسجّل في النظام

### المزامنة
- **بين التبويبات (نفس الجهاز):** فورية (< 3 ثوانٍ)
- **بين أجهزة مختلفة:** عبر Supabase (مفعّل)

---

## ٤. إعادة النشر مستقبلاً

### الطريقة الحالية (يدوية — مُجرَّبة)

```bash
# 1. بناء
VITE_BASE_PATH=/zayd-bin-thabit-attendance/ \
VITE_ADMIN_PASSWORD=<كلمة-المدير> \
VITE_SUPABASE_URL=https://dhpvladkiqajorowrlhj.supabase.co \
VITE_SUPABASE_ANON_KEY=<anon-key> \
npm run build

# 2. نسخ إلى فرع gh-pages
git clone --branch gh-pages --depth 1 <repo-url> /tmp/gh-pages-deploy
rm -rf /tmp/gh-pages-deploy/*
cp -r dist/* /tmp/gh-pages-deploy/
touch /tmp/gh-pages-deploy/.nojekyll
cd /tmp/gh-pages-deploy
git add -A && git commit -m "deploy: <وصف>" && git push
```

### الطريقة الآلية (بعد ضبط الأسرار)

1. أضف الأسرار في **Settings → Secrets → Actions**:
   - `VITE_ADMIN_PASSWORD`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. فعّل Pages من **GitHub Actions** (بدل branch)
3. ادفع إلى `main` أو شغّل workflow **Deploy to GitHub Pages**

---

## ٥. نشر Supabase (عند تغيير الجدول أو الدوال)

```bash
npm run supabase:migrate
npm run supabase:deploy-functions
```

تأكد من وجود `SUPABASE_SERVICE_ROLE_KEY` في Edge Functions Secrets.

---

## ٦. توصيات أمنية

| التوصية | الأولوية |
|---------|----------|
| تغيير كلمة مرور المدير بعد أول استخدام | عالية |
| جعل المستودع **Private** | عالية (بيانات PII في git history) |
| عدم إعادة نشر كلمة المرور في محادثات أو commits | عالية |
| ضبط أسرار GitHub Actions للنشر الآلي المستقبلي | متوسطة |

---

## ٧. سجل الأحداث

| الوقت (UTC) | الحدث |
|-------------|-------|
| ٢٠٢٦-٠٩-٠٢ ~19:15 | بناء الإنتاج ورفع `gh-pages` |
| ٢٠٢٦-٠٩-٠٢ ~19:16 | نشر `publish-import-batch` على Supabase |
| ٢٠٢٦-٠٩-٠٢ ~19:18 | GitHub Pages بُني من فرع `gh-pages` |
| ٢٠٢٦-٠٩-٠٢ ~19:24 | تفعيل Pages من المستخدم — الموقع يعمل (HTTP 200) |
| ٢٠٢٦-٠٩-٠٢ ~19:26 | تحقق نهائي: واجهة تسجيل الدخول العربية تظهر |

---

## ٨. جهات الاتصال التقنية

| الخدمة | المعرف / الرابط |
|--------|---------------|
| GitHub Repo | https://github.com/feel5l/zayd-bin-thabit-attendance |
| GitHub Pages | https://feel5l.github.io/zayd-bin-thabit-attendance/ |
| Supabase Dashboard | https://supabase.com/dashboard/project/dhpvladkiqajorowrlhj |
| Firebase (قديم — غير محدَّث) | https://nizam-tracker-d8cdc.web.app |

---

*آخر تحديث: ٢ سبتمبر ٢٠٢٦ — بواسطة Cursor Cloud Agent*
