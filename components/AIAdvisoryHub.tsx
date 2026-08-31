import React, { useState } from 'react';
import { SchoolSettings, User } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { analyzeSchoolAttendance, generateParentCircular, generateAbsenceWarningLetter } from '../services/geminiService';
import { getTodayDateString } from '../services/initialData';
import { 
  Sparkles, 
  AlertTriangle, 
  FileText, 
  Send, 
  RefreshCw, 
  Printer, 
  Check, 
  Copy, 
  Lightbulb, 
  TrendingUp, 
  ShieldCheck,
  UserX,
  MessageSquare
} from 'lucide-react';

interface AIAdvisoryHubProps {
  currentUser: User;
  settings: SchoolSettings;
}

export const AIAdvisoryHub: React.FC<AIAdvisoryHubProps> = ({ currentUser, settings }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analysis' | 'circular' | 'warning'>('analysis');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    risks: string[];
    recommendations: string[];
  } | null>(null);

  // Circular generator state
  const [circularTopic, setCircularTopic] = useState('الحد من ظاهرة الغياب وتعزيز الانضباط المدرسي');
  const [isGeneratingCircular, setIsGeneratingCircular] = useState(false);
  const [generatedCircular, setGeneratedCircular] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Warning Letter State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);

  const stats = AttendanceService.getTodaySchoolStats(getTodayDateString());
  const students = AttendanceService.getStudents();
  const classes = AttendanceService.getClasses();

  // Run AI Analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeSchoolAttendance(stats, stats.classStatuses);
      setAnalysisResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate Circular
  const handleGenerateCircular = async () => {
    setIsGeneratingCircular(true);
    try {
      const text = await generateParentCircular(circularTopic, settings.schoolName);
      setGeneratedCircular(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCircular(false);
    }
  };

  // Generate Warning Letter
  const handleGenerateLetter = async () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    setIsGeneratingLetter(true);
    try {
      const history = AttendanceService.getStudentHistory(student.id);
      const text = await generateAbsenceWarningLetter(
        student.name,
        student.gradeLevel,
        student.className,
        history.absentDays + history.excusedDays,
        settings.schoolName,
        settings.principalName
      );
      setGeneratedLetter(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-6 rounded-3xl text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <Sparkles className="w-8 h-8 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black font-brand">المساعد الإداري الذكي (AI)</h2>
              <span className="bg-purple-500/30 text-purple-200 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-400/30">
                مدعوم بنماذج Gemini الذكية
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-1">
              تحليل عميق لأنماط الغياب، كشف مؤشرات الخطر المبكرة، وصياغة التعاميم والإنذارات الرسمية
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('analysis')}
            className={`px-4 py-2 rounded-xl transition ${activeSubTab === 'analysis' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-200 hover:text-white'}`}
          >
            التحليل والتشخيص
          </button>
          <button
            onClick={() => setActiveSubTab('circular')}
            className={`px-4 py-2 rounded-xl transition ${activeSubTab === 'circular' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-200 hover:text-white'}`}
          >
            صانع التعاميم
          </button>
          <button
            onClick={() => setActiveSubTab('warning')}
            className={`px-4 py-2 rounded-xl transition ${activeSubTab === 'warning' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-200 hover:text-white'}`}
          >
            إنذارات الغياب
          </button>
        </div>
      </div>

      {/* Subtab 1: Automated Attendance Diagnostics */}
      {activeSubTab === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black font-brand text-slate-900">تشخيص حضور المدرسة وتوصيات الإدارة</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد تقرير استشاري فوري مبني على نسب حضور الفصول وأداء رصد الحصة الثانية
              </p>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-700/20 transition flex items-center gap-2"
            >
              {isAnalyzing ? (
                <span>جاري معالجة البيانات...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>بدء التحليل الذكي الآن</span>
                </>
              )}
            </button>
          </div>

          {analysisResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in">
              {/* Summary */}
              <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-sm space-y-3 md:col-span-3">
                <div className="flex items-center gap-2 text-purple-900 font-black text-sm">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <h4>الملخص التنفيذي لحالة الانضباط المدرسي</h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-purple-50/60 p-4 rounded-2xl border border-purple-100 font-medium">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Risks */}
              <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <h4>مؤشرات الخطر والقصور</h4>
                </div>
                <ul className="space-y-2 text-xs text-rose-800">
                  {analysisResult.risks.map((risk, idx) => (
                    <li key={idx} className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-3 md:col-span-2">
                <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                  <Lightbulb className="w-5 h-5 text-emerald-600" />
                  <h4>التوصيات والخطوات الإجرائية المقترحة</h4>
                </div>
                <div className="space-y-2">
                  {analysisResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2.5 font-medium">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">انقر على "بدء التحليل الذكي الآن" لتوليد التقرير الاستشاري</p>
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Circular Generator */}
      {activeSubTab === 'circular' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-black font-brand text-slate-900">صياغة تعميم مدرسي لأولياء الأمور</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              توليد تعميم رسمي موجه لأولياء الأمور يعزز الانضباط ويحث على الحضور في الحصة الثانية واليوم الدراسي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-xs font-bold text-slate-700 mb-1">موضوع التعميم أو الهدف التربوي</label>
              <input
                type="text"
                value={circularTopic}
                onChange={(e) => setCircularTopic(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <button
              onClick={handleGenerateCircular}
              disabled={isGeneratingCircular}
              className="mt-5 px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-700/20 transition flex items-center gap-2"
            >
              {isGeneratingCircular ? (
                <span>جاري الكتابة...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>توليد التعميم</span>
                </>
              )}
            </button>
          </div>

          {generatedCircular && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">نص التعميم المعتمد:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(generatedCircular)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ التعميم'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-xl text-xs font-bold hover:bg-purple-200 transition flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 whitespace-pre-wrap text-xs font-sans text-slate-800 leading-relaxed">
                {generatedCircular}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Warning Letter Generator */}
      {activeSubTab === 'warning' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-black font-brand text-slate-900">إصدار إنذار غياب رسمي لطالب</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              توليد خطاب إنذار مخصص وفق عدد أيام الغياب ولائحة السلوك والمواظبة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-xs font-bold text-slate-700 mb-1">حدد الطالب المراد إنذاره</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="">-- اختر الطالب --</option>
                {students.map(st => {
                  const history = AttendanceService.getStudentHistory(st.id);
                  return (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.className}) — غياب: {history.absentDays + history.excusedDays} أيام
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={handleGenerateLetter}
              disabled={isGeneratingLetter || !selectedStudentId}
              className="mt-5 px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-700/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingLetter ? (
                <span>جاري الصياغة...</span>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>توليد خطاب الإنذار</span>
                </>
              )}
            </button>
          </div>

          {generatedLetter && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">معاينة الخطاب الرسمي:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(generatedLetter)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ الخطاب'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold hover:bg-rose-200 transition flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الخطاب المعتمد</span>
                  </button>
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 whitespace-pre-wrap text-xs font-sans text-slate-800 leading-relaxed">
                {generatedLetter}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
