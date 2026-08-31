import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { User, SchoolClass, Student } from '../types';
import { AttendanceService } from '../services/attendanceService';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Layers,
  ArrowRight,
  Shuffle,
  FileText,
  X,
  Sparkles,
  Search,
  Check,
  RefreshCw,
  Sliders,
  Settings2,
  Trash2,
  Info,
  HelpCircle,
  School,
  Building,
  UserCheck
} from 'lucide-react';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: () => void;
}

interface RawParsedStudent {
  tempId: string;
  name: string;
  nationalId: string;
  studentNumber: string;
  gradeLevel: string;
  sectionHint: string;
  parentName: string;
  parentPhone: string;
  homePhone?: string;
  gender: 'male' | 'female';
  assignedClassId: string;
  assignedClassName: string;
  isExisting?: boolean;
}

type DistributionStrategy = 'by_file' | 'balanced' | 'alphabetical' | 'capacity' | 'single_class';
type DuplicateHandling = 'merge' | 'skip_duplicates' | 'replace';

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Configure & Distribute, 3: Preview & Confirm
  const [classes, setClasses] = useState<SchoolClass[]>(() => AttendanceService.getClasses());
  const [existingStudents, setExistingStudents] = useState<Student[]>(() => AttendanceService.getStudents());

  // Input state
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Distribution settings
  const [strategy, setStrategy] = useState<DistributionStrategy>('balanced');
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('merge');
  const [capacityLimit, setCapacityLimit] = useState<number>(25);
  const [targetSingleClassId, setTargetSingleClassId] = useState<string>('');

  // Processed Students Preview
  const [processedStudents, setProcessedStudents] = useState<RawParsedStudent[]>([]);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilterClass, setPreviewFilterClass] = useState('all');

  // Success Summary state
  const [isSuccessFinished, setIsSuccessFinished] = useState(false);
  const [importStats, setImportStats] = useState<{
    added: number;
    updated: number;
    skipped: number;
    total: number;
    classesBreakdown: Record<string, number>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Refresh classes
  const reloadClasses = () => {
    const freshClasses = AttendanceService.getClasses();
    setClasses(freshClasses);
    if (freshClasses.length > 0 && !targetSingleClassId) {
      setTargetSingleClassId(freshClasses[0].id);
    }
  };

  // Auto-generate school elementary classes if none exist
  const handleGenerateDefaultClasses = () => {
    const generated = AttendanceService.createDefaultElementaryClasses(currentUser);
    setClasses(generated);
    if (generated.length > 0) {
      setTargetSingleClassId(generated[0].id);
    }
  };

  // Helper to normalize arabic text
  const normalize = (str: any): string => {
    if (!str) return '';
    return String(str)
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
  };

  // Clean raw grade text into standard grade name
  const detectGradeLevel = (rawVal: any): string => {
    const val = normalize(rawVal);
    if (!val) return 'الصف الرابع الابتدائي';
    if (val.includes('اول') || val.includes('1') || val.includes('الاول')) return 'الصف الأول الابتدائي';
    if (val.includes('ثان') || val.includes('2') || val.includes('الثاني')) return 'الصف الثاني الابتدائي';
    if (val.includes('ثالث') || val.includes('3') || val.includes('الثالث')) return 'الصف الثالث الابتدائي';
    if (val.includes('رابع') || val.includes('4') || val.includes('الرابع')) return 'الصف الرابع الابتدائي';
    if (val.includes('خامس') || val.includes('5') || val.includes('الخامس')) return 'الصف الخامس الابتدائي';
    if (val.includes('سادس') || val.includes('6') || val.includes('السادس')) return 'الصف السادس الابتدائي';
    return 'الصف الرابع الابتدائي';
  };

  // Clean section hint
  const detectSection = (rawVal: any): string => {
    const val = normalize(rawVal);
    if (!val) return '';
    if (val.includes('1') || val.includes('أ') || val.includes('ا') || val.includes('اولى') || val.includes('أول')) return 'أ';
    if (val.includes('2') || val.includes('ب') || val.includes('ثانية') || val.includes('ثاني')) return 'ب';
    if (val.includes('3') || val.includes('ج') || val.includes('ثالثة')) return 'ج';
    return 'أ';
  };

  // Parse raw rows from sheet or text
  const parseRowsToRaw = (rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) {
      setFileError('لم يتم العثور على أية صفوف أو بيانات صالحة في الملف.');
      return;
    }

    setRawRows(rows);
    setFileError(null);
    setStep(2);
  };

  // Handle File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsProcessingFile(true);
    setFileError(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json with headers
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (json.length === 0) {
          setFileError('الملف فارغ أو لا يحتوي على صفوف بيانات.');
          setIsProcessingFile(false);
          return;
        }

        parseRowsToRaw(json);
      } catch (err: any) {
        console.error('Error parsing file:', err);
        setFileError('حدث خطأ أثناء قراءة الملف. يرجى التأكد من صيغة الملف (Excel أو CSV) والمحاولة مرة أخرى.');
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      setFileError('فشل في قراءة الملف من الجهاز.');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Pasted Text (CSV/TSV/Tab-delimited)
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setFileError('يرجى لصق بيانات الطلاب أولاً.');
      return;
    }

    try {
      const lines = pastedText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setFileError('النص المدخل فارغ.');
        return;
      }

      // Check delimiter (Tab or Comma or Semicolon)
      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
        
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h || `عمود_${idx + 1}`] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        // Single column of names without headers
        lines.forEach((line, idx) => {
          rows.push({
            'اسم الطالب': line.trim(),
            'السجل المدني': `10${Math.floor(10000000 + Math.random() * 90000000)}`,
            'الصف': 'الصف الرابع الابتدائي'
          });
        });
      }

      setFileName('بيانات_ملصوقة.txt');
      parseRowsToRaw(rows);
    } catch (e) {
      setFileError('تعذر معالجة النص المدخل. تأكد من صحة الفواصل بين الأعمدة.');
    }
  };

  // Download Sample Template
  const handleDownloadSample = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        'اسم الطالب': 'عبدالرحمن محمد العتيبي',
        'السجل المدني': '1098234561',
        'الرقم الأكاديمي': '40101',
        'الصف': 'الصف الرابع الابتدائي',
        'الشعبة': 'أ',
        'اسم ولي الأمر': 'محمد العتيبي',
        'جوال ولي الأمر': '0501234567'
      },
      {
        'اسم الطالب': 'فهد سلطان الدوسري',
        'السجل المدني': '1098234562',
        'الرقم الأكاديمي': '40102',
        'الصف': 'الصف الرابع الابتدائي',
        'الشعبة': 'ب',
        'اسم ولي الأمر': 'سلطان الدوسري',
        'جوال ولي الأمر': '0502345678'
      },
      {
        'اسم الطالب': 'خالد عبدالله القحطاني',
        'السجل المدني': '1098234563',
        'الرقم الأكاديمي': '40103',
        'الصف': 'الصف الخامس الابتدائي',
        'الشعبة': 'أ',
        'اسم ولي الأمر': 'عبدالله القحطاني',
        'جوال ولي الأمر': '0503456789'
      },
      {
        'اسم الطالب': 'سعود خالد الحربي',
        'السجل المدني': '1098234564',
        'الرقم الأكاديمي': '40104',
        'الصف': 'الصف الخامس الابتدائي',
        'الشعبة': 'ب',
        'اسم ولي الأمر': 'خالد الحربي',
        'جوال ولي الأمر': '0504567890'
      },
      {
        'اسم الطالب': 'عمر أحمد الشمري',
        'السجل المدني': '1098234565',
        'الرقم الأكاديمي': '40105',
        'الصف': 'الصف السادس الابتدائي',
        'الشعبة': 'أ',
        'اسم ولي الأمر': 'أحمد الشمري',
        'جوال ولي الأمر': '0505678901'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قائمة الطلاب');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'نموذج_استيراد_طلاب_مدرسة_زيد_بن_ثابت.xlsx');
    } else {
      XLSX.writeFile(wb, 'نموذج_استيراد_طلاب_مدرسة_زيد_بن_ثابت.csv', { bookType: 'csv' });
    }
  };

  // Perform Distribution on Raw Rows
  const executeDistribution = () => {
    let availableClasses = [...classes];
    if (availableClasses.length === 0) {
      availableClasses = AttendanceService.createDefaultElementaryClasses(currentUser);
      setClasses(availableClasses);
    }

    // Step 1: Extract standardized objects from raw rows
    const extractedList: {
      name: string;
      nationalId: string;
      studentNumber: string;
      gradeLevel: string;
      sectionHint: string;
      parentName: string;
      parentPhone: string;
      gender: 'male' | 'female';
    }[] = [];

    rawRows.forEach((row, idx) => {
      const keys = Object.keys(row);
      
      // Auto-detect keys
      const findKey = (patterns: string[]) => {
        return keys.find(k => {
          const normKey = normalize(k);
          return patterns.some(p => normKey.includes(normalize(p)));
        });
      };

      const nameKey = findKey(['اسم الطالب', 'الاسم', 'اسم_الطالب', 'name', 'student_name', 'طالب']) || keys[0];
      const nationalIdKey = findKey(['السجل المدني', 'الهوية', 'رقم الهوية', 'السجل', 'national_id', 'id', 'هوية']);
      const studentNumKey = findKey(['الرقم الاكاديمي', 'رقم الطالب', 'الرقم', 'student_id', 'student_number', 'اكاديمي']);
      const gradeKey = findKey(['الصف', 'المرحلة', 'المستوى', 'grade', 'class_grade', 'صف']);
      const sectionKey = findKey(['الشعبة', 'الفصل', 'section', 'class', 'شعبه', 'فصل']);
      const parentNameKey = findKey(['ولي الامر', 'اسم ولي الامر', 'الوالد', 'parent_name', 'parent']);
      const parentPhoneKey = findKey(['جوال', 'الهاتف', 'رقم الجوال', 'هاتف ولي الامر', 'جوال ولي الامر', 'phone', 'mobile']);

      const studentName = String(row[nameKey] || '').trim();
      if (!studentName) return; // Skip empty row

      const nationalId = nationalIdKey && row[nationalIdKey] 
        ? String(row[nationalIdKey]).trim() 
        : `10${Math.floor(10000000 + Math.random() * 90000000)}`;

      const studentNumber = studentNumKey && row[studentNumKey]
        ? String(row[studentNumKey]).trim()
        : `40${(idx + 1).toString().padStart(3, '0')}`;

      const gradeLevel = gradeKey && row[gradeKey] 
        ? detectGradeLevel(row[gradeKey]) 
        : 'الصف الرابع الابتدائي';

      const sectionHint = sectionKey && row[sectionKey]
        ? String(row[sectionKey]).trim()
        : '';

      const parentName = parentNameKey && row[parentNameKey]
        ? String(row[parentNameKey]).trim()
        : `ولي أمر ${studentName.split(' ')[0] || ''}`;

      let parentPhone = parentPhoneKey && row[parentPhoneKey]
        ? String(row[parentPhoneKey]).trim()
        : '0500000000';

      if (!parentPhone.startsWith('05') && parentPhone.length === 9) {
        parentPhone = `0${parentPhone}`;
      }

      extractedList.push({
        name: studentName,
        nationalId,
        studentNumber,
        gradeLevel,
        sectionHint,
        parentName,
        parentPhone,
        gender: 'male'
      });
    });

    if (extractedList.length === 0) {
      setFileError('لم يتم العثور على أية أسماء طلاب صالحة للاستيراد.');
      return;
    }

    // Step 2: Apply chosen distribution strategy
    const processed: RawParsedStudent[] = [];

    if (strategy === 'single_class') {
      const selectedCls = availableClasses.find(c => c.id === targetSingleClassId) || availableClasses[0];
      extractedList.forEach(st => {
        processed.push({
          tempId: `st_${Date.now()}_${Math.random()}`,
          ...st,
          assignedClassId: selectedCls.id,
          assignedClassName: selectedCls.shortName || selectedCls.name,
          gradeLevel: selectedCls.gradeLevel
        });
      });
    } else if (strategy === 'by_file') {
      // Direct assignment by file hint
      extractedList.forEach(st => {
        let matchedClass: SchoolClass | undefined;

        // Try matching grade + section
        const gradeClasses = availableClasses.filter(c => 
          normalize(c.gradeLevel) === normalize(st.gradeLevel) ||
          c.gradeLevel.includes(st.gradeLevel) ||
          st.gradeLevel.includes(c.gradeLevel)
        );

        if (st.sectionHint) {
          const normSec = detectSection(st.sectionHint);
          matchedClass = gradeClasses.find(c => 
            normalize(c.section) === normalize(normSec) || 
            c.shortName.includes(st.sectionHint) ||
            c.name.includes(st.sectionHint)
          );
        }

        if (!matchedClass && gradeClasses.length > 0) {
          matchedClass = gradeClasses[0];
        }

        if (!matchedClass) {
          matchedClass = availableClasses[0];
        }

        processed.push({
          tempId: `st_${Date.now()}_${Math.random()}`,
          ...st,
          assignedClassId: matchedClass.id,
          assignedClassName: matchedClass.shortName || matchedClass.name,
          gradeLevel: matchedClass.gradeLevel
        });
      });
    } else if (strategy === 'alphabetical') {
      // Group by gradeLevel first, sort alphabetically, then round-robin distribute to sections
      const gradeGroups: Record<string, typeof extractedList> = {};
      extractedList.forEach(st => {
        if (!gradeGroups[st.gradeLevel]) gradeGroups[st.gradeLevel] = [];
        gradeGroups[st.gradeLevel].push(st);
      });

      Object.entries(gradeGroups).forEach(([gradeName, studentsInGrade]) => {
        // Sort alphabetically
        studentsInGrade.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        const classesForGrade = availableClasses.filter(c => 
          normalize(c.gradeLevel) === normalize(gradeName) ||
          c.gradeLevel.includes(gradeName) ||
          gradeName.includes(c.gradeLevel)
        );

        const targetPool = classesForGrade.length > 0 ? classesForGrade : availableClasses;

        studentsInGrade.forEach((st, idx) => {
          const assignedCls = targetPool[idx % targetPool.length];
          processed.push({
            tempId: `st_${Date.now()}_${Math.random()}`,
            ...st,
            assignedClassId: assignedCls.id,
            assignedClassName: assignedCls.shortName || assignedCls.name,
            gradeLevel: assignedCls.gradeLevel
          });
        });
      });
    } else if (strategy === 'capacity') {
      // Fill sections up to capacity limit sequentially
      const gradeGroups: Record<string, typeof extractedList> = {};
      extractedList.forEach(st => {
        if (!gradeGroups[st.gradeLevel]) gradeGroups[st.gradeLevel] = [];
        gradeGroups[st.gradeLevel].push(st);
      });

      Object.entries(gradeGroups).forEach(([gradeName, studentsInGrade]) => {
        const classesForGrade = availableClasses.filter(c => 
          normalize(c.gradeLevel) === normalize(gradeName) ||
          c.gradeLevel.includes(gradeName) ||
          gradeName.includes(c.gradeLevel)
        );
        const targetPool = classesForGrade.length > 0 ? classesForGrade : availableClasses;

        let classIdx = 0;
        let countInCurrentClass = 0;

        studentsInGrade.forEach((st) => {
          if (countInCurrentClass >= capacityLimit && classIdx < targetPool.length - 1) {
            classIdx++;
            countInCurrentClass = 0;
          }

          const assignedCls = targetPool[classIdx];
          countInCurrentClass++;

          processed.push({
            tempId: `st_${Date.now()}_${Math.random()}`,
            ...st,
            assignedClassId: assignedCls.id,
            assignedClassName: assignedCls.shortName || assignedCls.name,
            gradeLevel: assignedCls.gradeLevel
          });
        });
      });
    } else {
      // Balanced (Equal Distribution Round-Robin per grade)
      const gradeGroups: Record<string, typeof extractedList> = {};
      extractedList.forEach(st => {
        if (!gradeGroups[st.gradeLevel]) gradeGroups[st.gradeLevel] = [];
        gradeGroups[st.gradeLevel].push(st);
      });

      Object.entries(gradeGroups).forEach(([gradeName, studentsInGrade]) => {
        const classesForGrade = availableClasses.filter(c => 
          normalize(c.gradeLevel) === normalize(gradeName) ||
          c.gradeLevel.includes(gradeName) ||
          gradeName.includes(c.gradeLevel)
        );
        const targetPool = classesForGrade.length > 0 ? classesForGrade : availableClasses;

        studentsInGrade.forEach((st, idx) => {
          const assignedCls = targetPool[idx % targetPool.length];
          processed.push({
            tempId: `st_${Date.now()}_${Math.random()}`,
            ...st,
            assignedClassId: assignedCls.id,
            assignedClassName: assignedCls.shortName || assignedCls.name,
            gradeLevel: assignedCls.gradeLevel
          });
        });
      });
    }

    // Check existing duplicates against database
    const currentStudentsInDb = AttendanceService.getStudents();
    processed.forEach(p => {
      const isDup = currentStudentsInDb.some(dbS => 
        (p.nationalId && dbS.nationalId === p.nationalId) ||
        (p.studentNumber && dbS.studentNumber === p.studentNumber) ||
        (p.name.trim().toLowerCase() === dbS.name.trim().toLowerCase())
      );
      p.isExisting = isDup;
    });

    setProcessedStudents(processed);
    setStep(3);
  };

  // Change individual student class in preview
  const handleChangeStudentClass = (tempId: string, newClassId: string) => {
    const targetCls = classes.find(c => c.id === newClassId);
    if (!targetCls) return;

    setProcessedStudents(prev => prev.map(s => {
      if (s.tempId === tempId) {
        return {
          ...s,
          assignedClassId: targetCls.id,
          assignedClassName: targetCls.shortName || targetCls.name,
          gradeLevel: targetCls.gradeLevel
        };
      }
      return s;
    }));
  };

  // Final Commit & Save
  const handleConfirmImport = () => {
    const finalStudentRecords: Student[] = processedStudents.map(st => ({
      id: `s_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      name: st.name.trim(),
      nationalId: st.nationalId.trim(),
      studentNumber: st.studentNumber.trim(),
      gradeLevel: st.gradeLevel,
      classId: st.assignedClassId,
      className: st.assignedClassName,
      parentName: st.parentName.trim(),
      parentPhone: st.parentPhone.trim(),
      gender: st.gender || 'male',
      homePhone: st.homePhone || '',
      nationality: 'سعودي'
    }));

    const result = AttendanceService.saveStudentsBatch(
      finalStudentRecords,
      duplicateHandling,
      currentUser
    );

    // Calculate distribution breakdown
    const breakdown: Record<string, number> = {};
    processedStudents.forEach(s => {
      const name = s.assignedClassName || 'شعبة غير محددة';
      breakdown[name] = (breakdown[name] || 0) + 1;
    });

    setImportStats({
      added: result.added,
      updated: result.updated,
      skipped: result.skipped,
      total: result.total,
      classesBreakdown: breakdown
    });

    setIsSuccessFinished(true);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    onSuccess();
  };

  // Filter preview rows
  const filteredPreviewStudents = processedStudents.filter(st => {
    const matchesSearch = 
      st.name.toLowerCase().includes(previewSearch.toLowerCase()) ||
      st.nationalId.includes(previewSearch) ||
      st.parentPhone.includes(previewSearch);

    if (!matchesSearch) return false;
    if (previewFilterClass !== 'all' && st.assignedClassId !== previewFilterClass) return false;
    return true;
  });

  // Calculate quick stats for preview step
  const totalImportCount = processedStudents.length;
  const uniqueClassesCount = new Set(processedStudents.map(s => s.assignedClassId)).size;
  const duplicateCount = processedStudents.filter(s => s.isExisting).length;
  const avgPerClass = uniqueClassesCount > 0 ? Math.round(totalImportCount / uniqueClassesCount) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black font-brand">
                استيراد وتوزيع الطلاب الذكي (Excel / CSV)
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                استيراد كشوفات الطلاب من ملفات خارجية وتوزيعهم على الفصول والشعب تلقائياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        {!isSuccessFinished && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                step >= 1 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                1
              </span>
              <span className={step === 1 ? 'text-emerald-900 font-black' : ''}>رفع الملف أو لصق الكشف</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 rotate-180" />
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                step >= 2 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                2
              </span>
              <span className={step === 2 ? 'text-emerald-900 font-black' : ''}>إعدادات التوزيع الآلي</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 rotate-180" />
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                step >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                3
              </span>
              <span className={step === 3 ? 'text-emerald-900 font-black' : ''}>المعاينة والاعتماد النهائي</span>
            </div>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* If Finished Success State */}
          {isSuccessFinished && importStats ? (
            <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-lg shadow-emerald-700/10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black font-brand text-slate-900">
                  تم استيراد وتوزيع الطلاب بنجاح!
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  تم حفظ بيانات الطلاب في سجلات المدرسة وتوزيعهم بدقة على الشعب وتحديث كشوفات المعلمين.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                  <div className="text-2xl font-black text-emerald-800">{importStats.added}</div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-0.5">طالب جديد أُضيف</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-center">
                  <div className="text-2xl font-black text-blue-800">{importStats.updated}</div>
                  <div className="text-[11px] font-bold text-blue-700 mt-0.5">سجل تم تحديثه</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                  <div className="text-2xl font-black text-amber-800">{importStats.skipped}</div>
                  <div className="text-[11px] font-bold text-amber-700 mt-0.5">سجل مكرر تُخطي</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-center">
                  <div className="text-2xl font-black text-purple-800">{importStats.total}</div>
                  <div className="text-[11px] font-bold text-purple-700 mt-0.5">إجمالي طلاب المدرسة</div>
                </div>
              </div>

              {/* Breakdown by Class */}
              <div className="max-w-2xl mx-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right space-y-3">
                <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <span>توزيع الطلاب المستوردين على الشُعب والفصول:</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(importStats.classesBreakdown).map(([clsName, count]) => (
                    <div key={clsName} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{clsName}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-black rounded-md">
                        {count} طالب
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-700/20 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>تم والانتقال لدليل الطلاب</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Upload / Input */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Notice if no classes in school */}
                  {classes.length === 0 && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>لم يتم إدخال فصول دراسية في النظام بعد. يمكنك توليد الفصول تلقائياً الآن.</span>
                      </div>
                      <button
                        onClick={handleGenerateDefaultClasses}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>توليد فصول المدرسة الابتدائية آلياً (1 إلى 6)</span>
                      </button>
                    </div>
                  )}

                  {/* Mode switcher tabs */}
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <button
                      onClick={() => setInputMode('file')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                        inputMode === 'file'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>رفع ملف Excel أو CSV</span>
                    </button>
                    <button
                      onClick={() => setInputMode('paste')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                        inputMode === 'paste'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>لصق كشف نصي مباشر (Copy & Paste)</span>
                    </button>
                  </div>

                  {/* File Upload Box */}
                  {inputMode === 'file' ? (
                    <div className="space-y-4">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/60 hover:bg-emerald-50/30 transition group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 text-emerald-700 mx-auto flex items-center justify-center group-hover:scale-110 transition">
                          {isProcessingFile ? (
                            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                          ) : (
                            <Upload className="w-8 h-8" />
                          )}
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-sm font-black text-slate-800">
                            انقر لاختيار ملف الطلاب من جهازك أو اسحبه وأفلته هنا
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            يدعم ملفات الإكسل (.xlsx, .xls) والملفات المفصولة بفواصل (.csv)
                          </p>
                        </div>
                        {fileName && (
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold font-mono">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                            <span>{fileName}</span>
                          </div>
                        )}
                      </div>

                      {/* Sample template download helper */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>هل تحتاج نموذجاً جاهزاً للبدء؟ يمكنك تحميل النموذج وتعبئته بالأسماء:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadSample('xlsx')}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-700" />
                            <span>نموذج Excel جاهز (.xlsx)</span>
                          </button>
                          <button
                            onClick={() => handleDownloadSample('csv')}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>نموذج CSV جاهز (.csv)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Paste Mode */
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700">
                        الصق جدول الأسماء مباشرة من برنامج Excel أو نظام نور أو كشف نصي:
                      </label>
                      <textarea
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`مثال:\nاسم الطالب\tالسجل المدني\tالصف\tالشعبة\tجوال ولي الأمر\nعبدالرحمن محمد العتيبي\t1098234561\tالصف الرابع الابتدائي\tأ\t0501234567\nفهد سلطان الدوسري\t1098234562\tالصف الرابع الابتدائي\tب\t0502345678`}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                      />
                      <button
                        onClick={handleProcessPastedText}
                        className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>معالجة النص والانتقال لخيارات التوزيع</span>
                      </button>
                    </div>
                  )}

                  {fileError && (
                    <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Configure & Auto-Distribute */}
              {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>تمت قراءة {rawRows.length} سجلاً من الملف ({fileName || 'الملف المرفوع'}).</span>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs text-emerald-800 hover:underline font-bold"
                    >
                      تغيير الملف
                    </button>
                  </div>

                  {/* Distribution Strategy Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Shuffle className="w-4 h-4 text-emerald-700" />
                      <span>اختر آلية التوزيع التلقائي على الفصول والشعب:</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Balanced Equal Distribution */}
                      <div
                        onClick={() => setStrategy('balanced')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          strategy === 'balanced'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          strategy === 'balanced' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'
                        }`}>
                          {strategy === 'balanced' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-900">توزيع متساوي وتلقائي حسب الصف (مستحسن)</div>
                          <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            يقوم النظام بتوزيع طلاب كل مرحلة دراسية بالتساوي والتناوب على الشُعب المتاحة (مثال: رابع 1 ثم رابع 2).
                          </div>
                        </div>
                      </div>

                      {/* Option 2: Alphabetical Distribution */}
                      <div
                        onClick={() => setStrategy('alphabetical')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          strategy === 'alphabetical'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          strategy === 'alphabetical' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'
                        }`}>
                          {strategy === 'alphabetical' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-900">توزيع أبجدي متوازن (أ-ي)</div>
                          <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            فرز الطلاب أبجدياً وتوزيعهم على الشعب بالتناوب لضمان توازن الحروف الأبجدية والأعداد.
                          </div>
                        </div>
                      </div>

                      {/* Option 3: By File Explicit Section */}
                      <div
                        onClick={() => setStrategy('by_file')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          strategy === 'by_file'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          strategy === 'by_file' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'
                        }`}>
                          {strategy === 'by_file' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-900">حسب الفصل والشعبة المحددة بالملف</div>
                          <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            تسكين كل طالب في الشعبة المذكورة في عمود "الشعبة" أو "الفصل" داخل ملف الإكسل.
                          </div>
                        </div>
                      </div>

                      {/* Option 4: Capacity Limit */}
                      <div
                        onClick={() => setStrategy('capacity')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          strategy === 'capacity'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          strategy === 'capacity' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'
                        }`}>
                          {strategy === 'capacity' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-900">توزيع حسب الطاقة الاستيعابية للفصل</div>
                          <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            تعبئة الفصول تباعاً بحد أقصى لكل فصل (مثال 25 طالب) قبل الانتقال للشعبة التالية.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Capacity sub-input */}
                    {strategy === 'capacity' && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">الحد الأقصى لعدد الطلاب في الفصل الواحد:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={10}
                            max={50}
                            value={capacityLimit}
                            onChange={(e) => setCapacityLimit(parseInt(e.target.value) || 25)}
                            className="w-20 p-2 bg-white border border-slate-200 rounded-xl text-center font-bold font-mono text-emerald-800 outline-none"
                          />
                          <span className="text-slate-500 font-bold">طالب</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duplicates Handling Option */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <label className="block font-black text-slate-800 flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4 text-emerald-700" />
                      <span>خيارات التعامل مع السجلات المكررة (مطابقة السجل المدني / الاسم):</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="duplicates"
                          checked={duplicateHandling === 'merge'}
                          onChange={() => setDuplicateHandling('merge')}
                          className="accent-emerald-700"
                        />
                        <span className="font-bold text-slate-800">تحديث بيانات الطالب ونقل فصله</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="duplicates"
                          checked={duplicateHandling === 'skip_duplicates'}
                          onChange={() => setDuplicateHandling('skip_duplicates')}
                          className="accent-emerald-700"
                        />
                        <span className="font-bold text-slate-800">تجاهل المكرر وعدم تعديله</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="duplicates"
                          checked={duplicateHandling === 'replace'}
                          onChange={() => setDuplicateHandling('replace')}
                          className="accent-emerald-700"
                        />
                        <span className="font-bold text-rose-700">استبدال كامل قائمة الطلاب</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      الرجوع للخلف
                    </button>
                    <button
                      onClick={executeDistribution}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/20 transition flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>تطبيق التوزيع ومعاينة النتائج</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Preview & Confirm */}
              {step === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <div className="text-xl font-black text-emerald-800">{totalImportCount}</div>
                      <div className="text-[11px] font-bold text-emerald-700 mt-0.5">إجمالي الطلاب الموزعين</div>
                    </div>
                    <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200">
                      <div className="text-xl font-black text-blue-800">{uniqueClassesCount}</div>
                      <div className="text-[11px] font-bold text-blue-700 mt-0.5">شعب وفصول مستهدفة</div>
                    </div>
                    <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-200">
                      <div className="text-xl font-black text-teal-800">{avgPerClass}</div>
                      <div className="text-[11px] font-bold text-teal-700 mt-0.5">متوسط الطلاب لكل شعبة</div>
                    </div>
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                      <div className="text-xl font-black text-amber-800">{duplicateCount}</div>
                      <div className="text-[11px] font-bold text-amber-700 mt-0.5">سجلات موجودة مسبقاً</div>
                    </div>
                  </div>

                  {/* Search and Class Filter inside Preview */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <div className="relative w-full">
                        <input
                          type="text"
                          value={previewSearch}
                          onChange={(e) => setPreviewSearch(e.target.value)}
                          placeholder="بحث في الطلاب الموزعين..."
                          className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">تصفية حسب الفصل:</span>
                      <select
                        value={previewFilterClass}
                        onChange={(e) => setPreviewFilterClass(e.target.value)}
                        className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="all">كافة الفصول ({processedStudents.length})</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({processedStudents.filter(s => s.assignedClassId === c.id).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100/90 text-slate-700 font-black sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="p-3 w-12 text-center">#</th>
                            <th className="p-3">اسم الطالب</th>
                            <th className="p-3">السجل المدني</th>
                            <th className="p-3">الصف الدراسي</th>
                            <th className="p-3">الفصل / الشعبة المسندة</th>
                            <th className="p-3">جوال ولي الأمر</th>
                            <th className="p-3">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredPreviewStudents.map((st, idx) => (
                            <tr key={st.tempId} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-900">{st.name}</td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">{st.nationalId}</td>
                              <td className="p-3 text-slate-700 text-[11px]">{st.gradeLevel}</td>
                              <td className="p-3">
                                {/* Editable Class Dropdown in Preview */}
                                <select
                                  value={st.assignedClassId}
                                  onChange={(e) => handleChangeStudentClass(st.tempId, e.target.value)}
                                  className="py-1 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-bold outline-none cursor-pointer hover:bg-emerald-100 transition"
                                >
                                  {classes.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.shortName || c.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">{st.parentPhone}</td>
                              <td className="p-3">
                                {st.isExisting ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                                    موجود مسبقاً
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                                    جديد
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      تعديل خيارات التوزيع
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-700/20 transition flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد اعتماد استيراد وتوزيع {processedStudents.length} طالباً</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
