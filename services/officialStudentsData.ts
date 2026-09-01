import { Student } from '../types';
import { STUDENTS_GRADE_3 } from './studentsGrade3';
import { STUDENTS_GRADE_4 } from './studentsGrade4';
import { STUDENTS_GRADE_5 } from './studentsGrade5';
import { STUDENTS_GRADE_6 } from './studentsGrade6';

// تجميع كل الطلاب الرسميين بالمدرسة (364 طالباً في 11 فصلاً)
export const OFFICIAL_STUDENTS_LIST: Student[] = [
  ...STUDENTS_GRADE_3,
  ...STUDENTS_GRADE_4,
  ...STUDENTS_GRADE_5,
  ...STUDENTS_GRADE_6
];

export const TOTAL_OFFICIAL_STUDENTS_COUNT = OFFICIAL_STUDENTS_LIST.length; // 364
