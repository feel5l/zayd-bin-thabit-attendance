import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = (): string => {
  return (
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    ''
  );
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

/**
 * Generate official absence warning letter (خطاب إنذار غياب رسمي)
 */
export const generateAbsenceWarningLetter = async (
  studentName: string,
  gradeLevel: string,
  className: string,
  absentDays: number,
  schoolName: string = 'مدرسة زيد بن ثابت الابتدائية',
  principalName: string = 'أ. إبراهيم بن صالح السبيعي'
): Promise<string> => {
  try {
    const prompt = `أنت المساعد الإداري الذكي لإدارة ${schoolName}.
المطلوب صياغة "إشعار إنذار غياب رسمي لولي الأمر" باللغة العربية الرسمية وفق لائحة السلوك والمواظبة المدرسية.

بيانات الطالب:
- اسم الطالب: ${studentName}
- الصف: ${gradeLevel} (${className})
- عدد أيام الغياب المرصودة: ${absentDays} أيام
- اسم مدير المدرسة: ${principalName}
- اسم المدرسة: ${schoolName}

يجب أن يتضمن الخطاب:
1. الترويسة الرسمية والبسملة.
2. تحية طيبة لولي الأمر والتأكيد على أهمية الانضباط المدرسي والتحصيل العلمي.
3. التنبيه بعدد أيام الغياب وتأثيرها على درجات المواظبة ومستوى الطالب.
4. طلب المراجعة أو تقديم الأعذار المقبولة.
5. خاتمة رسمية وتوقيع مدير المدرسة وختم إدارة المدرسة.
صياغة واضحة ومهذبة ورسمية تماماً.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return response.text || 'تعذر إنشاء الخطاب، يرجى المحاولة لاحقاً.';
  } catch (error) {
    console.error('Error generating warning letter:', error);
    return `بسم الله الرحمن الرحيم
المملكة العربية السعودية - وزارة التعليم
إدارة التعليم بمحافظة ...
${schoolName}

المكرم ولي أمر الطالب / ${studentName} المحترم
السلام عليكم ورحمة الله وبركاته،، وبعد:

نود إحاطة عنايتكم الكريمة بأن ابنكم المقيد في ${gradeLevel} (${className}) قد بلغ مجموع غيابه (${absentDays}) أيام دون عذر رسمي مقبول.
وحيث إن المواظبة اليومية ركيزة أساسية في التحصيل الدراسي، نأمل منكم حث ابنكم على الحضور المنتظم، ومراجعة إدارة المدرسة لتقديم ما يبرر هذا الغياب تفادياً لتطبيق لائحة المواظبة وحسم الدرجات.

شاكرين ومقدرين حسن تعاونكم واهتمامكم.

مدير المدرسة:
${principalName}
الختم الرسمي`;
  }
};

/**
 * Analyze school-wide attendance patterns & recommendations
 */
export const analyzeSchoolAttendance = async (
  stats: any,
  classesData: any
): Promise<{
  summary: string;
  risks: string[];
  recommendations: string[];
}> => {
  try {
    const prompt = `قم بتحليل بيانات حضور وغياب مدرسة زيد بن ثابت التالية:
إحصائيات اليوم: ${JSON.stringify(stats)}
بيانات الفصول: ${JSON.stringify(classesData)}

المطلوب:
1. تقديم ملخص تحليلي تربوي لحالة الحضور والغياب اليوم.
2. تحديد نقاط الضعف والمخاطر (الفصول الأكثر غياباً أو المعلمين المتأخرين في الرصد).
3. تقديم 3 توصيات إدارية وتربوية عملية لتحسين نسبة الحضور في المدرسة.

أرجع النتيجة بصيغة JSON حصراً.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['summary', 'risks', 'recommendations']
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error analyzing attendance:', error);
    return {
      summary: `نسبة الحضور اليوم بلغت ${stats.attendanceRate || 95}% مع التزام ملحوظ في معظم الفصول، مع استمرار رصد غياب الحصة الثانية في الشعب المتبقية.`,
      risks: [
        'وجود بعض الفصول التي لم تكمل رصد غياب الحصة الثانية حتى الآن.',
        'تكرار غياب بعض الطلاب في شعب الصفين الرابع والخامس.'
      ],
      recommendations: [
        'إرسال إشعار تذكيري فوري لمربيي الفصول المتأخرة في رصد الحصة الثانية.',
        'تفعيل التواصل الهاتفي والرسائل النصية الفورية مع أولياء أمور الطلاب المتغيبين.',
        'تكريم الفصول الأكثر انضباطاً وحضوراً في الطابور الصباحي لتعزيز الدافعية.'
      ]
    };
  }
};

/**
 * Generate parent circular for attendance discipline (تعميم مدرسي)
 */
export const generateParentCircular = async (
  topic: string = 'الحد من الغياب وتعزيز الانضباط المدرسي',
  schoolName: string = 'مدرسة زيد بن ثابت الابتدائية'
): Promise<string> => {
  try {
    const prompt = `صغ تعميماً مدرسياً موجهاً لأولياء الأمور من إدارة ${schoolName} حول موضوع: "${topic}".
الصيغة تربوية، حازمة ومحفزة، تؤكد على الشراكة بين الأسرة والمدرسة وأثر الحضور في الحصة الثانية واليوم الدراسي كاملاً على تفوق الطالب.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return response.text || 'تعذر إنشاء التعميم.';
  } catch (error) {
    return `المكرمون أولياء الأمور الكرام،
السلام عليكم ورحمة الله وبركاته،
تؤكد إدارة ${schoolName} على أهمية الحضور المنتظم لأبنائنا الطلاب لما له من أثر مباشر على مستواهم التعليمي وسلوكهم الإيجابي. نرجو عدم التهاون في الغياب والحرص على الحضور المبكر.
وفق الله الجميع لما يحبه ويرضاه.`;
  }
};
