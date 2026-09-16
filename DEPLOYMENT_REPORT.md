# تقرير النشر — نظام حضور مدرسة زيد بن ثابت

**آخر تحديث:** ١٦ سبتمبر ٢٠٢٦  
**الحالة:** منشور ويعمل على Vercel  
**الإصدار:** v2.6.0 + مزامنة Supabase + تبسيط الواجهة  

---

## ١. الرابط النهائي (المصدر الأساسي)

| البند | القيمة |
|-------|--------|
| **رابط الإنتاج** | https://zayd-bin-thabit-attendance.vercel.app |
| **منصة الاستضافة** | Vercel |
| **مشروع Vercel** | `aziz-5c78/zayd-bin-thabit-attendance` |
| **مرجع الكود** | فرع `main` على GitHub / Origin mirror عند الحاجة |

> GitHub Pages (`gh-pages`) استُخدم سابقاً كمسار نشر. **لا تعتمد عليه كإنتاج أساسي** ما لم يُطلب صراحة.

---

## ٢. ما تم تنفيذه للنشر الحالي

### أ) Supabase

| الخطوة | الحالة |
|--------|--------|
| مشروع API | `https://dhpvladkiqajorowrlhj.supabase.co` |
| Edge Functions | `teacher-login`, `admin-login`, `submit-attendance`, `get-attendance`, `get-schedule`, … |
| توكن الجهاز | مطلوب لـ submit/get عبر `x-device-token` |
| التحقق | دفع غياب معلم → سحب مدير يرى الطالب الغائب |

### ب) متغيرات Vercel (Production / Preview / Development)

| الاسم | الغرض |
|-------|--------|
| `VITE_ADMIN_PASSWORD` | دخول المدير |
| `VITE_SUPABASE_URL` | عنوان المشروع |
| `VITE_SUPABASE_ANON_KEY` | مفتاح anon العام فقط |

**مهم:** قيم `VITE_*` تُدمج وقت `vite build`. بعد تعديلها نفّذ:

```bash
npx vercel deploy --prod --yes
```

### ج) بناء وتحقق

```bash
npm run lint
npm test
npm run build
```

تحقق حزمة الإنتاج:
- تحتوي `dhpvladkiqajorowrlhj.supabase.co`
- لا تحتوي `service_role`
- واجهة declutter (لا شريط «بوابة الإدارة والتعديل الشامل» الافتراضي)

### د) نشر سبتمبر ٢٠٢٦ (مرجع)

| البند | قيمة |
|-------|------|
| مثال نشر ناجح | `dpl_3LGGTxjpHExrRjdKbW2BWp7TdfiG` على `main` |
| تحقق المزامنة | لوحة المدير تعرض نسبة فصول مُرسلة (مثال تحقق: `1 / 11`) بعد submit |

---

## ٣. أوامر إعادة النشر

```bash
git checkout main && git pull
npx vercel whoami
npx vercel deploy --prod --yes
curl -I https://zayd-bin-thabit-attendance.vercel.app/
```

Supabase فقط عند تغيير الدوال/الجداول:

```bash
npm run supabase:migrate
npm run supabase:deploy-functions
```

---

## ٤. مسار المزامنة (ملخص تشغيلي)

```text
teacher-login → deviceToken
saveAttendanceSubmission → submit-attendance (items + x-device-token)
admin get-attendance (poll ~8s) → applyServerSubmissions → AdminDashboard
```

أخطاء شائعة:
- بلا توكن → حفظ محلي فقط / بانر إعادة الدخول
- 403 → المعلم غير مسند للفصل ذلك اليوم (لا يُعاد طابور المحاولة)
- env قديمة على Vercel دون redeploy → البناء لا يرى Supabase

التفاصيل الكاملة: [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md).

---

## ٥. أمان

- لا تضع `service_role` في متغيرات Vite أو الواجهة.
- لا تلتزم ملفات `.env` / `.vercel` (مغطاة في `.gitignore`).
- لا تعرض كلمة مرور المدير في الواجهة أو رسائل الخطأ.

---

## ٦. مراجع

- [`HANDOVER.md`](./HANDOVER.md)
- [`AGENTS.md`](./AGENTS.md)
- [`ENGINEERING_HISTORY.md`](./ENGINEERING_HISTORY.md)
- [`SYNC_DESIGN.md`](./SYNC_DESIGN.md)
