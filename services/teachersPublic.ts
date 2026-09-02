import { User } from '../types';

/**
 * Public teacher roster — deliberately WITHOUT phone numbers, national IDs or
 * email addresses.
 *
 * This is the list the app bundles and ships to every browser. The full roster
 * in teachersData.ts still holds the personal details, but that file is read
 * only by build-time scripts and tests; importing it from application code
 * would publish 20 teachers' phone numbers and national IDs to anyone who
 * opens the site's JavaScript.
 *
 * Identity checking happens on the server instead: services/teacherAuth.ts
 * sends the number the teacher typed to the teacher-login Edge Function, which
 * compares hashes and returns only the profile fields below.
 */
export const PUBLIC_TEACHERS_LIST: User[] = [
  {
    id: 'teacher-5',
    sequenceNumber: 5,
    username: 'saleh_aldossary',
    name: 'أ. صالح مسعود حمد الدوسري',
    role: 'teacher',
    password: '',
    subject: 'دراسات إسلامية',
    assignedClassId: 'class-5-1',
    assignedClassName: 'الصف الخامس الابتدائي (1)',
    avatar: '📖'
  },
  {
    id: 'teacher-6',
    sequenceNumber: 6,
    username: 'nasser_aldossary',
    name: 'أ. ناصر باتل محمد الدوسري',
    role: 'teacher',
    password: '',
    subject: 'دراسات إسلامية',
    assignedClassId: 'class-5-3',
    assignedClassName: 'الصف الخامس الابتدائي (3)',
    avatar: '🕌'
  },
  {
    id: 'teacher-7',
    sequenceNumber: 7,
    username: 'mohammed_aljahaish',
    name: 'أ. محمد فهد عائض آل جحيش',
    role: 'teacher',
    password: '',
    subject: 'دراسات إسلامية',
    assignedClassId: 'class-3-3',
    assignedClassName: 'الصف الثالث الابتدائي (3)',
    avatar: '🕌'
  },
  {
    id: 'teacher-8',
    sequenceNumber: 8,
    username: 'hamad_almarri',
    name: 'أ. حمد محمد عبيد المري',
    role: 'teacher',
    password: '',
    subject: 'دراسات إسلامية',
    assignedClassId: 'class-6-1',
    assignedClassName: 'الصف السادس الابتدائي (1)',
    avatar: '📖'
  },
  {
    id: 'teacher-9',
    sequenceNumber: 9,
    username: 'abdulrahman_alquw',
    name: 'أ. عبد الرحمن محمد عبد الله القو',
    role: 'teacher',
    password: '',
    subject: 'لغة عربية',
    assignedClassId: 'class-5-2',
    assignedClassName: 'الصف الخامس الابتدائي (2)',
    avatar: '📚'
  },
  {
    id: 'teacher-10',
    sequenceNumber: 10,
    username: 'mohammed_almelhem',
    name: 'أ. محمد بن سلمان بن محمد الملحم',
    role: 'teacher',
    password: '',
    subject: 'لغة عربية',
    assignedClassId: 'class-4-2',
    assignedClassName: 'الصف الرابع الابتدائي (2)',
    avatar: '✍️'
  },
  {
    id: 'teacher-11',
    sequenceNumber: 11,
    username: 'khaled_almulla',
    name: 'أ. خالد محمد عمر الملا',
    role: 'teacher',
    password: '',
    subject: 'لغة عربية',
    assignedClassId: 'class-3-1',
    assignedClassName: 'الصف الثالث الابتدائي (1)',
    avatar: '✍️'
  },
  {
    id: 'teacher-12',
    sequenceNumber: 12,
    username: 'abdulmohsen_ajmi',
    name: 'أ. عبد المحسن هادي دواس العجمي',
    role: 'teacher',
    password: '',
    subject: 'لغة عربية',
    assignedClassId: 'class-3-1',
    assignedClassName: 'الصف الثالث الابتدائي (1)',
    avatar: '🖋️'
  },
  {
    id: 'teacher-13',
    sequenceNumber: 13,
    username: 'abdullah_alrajani',
    name: 'أ. عبد الله ماجد العرجاني',
    role: 'teacher',
    password: '',
    subject: 'لغة عربية',
    assignedClassId: 'class-4-3',
    assignedClassName: 'الصف الرابع الابتدائي (3)',
    avatar: '🖋️'
  },
  {
    id: 'teacher-14',
    sequenceNumber: 14,
    username: 'osama_doghan',
    name: 'أ. اسامة عبد اللطيف عبد الرحمن الدوغان',
    role: 'teacher',
    password: '',
    subject: 'رياضيات',
    assignedClassId: 'class-4-2',
    assignedClassName: 'الصف الرابع الابتدائي (2)',
    avatar: '📐'
  },
  {
    id: 'teacher-15',
    sequenceNumber: 15,
    username: 'naif_jaghyman',
    name: 'أ. نايف عبد اللطيف موسى الجغيمان',
    role: 'teacher',
    password: '',
    subject: 'رياضيات',
    assignedClassId: 'class-4-1',
    assignedClassName: 'الصف الرابع الابتدائي (1)',
    avatar: '📐'
  },
  {
    id: 'teacher-16',
    sequenceNumber: 16,
    username: 'abdullah_alkhaldi',
    name: 'أ. عبد المحسن عبد الله طليحان الخالدي',
    role: 'teacher',
    password: '',
    subject: 'رياضيات',
    assignedClassId: 'class-6-2',
    assignedClassName: 'الصف السادس الابتدائي (2)',
    avatar: '📐'
  },
  {
    id: 'teacher-17',
    sequenceNumber: 17,
    username: 'ibrahim_mahboub',
    name: 'أ. ابراهيم عبد الله صالح المحبوب',
    role: 'teacher',
    password: '',
    subject: 'علوم',
    assignedClassId: 'class-4-1',
    assignedClassName: 'الصف الرابع الابتدائي (1)',
    avatar: '🔬'
  },
  {
    id: 'teacher-18',
    sequenceNumber: 18,
    username: 'abdulaziz_khalfan',
    name: 'أ. عبد العزيز إبراهيم الخلفان',
    role: 'teacher',
    password: '',
    subject: 'علوم',
    assignedClassId: 'class-3-2',
    assignedClassName: 'الصف الثالث الابتدائي (2)',
    avatar: '🧪'
  },
  {
    id: 'teacher-19',
    sequenceNumber: 19,
    username: 'mohammed_alhassan',
    name: 'أ. محمد أحمد محمد الحسن',
    role: 'teacher',
    password: '',
    subject: 'علوم',
    assignedClassId: 'class-6-1',
    assignedClassName: 'الصف السادس الابتدائي (1)',
    avatar: '🔭'
  },
  {
    id: 'teacher-20',
    sequenceNumber: 20,
    username: 'abdulrahman_aldossary',
    name: 'أ. عبد الرحمن غنام عبد الرحمن الدوسري',
    role: 'teacher',
    password: '',
    subject: 'اجتماعيات',
    assignedClassId: 'class-6-2',
    assignedClassName: 'الصف السادس الابتدائي (2)',
    avatar: '🌍'
  },
  {
    id: 'teacher-23',
    sequenceNumber: 23,
    username: 'khaled_hulaibi',
    name: 'أ. خالد نجيب خالد الحليبي',
    role: 'teacher',
    password: '',
    subject: 'انجليزي',
    assignedClassId: 'class-3-2',
    assignedClassName: 'الصف الثالث الابتدائي (2)',
    avatar: '🔤'
  },
  {
    id: 'teacher-24',
    sequenceNumber: 24,
    username: 'khalifa_alqaemi',
    name: 'أ. خليفة سعد القعيبي',
    role: 'teacher',
    password: '',
    subject: 'تربية بدنية',
    assignedClassId: 'class-5-3',
    assignedClassName: 'الصف الخامس الابتدائي (3)',
    avatar: '⚽'
  },
  {
    id: 'teacher-25',
    sequenceNumber: 25,
    username: 'mohammed_malki',
    name: 'أ. محمد عمر المالكي',
    role: 'teacher',
    password: '',
    subject: 'حاسب الى',
    assignedClassId: 'class-5-1',
    assignedClassName: 'الصف الخامس الابتدائي (1)',
    avatar: '💻'
  },
  {
    id: 'teacher-22',
    sequenceNumber: 22,
    username: 'faihan_almarri',
    name: 'أ. فيحان المري',
    role: 'teacher',
    password: '',
    subject: 'معلم',
    assignedClassId: undefined,
    assignedClassName: undefined,
    avatar: '👨‍🏫'
  }
];

