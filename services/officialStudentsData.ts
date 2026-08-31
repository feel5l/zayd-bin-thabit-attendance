import { Student } from '../types';
import { STUDENTS_GRADE_3 } from './studentsGrade3';
import { STUDENTS_GRADE_4 } from './studentsGrade4';
import { STUDENTS_GRADE_5 } from './studentsGrade5';
import { STUDENTS_GRADE_6 } from './studentsGrade6';

export const OFFICIAL_STUDENTS_LIST: Student[] = [
  ...STUDENTS_GRADE_3,
  ...STUDENTS_GRADE_4,
  ...STUDENTS_GRADE_5,
  ...STUDENTS_GRADE_6
];
