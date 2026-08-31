import { Student } from '../types';
import { GRADE_3_STUDENTS } from './studentsDataG3';
import { GRADE_4_STUDENTS } from './studentsDataG4';
import { GRADE_5_STUDENTS } from './studentsDataG5';
import { GRADE_6_STUDENTS } from './studentsDataG6';

// Clean empty aggregate data models ready for live database synchronization
export const ALL_STUDENTS: Student[] = [
  ...GRADE_3_STUDENTS,
  ...GRADE_4_STUDENTS,
  ...GRADE_5_STUDENTS,
  ...GRADE_6_STUDENTS,
];

export {
  GRADE_3_STUDENTS,
  GRADE_4_STUDENTS,
  GRADE_5_STUDENTS,
  GRADE_6_STUDENTS
};
