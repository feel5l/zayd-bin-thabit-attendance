import { TeacherTimetableRecord, TimetableEntry, WeekDayKey, DayPeriodAssignment } from '../types';

export const OFFICIAL_TIMETABLE_RECORDS: TeacherTimetableRecord[] = [
  {
    teacherId: 'teacher-1',
    teacherSequence: 1,
    teacherName: 'أ. أسامة الدوغان',
    mainSubject: 'الرياضيات',
    quota: 24,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 6, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 6, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 4, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 5, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'الرياضيات' }
    ]
  },
  {
    teacherId: 'teacher-2',
    teacherSequence: 2,
    teacherName: 'أ. إبراهيم المحبوب',
    mainSubject: 'العلوم',
    quota: 19,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-1', className: 'خامس 1', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-4-3', className: 'رابع 3', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-5-1', className: 'خامس 1', subject: 'نشاط' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-4-1', className: 'رابع 1', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'نشاط' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-4-2', className: 'رابع 2', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-5-1', className: 'خامس 1', subject: 'المهارات الحياتية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-4-1', className: 'رابع 1', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-4-3', className: 'رابع 3', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-5-1', className: 'خامس 1', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 6, classId: 'class-5-1', className: 'خامس 1', subject: 'العلوم' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-4-2', className: 'رابع 2', subject: 'العلوم' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'العلوم' }
    ]
  },
  {
    teacherId: 'teacher-3',
    teacherSequence: 3,
    teacherName: 'أ. حمد المري',
    mainSubject: 'الدراسات الإسلامية',
    quota: 19,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-1', className: 'رابع 1', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-4-1', className: 'رابع 1', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-6-1', className: 'سادس 1', subject: 'المهارات الحياتية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-4-3', className: 'رابع 3', subject: 'نشاط' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-6-2', className: 'سادس 2', subject: 'نشاط' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الإسلامية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'نشاط' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-6-2', className: 'سادس 2', subject: 'نشاط' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الإسلامية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'نشاط' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الإسلامية' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الإسلامية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الإسلامية' }
    ]
  },
  {
    teacherId: 'teacher-4',
    teacherSequence: 4,
    teacherName: 'أ. خالد الملا',
    mainSubject: 'لغتي الجميلة',
    quota: 18,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-3-1', className: 'ثالث 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-2', className: 'ثالث 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-3-3', className: 'ثالث 3', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-3-1', className: 'ثالث 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-3-2', className: 'ثالث 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-3-3', className: 'ثالث 3', subject: 'لغتي الجميلة' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-2', className: 'ثالث 2', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-3-1', className: 'ثالث 1', subject: 'لغتي الجميلة' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-3', className: 'ثالث 3', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-3-3', className: 'ثالث 3', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 6, classId: 'class-3-2', className: 'ثالث 2', subject: 'لغتي الجميلة' }
    ]
  },
  {
    teacherId: 'teacher-5',
    teacherSequence: 5,
    teacherName: 'أ. خليفة القعيمي',
    mainSubject: 'التربية البدنية والدفاع عن النفس',
    quota: 23,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-3', className: 'رابع 3', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-3-1', className: 'ثالث 1', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-4-1', className: 'رابع 1', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-6-1', className: 'سادس 1', subject: 'التربية البدنية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'التربية البدنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-1', className: 'ثالث 1', subject: 'التربية البدنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'التربية البدنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'التربية البدنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'التربية البدنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 6, classId: 'class-4-2', className: 'رابع 2', subject: 'التربية البدنية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-1', className: 'ثالث 1', subject: 'التربية البدنية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'التربية البدنية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-5-3', className: 'خامس 3', subject: 'التربية البدنية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-5-2', className: 'خامس 2', subject: 'التربية البدنية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-6-1', className: 'سادس 1', subject: 'التربية البدنية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 6, classId: 'class-3-2', className: 'ثالث 2', subject: 'التربية البدنية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-4-2', className: 'رابع 2', subject: 'التربية البدنية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'التربية البدنية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 3, classId: 'class-5-1', className: 'خامس 1', subject: 'التربية البدنية' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'التربية البدنية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'التربية البدنية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'التربية البدنية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 5, classId: 'class-5-3', className: 'خامس 3', subject: 'التربية البدنية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 6, classId: 'class-3-1', className: 'ثالث 1', subject: 'التربية البدنية' }
    ]
  },
  {
    teacherId: 'teacher-6',
    teacherSequence: 6,
    teacherName: 'أ. صالح الدوسري',
    mainSubject: 'التربية الفنية',
    quota: 12,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'التربية الفنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-1', className: 'خامس 1', subject: 'التربية الفنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'التربية الفنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'التربية الفنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-6-2', className: 'سادس 2', subject: 'التربية الفنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-5-2', className: 'خامس 2', subject: 'التربية الفنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-4-1', className: 'رابع 1', subject: 'التربية الفنية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'التربية الفنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'التربية الفنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'التربية الفنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-3-3', className: 'ثالث 3', subject: 'التربية الفنية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-6-1', className: 'سادس 1', subject: 'التربية الفنية' }
    ]
  },
  {
    teacherId: 'teacher-7',
    teacherSequence: 7,
    teacherName: 'أ. عبدالرحمن الدوسري',
    mainSubject: 'الدراسات الاجتماعية',
    quota: 19,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'التربية البدنية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الاجتماعية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الاجتماعية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-6-2', className: 'سادس 2', subject: 'المهارات الحياتية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الاجتماعية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الاجتماعية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الاجتماعية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الاجتماعية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الاجتماعية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الاجتماعية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-6-1', className: 'سادس 1', subject: 'الدراسات الاجتماعية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-6-2', className: 'سادس 2', subject: 'التربية البدنية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الاجتماعية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'الدراسات الاجتماعية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الاجتماعية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الاجتماعية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الاجتماعية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الاجتماعية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الاجتماعية' }
    ]
  },
  {
    teacherId: 'teacher-8',
    teacherSequence: 8,
    teacherName: 'أ. عبدالرحمن القو',
    mainSubject: 'لغتي الجميلة',
    quota: 20,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-5-2', className: 'خامس 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-6-1', className: 'سادس 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-6-1', className: 'سادس 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-6-2', className: 'سادس 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-5-3', className: 'خامس 3', subject: 'لغتي الجميلة' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-5-2', className: 'خامس 2', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-5-3', className: 'خامس 3', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-2', className: 'خامس 2', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-6-1', className: 'سادس 1', subject: 'لغتي الجميلة' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-5-3', className: 'خامس 3', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-6-2', className: 'سادس 2', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'لغتي الجميلة' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'لغتي الجميلة' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'لغتي الجميلة' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'لغتي الجميلة' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'لغتي الجميلة' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'لغتي الجميلة' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 4, classId: 'class-5-3', className: 'خامس 3', subject: 'لغتي الجميلة' }
    ]
  },
  {
    teacherId: 'teacher-9',
    teacherSequence: 9,
    teacherName: 'أ. عبدالعزيز الخلفان',
    mainSubject: 'العلوم',
    quota: 16,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-2', className: 'خامس 2', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-3-1', className: 'ثالث 1', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-3-2', className: 'ثالث 2', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-3-2', className: 'ثالث 2', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-3-3', className: 'ثالث 3', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-3-1', className: 'ثالث 1', subject: 'العلوم' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-2', className: 'خامس 2', subject: 'العلوم' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-3-1', className: 'ثالث 1', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'العلوم' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-5-2', className: 'خامس 2', subject: 'العلوم' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'العلوم' }
    ]
  },
  {
    teacherId: 'teacher-10',
    teacherSequence: 10,
    teacherName: 'أ. عبدالله العرجاني',
    mainSubject: 'لغتي الجميلة',
    quota: 20,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-1', className: 'رابع 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-4-2', className: 'رابع 2', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-4-1', className: 'رابع 1', subject: 'لغتي الجميلة' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-5-1', className: 'خامس 1', subject: 'لغتي الجميلة' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-4-3', className: 'رابع 3', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'لغتي الجميلة' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-4-1', className: 'رابع 1', subject: 'لغتي الجميلة' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-5-1', className: 'خامس 1', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'لغتي الجميلة' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-4-3', className: 'رابع 3', subject: 'لغتي الجميلة' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'لغتي الجميلة' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-4-2', className: 'رابع 2', subject: 'لغتي الجميلة' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'لغتي الجميلة' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-4-1', className: 'رابع 1', subject: 'لغتي الجميلة' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'لغتي الجميلة' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 4, classId: 'class-4-3', className: 'رابع 3', subject: 'لغتي الجميلة' }
    ]
  },
  {
    teacherId: 'teacher-11',
    teacherSequence: 11,
    teacherName: 'أ. محمد الملحم',
    mainSubject: 'الدراسات الإسلامية',
    quota: 19,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-3', className: 'خامس 3', subject: 'المهارات الحياتية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الإسلامية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-4-1', className: 'رابع 1', subject: 'المهارات الحياتية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'نشاط' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-4-2', className: 'رابع 2', subject: 'الدراسات الإسلامية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'الدراسات الإسلامية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'الدراسات الإسلامية' }
    ]
  },
  {
    teacherId: 'teacher-12',
    teacherSequence: 12,
    teacherName: 'أ. محمد القحطاني',
    mainSubject: 'الدراسات الإسلامية والفنية',
    quota: 18,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-3-3', className: 'ثالث 3', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-3-2', className: 'ثالث 2', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-3-3', className: 'ثالث 3', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-3-1', className: 'ثالث 1', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-3-1', className: 'ثالث 1', subject: 'الدراسات الإسلامية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-4-3', className: 'رابع 3', subject: 'المهارات الحياتية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'التربية الفنية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-3-1', className: 'ثالث 1', subject: 'التربية الفنية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'الدراسات الإسلامية' }
    ]
  },
  {
    teacherId: 'teacher-13',
    teacherSequence: 13,
    teacherName: 'أ. نايف الجغيمان',
    mainSubject: 'الرياضيات',
    quota: 24,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-3-3', className: 'ثالث 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-3-2', className: 'ثالث 2', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-3-3', className: 'ثالث 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-3-1', className: 'ثالث 1', subject: 'الرياضيات' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-4-1', className: 'رابع 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-3-2', className: 'ثالث 2', subject: 'الرياضيات' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-1', className: 'ثالث 1', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-4-1', className: 'رابع 1', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-3-2', className: 'ثالث 2', subject: 'الرياضيات' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 3, classId: 'class-3-3', className: 'ثالث 3', subject: 'الرياضيات' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 3, classId: 'class-3-2', className: 'ثالث 2', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'الرياضيات' }
    ]
  },
  {
    teacherId: 'teacher-14',
    teacherSequence: 14,
    teacherName: 'أ. محمد المالكي',
    mainSubject: 'المهارات الرقمية',
    quota: 18,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'المهارات الرقمية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-6-1', className: 'سادس 1', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-4-1', className: 'رابع 1', subject: 'المهارات الرقمية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'المهارات الرقمية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-6-2', className: 'سادس 2', subject: 'المهارات الرقمية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-5-2', className: 'خامس 2', subject: 'المهارات الرقمية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-6-1', className: 'سادس 1', subject: 'نشاط' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'المهارات الرقمية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'المهارات الرقمية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'المهارات الرقمية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-3', className: 'خامس 3', subject: 'المهارات الرقمية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'المهارات الرقمية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-6-1', className: 'سادس 1', subject: 'المهارات الرقمية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-4-2', className: 'رابع 2', subject: 'المهارات الرقمية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-4-3', className: 'رابع 3', subject: 'المهارات الرقمية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-5-2', className: 'خامس 2', subject: 'المهارات الرقمية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'المهارات الرقمية' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'المهارات الرقمية' }
    ]
  },
  {
    teacherId: 'teacher-15',
    teacherSequence: 15,
    teacherName: 'أ. عبدالمحسن العجمي',
    mainSubject: 'المهارات الحياتية والنشاط',
    quota: 12,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-3-1', className: 'ثالث 1', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-2', className: 'ثالث 2', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-3-1', className: 'ثالث 1', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-3-3', className: 'ثالث 3', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-3-1', className: 'ثالث 1', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-3-3', className: 'ثالث 3', subject: 'نشاط' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-3', className: 'ثالث 3', subject: 'المهارات الحياتية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'نشاط' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'المهارات الحياتية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-3-2', className: 'ثالث 2', subject: 'نشاط' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'المهارات الحياتية' }
    ]
  },
  {
    teacherId: 'teacher-16',
    teacherSequence: 16,
    teacherName: 'أ. ناصر الدوسري',
    mainSubject: 'الدراسات الإسلامية',
    quota: 19,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-5-3', className: 'خامس 3', subject: 'نشاط' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الإسلامية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-5-2', className: 'خامس 2', subject: 'المهارات الحياتية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الإسلامية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الإسلامية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'المهارات الحياتية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الإسلامية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الإسلامية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'الدراسات الإسلامية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'نشاط' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'الدراسات الإسلامية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'الدراسات الإسلامية' }
    ]
  },
  {
    teacherId: 'teacher-17',
    teacherSequence: 17,
    teacherName: 'أ. محمد الحسن',
    mainSubject: 'العلوم',
    quota: 12,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-6-2', className: 'سادس 2', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-6-2', className: 'سادس 2', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-3', className: 'خامس 3', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-6-1', className: 'سادس 1', subject: 'العلوم' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-6-1', className: 'سادس 1', subject: 'العلوم' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'العلوم' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-5-3', className: 'خامس 3', subject: 'العلوم' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'العلوم' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-6-1', className: 'سادس 1', subject: 'العلوم' }
    ]
  },
  {
    teacherId: 'teacher-18',
    teacherSequence: 18,
    teacherName: 'أ. عبدالله الخالدي',
    mainSubject: 'الرياضيات',
    quota: 18,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-6-2', className: 'سادس 2', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-6-1', className: 'سادس 1', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-3', className: 'خامس 3', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-6-2', className: 'سادس 2', subject: 'الرياضيات' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-6-2', className: 'سادس 2', subject: 'الرياضيات' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'الرياضيات' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-6-2', className: 'سادس 2', subject: 'الرياضيات' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'الرياضيات' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'الرياضيات' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-5-3', className: 'خامس 3', subject: 'الرياضيات' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'الرياضيات' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'الرياضيات' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-6-2', className: 'سادس 2', subject: 'الرياضيات' }
    ]
  },
  {
    teacherId: 'teacher-19',
    teacherSequence: 19,
    teacherName: 'أ. مكمل لغة',
    mainSubject: 'اللغة الإنجليزية',
    quota: 9,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-6-1', className: 'سادس 1', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-5-3', className: 'خامس 3', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-6-2', className: 'سادس 2', subject: 'اللغة الإنجليزية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-6-1', className: 'سادس 1', subject: 'اللغة الإنجليزية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-6-1', className: 'سادس 1', subject: 'اللغة الإنجليزية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-6-2', className: 'سادس 2', subject: 'اللغة الإنجليزية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-5-3', className: 'خامس 3', subject: 'اللغة الإنجليزية' }
    ]
  },
  {
    teacherId: 'teacher-20',
    teacherSequence: 20,
    teacherName: 'أ. خالد الحليبي',
    mainSubject: 'اللغة الإنجليزية',
    quota: 24,
    entries: [
      // الأحد
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 1, classId: 'class-5-1', className: 'خامس 1', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 2, classId: 'class-4-1', className: 'رابع 1', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 5, classId: 'class-5-2', className: 'خامس 2', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 6, classId: 'class-4-2', className: 'رابع 2', subject: 'اللغة الإنجليزية' },
      { day: 'sunday', dayArabic: 'الأحد', periodNumber: 7, classId: 'class-5-1', className: 'خامس 1', subject: 'اللغة الإنجليزية' },
      // الإثنين
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 1, classId: 'class-3-3', className: 'ثالث 3', subject: 'اللغة الإنجليزية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 2, classId: 'class-3-2', className: 'ثالث 2', subject: 'اللغة الإنجليزية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 3, classId: 'class-4-3', className: 'رابع 3', subject: 'اللغة الإنجليزية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 4, classId: 'class-5-2', className: 'خامس 2', subject: 'اللغة الإنجليزية' },
      { day: 'monday', dayArabic: 'الإثنين', periodNumber: 5, classId: 'class-4-3', className: 'رابع 3', subject: 'اللغة الإنجليزية' },
      // الثلاثاء
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 1, classId: 'class-3-2', className: 'ثالث 2', subject: 'اللغة الإنجليزية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 2, classId: 'class-3-3', className: 'ثالث 3', subject: 'اللغة الإنجليزية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'اللغة الإنجليزية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 4, classId: 'class-5-1', className: 'خامس 1', subject: 'اللغة الإنجليزية' },
      { day: 'tuesday', dayArabic: 'الثلاثاء', periodNumber: 5, classId: 'class-4-1', className: 'رابع 1', subject: 'اللغة الإنجليزية' },
      // الأربعاء
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 1, classId: 'class-3-3', className: 'ثالث 3', subject: 'اللغة الإنجليزية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 2, classId: 'class-5-2', className: 'خامس 2', subject: 'اللغة الإنجليزية' },
      { day: 'wednesday', dayArabic: 'الأربعاء', periodNumber: 3, classId: 'class-3-1', className: 'ثالث 1', subject: 'اللغة الإنجليزية' },
      // الخميس
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 1, classId: 'class-4-1', className: 'رابع 1', subject: 'اللغة الإنجليزية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 2, classId: 'class-4-3', className: 'رابع 3', subject: 'اللغة الإنجليزية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 3, classId: 'class-3-2', className: 'ثالث 2', subject: 'اللغة الإنجليزية' },
      { day: 'thursday', dayArabic: 'الخميس', periodNumber: 4, classId: 'class-4-2', className: 'رابع 2', subject: 'اللغة الإنجليزية' }
    ]
  },
  {
    teacherId: 'teacher-21',
    teacherSequence: 21,
    teacherName: 'أ. عبدالمحسن الدوسري',
    mainSubject: 'معلم',
    quota: 0,
    entries: []
  },
  {
    teacherId: 'teacher-22',
    teacherSequence: 22,
    teacherName: 'أ. فيحان المري',
    mainSubject: 'معلم',
    quota: 0,
    entries: []
  }
];

/** Maps legacy timetable sequence ids to official login ids in teachersData.ts */
export const LEGACY_TIMETABLE_TEACHER_ID_MAP: Record<string, string> = {
  'teacher-1': 'teacher-14',
  'teacher-2': 'teacher-17',
  'teacher-3': 'teacher-8',
  'teacher-4': 'teacher-11',
  'teacher-5': 'teacher-24',
  'teacher-6': 'teacher-5',
  'teacher-7': 'teacher-20',
  'teacher-8': 'teacher-9',
  'teacher-9': 'teacher-18',
  'teacher-10': 'teacher-13',
  'teacher-11': 'teacher-10',
  'teacher-13': 'teacher-15',
  'teacher-14': 'teacher-25',
  'teacher-15': 'teacher-12',
  'teacher-16': 'teacher-6',
  'teacher-17': 'teacher-19',
  'teacher-18': 'teacher-16',
  'teacher-20': 'teacher-23',
  'teacher-22': 'teacher-22'
};

export function mapLegacyTimetableTeacherId(legacyId: string): string {
  return LEGACY_TIMETABLE_TEACHER_ID_MAP[legacyId] ?? legacyId;
}

/**
 * Automatically extracts Period 2 assignments across all 5 school days
 * from the official timetable data to perfectly power Period 2 Attendance Recording!
 */
export const extractPeriod2AssignmentsFromTimetable = (): DayPeriodAssignment[] => {
  const slotMap = new Map<string, DayPeriodAssignment>();

  const days: { key: WeekDayKey; label: string }[] = [
    { key: 'sunday', label: 'الأحد' },
    { key: 'monday', label: 'الإثنين' },
    { key: 'tuesday', label: 'الثلاثاء' },
    { key: 'wednesday', label: 'الأربعاء' },
    { key: 'thursday', label: 'الخميس' }
  ];

  days.forEach(day => {
    OFFICIAL_TIMETABLE_RECORDS.forEach(record => {
      const p2Entry = record.entries.find(e => e.day === day.key && e.periodNumber === 2);
      if (p2Entry) {
        const slotKey = `${p2Entry.classId}_${day.key}`;
        if (slotMap.has(slotKey)) return;

        const resolvedTeacherId = mapLegacyTimetableTeacherId(record.teacherId);
        slotMap.set(slotKey, {
          id: `assign_${p2Entry.classId}_${day.key}`,
          classId: p2Entry.classId,
          className: p2Entry.className,
          day: day.key,
          dayArabic: day.label,
          teacherId: resolvedTeacherId,
          teacherName: record.teacherName,
          periodNumber: 2,
          subject: p2Entry.subject,
          notes: `حسب الجدول المدرسي المعتمد - الحصة الثانية (${p2Entry.subject})`
        });
      }
    });
  });

  return Array.from(slotMap.values());
};
