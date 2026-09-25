// Live API E2E for admin-manage (add / edit / transfer / remove / Period-2
// reassignment / deactivate). Test data only: ids e2e_* / s_e2e_*, fake phones
// 05990001xx. Remove afterwards with cleanup.sql.
// env: ANON (public anon key), ADMIN_PASS (never printed).
const U = 'https://dhpvladkiqajorowrlhj.supabase.co/functions/v1';
const K = process.env.ANON;
const H = (tok) => ({ apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', ...(tok ? { 'x-device-token': tok } : {}) });
const post = async (fn, body, tok) => { const r = await fetch(`${U}/${fn}`, { method: 'POST', headers: H(tok), body: JSON.stringify(body) }); return { s: r.status, b: await r.json().catch(() => ({})) }; };
const get = async (fn, tok) => { const r = await fetch(`${U}/${fn}`, { headers: H(tok) }); return { s: r.status, b: await r.json().catch(() => ({})) }; };
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`); };

const P1 = '0599000101', P2 = '0599000102';
// Attendance is upserted per (class, date, period): never test on a real school
// day. 2025-01-02 is a Thursday before the system went live.
const QA_DATE = '2025-01-02', QA_CLASS = 'class-4-3', QA_DAY = 'thursday';
const SUB_ID = `sub-${QA_DATE}-${QA_CLASS}-p2`;
const admin = await post('admin-login', { username: 'admin', password: process.env.ADMIN_PASS, deviceLabel: 'e2e-admin-api' });
check('admin login', admin.s === 200 && admin.b.deviceToken);
const A = admin.b.deviceToken;
if (!A) { console.log('RESULT aborted: admin login failed'); process.exit(1); }
const pre = await get(`get-attendance?date=${QA_DATE}`, A);
if ((pre.b.submissions || []).some((s) => s.class_id === QA_CLASS && !String(s.teacher_id).startsWith('e2e_'))) {
  console.log(`RESULT aborted: real attendance exists for ${QA_CLASS} on ${QA_DATE}`); process.exit(1);
}
const sched0 = await get('get-schedule');
const ORIG_TEACHER = (sched0.b.assignments || []).find((a) => a.class_id === QA_CLASS && a.day_of_week === QA_DAY && a.period_number === 2)?.teacher_id;
if (!ORIG_TEACHER) { console.log('RESULT aborted: no Period-2 assignment to restore'); process.exit(1); }
console.log(`RESTORE-INFO ${QA_CLASS} ${QA_DAY} P2 original teacher = ${ORIG_TEACHER}`);
const am = (action, body, tok = A) => post('admin-manage', { action, ...body }, tok);

// Teachers
let r = await am('teacher.save', { id: 'e2e_teacher_1', name: 'معلم اختبار آلي', subject: 'علوم', phone: P1 });
check('1 add teacher', r.s === 200 && r.b.result?.created === true, JSON.stringify(r.b));
r = await post('teacher-login', { identifier: P1 });
check('2 new teacher logs in by phone', r.s === 200 && r.b.teacher?.id === 'e2e_teacher_1' && r.b.deviceToken, `status ${r.s}`);
r = await am('teacher.save', { id: 'e2e_teacher_1', name: 'معلم اختبار آلي', subject: 'علوم', phone: P2 });
check('3 change teacher phone', r.s === 200 && r.b.result?.created === false);
check('3a old phone rejected', (await post('teacher-login', { identifier: P1 })).s === 404);
const tl = await post('teacher-login', { identifier: P2 });
check('3b new phone works', tl.s === 200 && tl.b.teacher?.id === 'e2e_teacher_1');
const T = tl.b.deviceToken;
r = await am('teacher.save', { id: 'e2e_teacher_2', name: 'معلم مكرر', phone: P2 });
check('4 duplicate phone refused', r.s === 409 && r.b.error === 'phone_in_use', JSON.stringify(r.b));
r = await am('teacher.save', { id: 'e2e_teacher_3', name: 'بدون جوال' });
check('5 new teacher without phone refused', r.s === 400 && r.b.error === 'phone_required');
r = await am('teacher.save', { id: 'e2e_teacher_4', name: 'جوال خاطئ', phone: '12345' });
check('6 invalid phone refused', r.s === 400 && r.b.error === 'invalid_phone');
r = await am('teacher.save', { id: 'user-admin', name: 'x', phone: P1 });
check('7 cannot edit admin via teacher.save', r.s === 400 && r.b.error === 'cannot_edit_admin_here');

// Non-admin cannot manage
r = await am('student.remove', { id: 'std-3-1-01' }, T);
check('8 teacher token gets 403 on admin-manage', r.s === 403);

// Students
r = await am('student.save', { id: 's_e2e_1', name: 'طالب اختبار آلي', classId: 'class-4-3', nationalId: '1999999901', parentName: 'ولي أمر اختبار', parentPhone: '0599000111', studentNumber: 'E2E1' });
check('9 add student', r.s === 200 && r.b.result?.created === true, JSON.stringify(r.b));
r = await am('student.save', { id: 's_e2e_2', name: 'هوية مكررة', classId: 'class-4-3', nationalId: '1999999901' });
check('10 duplicate student national id refused', r.s === 409 && r.b.error === 'national_id_in_use');

// Assignment: give class-4-3 Thursday P2 to the new teacher
r = await am('assignment.setMany', { assignments: [{ classId: QA_CLASS, day: QA_DAY, periodNumber: 2, teacherId: 'e2e_teacher_1' }] });
check('11 reassign Period 2', r.s === 200 && r.b.result?.changed === 1, JSON.stringify(r.b));
const sched = await get('get-schedule');
const row = (sched.b.assignments || []).find((a) => a.class_id === 'class-4-3' && a.day_of_week === 'thursday' && a.period_number === 2);
check('11a get-schedule shows new teacher', row?.teacher_id === 'e2e_teacher_1');
check('11b get-schedule lists new teacher', (sched.b.teachers || []).some((t) => t.id === 'e2e_teacher_1' && t.is_active));

// New teacher submits attendance including the new student (FK + assignment check)
const contacts = await get('get-student-contacts', T);
const rosterIds = new Set((contacts.b.roster || []).map((s) => s.id));
check('12 roster includes new student', rosterIds.has('s_e2e_1'));
check('12a teacher gets contacts for class-4-3', (contacts.b.classIds || []).includes('class-4-3') && (contacts.b.students || []).some((s) => s.id === 's_e2e_1'));
const cls = (contacts.b.roster || []).filter((s) => s.class_id === 'class-4-3');
const items = cls.map((s) => ({ studentId: s.id, studentName: s.name, status: s.id === 's_e2e_1' ? 'absent' : 'present' }));
r = await post('submit-attendance', {
  submission: { id: SUB_ID, date: QA_DATE, classId: 'class-4-3', className: 'رابع 3', gradeLevel: 'الصف الرابع الابتدائي', teacherName: 'معلم اختبار آلي', periodNumber: 2, totalStudents: items.length, presentCount: items.length - 1, absentCount: 1 },
  items, clientOpId: 'e2e',
}, T);
check('13 new teacher submits for reassigned class incl. new student', r.s === 200 && r.b.itemCount === items.length, `status ${r.s} ${JSON.stringify(r.b)}`);
r = await get(`get-attendance?date=${QA_DATE}`, A);
const sub = (r.b.submissions || []).find((s) => s.class_id === 'class-4-3');
check('13a admin sees it', sub?.teacher_id === 'e2e_teacher_1' && (r.b.items || []).some((i) => i.student_id === 's_e2e_1' && i.status === 'absent'));

// Transfer + remove
r = await am('student.transfer', { id: 's_e2e_1', classId: 'class-5-1' });
check('14 transfer student', r.s === 200);
let roster = (await get('get-student-contacts', T)).b.roster || [];
check('14a roster shows new class', roster.find((s) => s.id === 's_e2e_1')?.class_id === 'class-5-1');
r = await am('student.remove', { id: 's_e2e_1' });
check('15 remove student', r.s === 200);
roster = (await get('get-student-contacts', T)).b.roster || [];
check('15a removed student gone from roster', !roster.some((s) => s.id === 's_e2e_1'));
check('15b attendance history kept', ((await get(`get-attendance?date=${QA_DATE}`, A)).b.items || []).some((i) => i.student_id === 's_e2e_1'));

// Revert assignment, deactivate teacher
r = await am('assignment.setMany', { assignments: [{ classId: QA_CLASS, day: QA_DAY, periodNumber: 2, teacherId: ORIG_TEACHER }] });
check('16 revert Period 2 to original teacher', r.s === 200 && ((await get('get-schedule')).b.assignments || []).find((a) => a.class_id === QA_CLASS && a.day_of_week === QA_DAY && a.period_number === 2)?.teacher_id === ORIG_TEACHER);
r = await am('teacher.deactivate', { id: 'e2e_teacher_1' });
check('17 deactivate teacher', r.s === 200);
check('17a deactivated teacher cannot log in', (await post('teacher-login', { identifier: P2 })).s === 404);
check('17b deactivated teacher token revoked', (await get('get-student-contacts', T)).s === 401);
check('17c gone from teacher directory', !((await get('get-schedule')).b.teachers || []).some((t) => t.id === 'e2e_teacher_1' && t.is_active));

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
