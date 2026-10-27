import * as XLSX from 'xlsx';
import { Learner, AttendanceRecord, Gender, Violation, CommitmentRecord, Animator } from '../types';

export const exportLearnersToExcel = (learners: Learner[], filename = 'تدبير_المتعلمين_قائمة_المتعلمين_زرارة.xlsx') => {
  const exportData = learners.map((l, index) => ({
    'ت': index + 1,
    'الرقم الداخلي': l.registrationNumber,
    'الاسم الكامل (عربي)': l.arabicName,
    'الاسم الكامل (فرنسي)': l.frenchName,
    'رقم مسار': l.masarCode,
    'الجنس': l.gender,
    'القسم': l.className,
    'الشعبة / الحرفة': l.stream,
    'المستوى السابق': l.previousLevel,
    'هاتف ولي الأمر': l.parentPhone,
    'رقم واتساب': l.whatsapp,
    'العنوان': l.address,
    'الحالة': l.status,
    'المشروع الشخصي': l.personalProject || 'غير محدد',
    'تاريخ التسجيل': l.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المتعلمون');
  
  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (!workbook.Workbook.Views[0]) workbook.Workbook.Views[0] = {};
  workbook.Workbook.Views[0].RTL = true;

  XLSX.writeFile(workbook, filename);
};

export const exportAttendanceReportToExcel = (
  records: AttendanceRecord[],
  learnersMap: Map<string, Learner>,
  filename = 'تدبير_المتعلمين_تقرير_الغيابات_زرارة.xlsx'
) => {
  const exportData = records.map((rec, index) => {
    const learner = learnersMap.get(rec.learnerId);
    return {
      'ت': index + 1,
      'التاريخ': rec.date,
      'الحصة': rec.session,
      'الرقم الداخلي': learner?.registrationNumber || 'غير معروف',
      'اسم المتعلم': learner?.arabicName || 'غير معروف',
      'رقم مسار': learner?.masarCode || '',
      'القسم': learner?.className || '',
      'الشعبة': learner?.stream || '',
      'حالة الحضور': rec.status,
      'السبب / ملاحظات': rec.reason || '-',
      'هاتف ولي الأمر': learner?.parentPhone || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الغيابات');

  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (!workbook.Workbook.Views[0]) workbook.Workbook.Views[0] = {};
  workbook.Workbook.Views[0].RTL = true;

  XLSX.writeFile(workbook, filename);
};

export const downloadLearnersTemplate = () => {
  const templateData = [
    {
      'الاسم الكامل': 'أحمد السوسي',
      'رقم مسار': 'G130000001',
      'الجنس': 'ذكر',
      'القسم': 'القسم 1 - تكوين أساسي',
      'الشعبة': 'المعلوماتيات والرقمنة',
      'الهاتف والواتساب': '0661000000',
      'الاسم بالفرنسية': 'Ahmed Essoussi',
      'المستوى السابق': 'الثالثة إعدادي',
      'العنوان': 'زيرارة المركز',
      'المشروع الشخصي': 'التكوين المهني',
    },
    {
      'الاسم الكامل': 'ليلى العمراني',
      'رقم مسار': 'G130000002',
      'الجنس': 'أنثى',
      'القسم': 'القسم 2 - مهني مستوى 1',
      'الشعبة': 'الحلاقة والخياطة',
      'الهاتف والواتساب': '0662000000',
      'الاسم بالفرنسية': 'Laila El Amrani',
      'المستوى السابق': 'السادسة ابتدائي',
      'العنوان': 'حي الأمل زيرارة',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_استيراد_المتعلمين');
  XLSX.writeFile(workbook, 'تدبير_المتعلمين_نموذج_الاستيراد_زرارة.xlsx');
};

export interface ParsedImportResult {
  validLearners: Partial<Learner>[];
  errors: string[];
  ignoredCount: number;
  discoveredClasses: string[];
  discoveredStreams: string[];
}

/**
 * Normalize phone numbers to restore leading zero if removed by Excel
 * e.g., "661234567" (9 digits) -> "0661234567"
 */
const normalizePhone = (raw: any): string => {
  if (!raw) return '';
  let str = String(raw).trim().replace(/\s+/g, '');
  // If Excel parsed 0661234567 as number 661234567 (9 digits starting with 6 or 7)
  if (str.length === 9 && (str.startsWith('6') || str.startsWith('7') || str.startsWith('5'))) {
    str = '0' + str;
  }
  return str;
};

/**
 * Normalize gender values
 * ذ / ذكر / m / M -> ذكر
 * أ / أنثى / f / F -> أنثى
 */
const normalizeGender = (raw: any): Gender => {
  if (!raw) return 'ذكر';
  const val = String(raw).trim().toLowerCase();
  if (
    val === 'ذ' || 
    val.includes('ذكر') || 
    val === 'm' || 
    val === 'male' || 
    val === 'homme' || 
    val === 'h'
  ) {
    return 'ذكر';
  }
  if (
    val === 'أ' || 
    val.includes('أنثى') || 
    val.includes('انثى') || 
    val === 'f' || 
    val === 'female' || 
    val === 'femme'
  ) {
    return 'أنثى';
  }
  return 'ذكر';
};

export const parseLearnersFile = (file: File, existingLearners: Learner[] = []): Promise<ParsedImportResult> => {
  return new Promise((resolve, reject) => {
    // Check old .xls format
    if (file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.xlsx')) {
      reject(new Error('صيغة .xls القديمة غير مدعومة مباشرة. يرجى فتح الملف في برمجية Excel وحفظه بصيغة .xlsx أولاً.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse array of arrays first to inspect headers
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length === 0) {
          reject(new Error('الملف المختار فارغ، يرجى اختيار ملف يحتوي على بيانات المتعلمين.'));
          return;
        }

        const existingMasars = new Set(
          existingLearners.map((l) => l.masarCode.toUpperCase().trim())
        );

        const validLearners: Partial<Learner>[] = [];
        const errors: string[] = [];
        let ignoredCount = 0;

        const discoveredClassesSet = new Set<string>();
        const discoveredStreamsSet = new Set<string>();

        // Header detection logic
        const firstRow = rows[0] || [];
        const headerIndexMap: Record<string, number> = {};

        firstRow.forEach((cellVal: any, colIdx: number) => {
          if (!cellVal) return;
          const cellStr = String(cellVal).trim().toLowerCase();

          if (
            cellStr.includes('اسم') || 
            cellStr.includes('nom') || 
            cellStr.includes('name')
          ) {
            if (cellStr.includes('فرنس') || cellStr.includes('french')) {
              headerIndexMap['frenchName'] = colIdx;
            } else {
              headerIndexMap['arabicName'] = colIdx;
            }
          } else if (
            cellStr.includes('مسار') || 
            cellStr.includes('cne') || 
            cellStr.includes('code') || 
            cellStr.includes('masar')
          ) {
            headerIndexMap['masarCode'] = colIdx;
          } else if (
            cellStr.includes('جنس') || 
            cellStr.includes('sexe') || 
            cellStr.includes('gender')
          ) {
            headerIndexMap['gender'] = colIdx;
          } else if (
            cellStr.includes('قسم') || 
            cellStr.includes('مجموعة') || 
            cellStr.includes('class') || 
            cellStr.includes('group')
          ) {
            headerIndexMap['className'] = colIdx;
          } else if (
            cellStr.includes('شعب') || 
            cellStr.includes('حرف') || 
            cellStr.includes('stream') || 
            cellStr.includes('option')
          ) {
            headerIndexMap['stream'] = colIdx;
          } else if (
            cellStr.includes('هاتف') || 
            cellStr.includes('واتساب') || 
            cellStr.includes('phone') || 
            cellStr.includes('tel')
          ) {
            headerIndexMap['phone'] = colIdx;
          } else if (
            cellStr.includes('عنوان') || 
            cellStr.includes('adresse') || 
            cellStr.includes('address')
          ) {
            headerIndexMap['address'] = colIdx;
          } else if (
            cellStr.includes('مشروع') || 
            cellStr.includes('personal') || 
            cellStr.includes('project')
          ) {
            headerIndexMap['personalProject'] = colIdx;
          }
        });

        const hasHeaders = Object.keys(headerIndexMap).length >= 2;
        const startDataRow = hasHeaders ? 1 : 0;

        for (let i = startDataRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let arabicName = '';
          let frenchName = '';
          let masarCode = '';
          let genderRaw = '';
          let className = '';
          let stream = '';
          let phoneRaw = '';
          let address = '';

          let personalProject: string = 'غير محدد';
          if (hasHeaders) {
            arabicName = headerIndexMap['arabicName'] !== undefined ? row[headerIndexMap['arabicName']] : '';
            frenchName = headerIndexMap['frenchName'] !== undefined ? row[headerIndexMap['frenchName']] : '';
            masarCode = headerIndexMap['masarCode'] !== undefined ? row[headerIndexMap['masarCode']] : '';
            genderRaw = headerIndexMap['gender'] !== undefined ? row[headerIndexMap['gender']] : '';
            className = headerIndexMap['className'] !== undefined ? row[headerIndexMap['className']] : '';
            phoneRaw = headerIndexMap['phone'] !== undefined ? row[headerIndexMap['phone']] : '';
            address = headerIndexMap['address'] !== undefined ? row[headerIndexMap['address']] : '';
            const projRaw = headerIndexMap['personalProject'] !== undefined ? row[headerIndexMap['personalProject']] : '';
            personalProject = String(projRaw || 'غير محدد').trim();
          } else {
            // Positional fallback
            arabicName = row[0] || '';
            masarCode = row[1] || '';
            genderRaw = row[2] || '';
            className = row[3] || '';
            stream = row[4] || '';
            phoneRaw = row[5] || '';
            personalProject = String(row[6] || 'غير محدد');
          }

          // Clean values
          const cleanName = String(arabicName || '').trim();
          let cleanMasar = String(masarCode || '').trim().toUpperCase();

          // Ignore row if no name
          if (!cleanName) {
            ignoredCount++;
            continue;
          }

          // Auto-generate temporary MASAR if missing
          if (!cleanMasar) {
            cleanMasar = `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          }

          // Duplicate check
          if (existingMasars.has(cleanMasar)) {
            ignoredCount++;
            errors.push(`السطر ${i + 1}: تم تجادُل المتعلم (${cleanName}) لأن رقم مسار (${cleanMasar}) مكرر وموجود سابقاً.`);
            continue;
          }

          // Mark MASAR as seen in current import
          existingMasars.add(cleanMasar);

          const cleanGender = normalizeGender(genderRaw);
          const cleanPhone = normalizePhone(phoneRaw);
          const cleanClass = String(className || 'القسم 1 - تكوين أساسي').trim();
          const cleanStream = String(stream || 'المعلوماتيات والرقمنة').trim();

          if (cleanClass) discoveredClassesSet.add(cleanClass);
          if (cleanStream) discoveredStreamsSet.add(cleanStream);

          validLearners.push({
            arabicName: cleanName,
            frenchName: String(frenchName || '').trim(),
            masarCode: cleanMasar,
            gender: cleanGender,
            className: cleanClass,
            stream: cleanStream,
            previousLevel: 'إعدادي',
            parentPhone: cleanPhone,
            whatsapp: cleanPhone,
            address: String(address || 'زيرارة').trim(),
            status: 'نشط',
            personalProject: personalProject as any,
          });
        }

        resolve({
          validLearners,
          errors,
          ignoredCount,
          discoveredClasses: Array.from(discoveredClassesSet),
          discoveredStreams: Array.from(discoveredStreamsSet),
        });
      } catch (err: any) {
        reject(new Error('فشل قراءة الملف. يرجى التأكد من اختيار ملف Excel (.xlsx) أو CSV صحيح.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('حدث خطأ أثناء قراءة الملف من الجهاز.'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export const exportViolationsToExcel = (
  violations: Violation[],
  filename = 'تدبير_المتعلمين_سجل_المخالفات_زرارة.xlsx'
) => {
  const exportData = violations.map((v, index) => ({
    'ت': index + 1,
    'رقم المخالفة': v.violationNumber,
    'رقم التسجيل': v.registrationNumber,
    'اسم المتعلم': v.learnerName,
    'القسم': v.className,
    'الشعبة / الحرفة': v.stream,
    'التاريخ': v.date,
    'التوقيت': v.time || '-',
    'نوع المخالفة': v.type,
    'مكان الحدوث': v.location || '-',
    'تفاصيل المخالفة': v.description,
    'الإجراء المتخذ': v.actionTaken,
    'الحالة': v.status,
    'القائم بالتسجيل': v.recordedBy || '-',
    'ملاحظات': v.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل المخالفات');

  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (!workbook.Workbook.Views[0]) workbook.Workbook.Views[0] = {};
  workbook.Workbook.Views[0].RTL = true;

  XLSX.writeFile(workbook, filename);
};

export const exportViolationsToCsv = (
  violations: Violation[],
  filename = 'تدبير_المتعلمين_سجل_المخالفات_زرارة.csv'
) => {
  const headers = [
    'ت',
    'رقم المخالفة',
    'رقم التسجيل',
    'اسم المتعلم',
    'القسم',
    'الشعبة',
    'التاريخ',
    'التوقيت',
    'نوع المخالفة',
    'مكان الحدوث',
    'تفاصيل المخالفة',
    'الإجراء المتخذ',
    'الحالة',
    'القائم بالتسجيل',
    'ملاحظات',
  ];

  const rows = violations.map((v, index) => [
    index + 1,
    `"${v.violationNumber}"`,
    `"${v.registrationNumber}"`,
    `"${v.learnerName.replace(/"/g, '""')}"`,
    `"${v.className.replace(/"/g, '""')}"`,
    `"${v.stream.replace(/"/g, '""')}"`,
    `"${v.date}"`,
    `"${v.time || ''}"`,
    `"${v.type.replace(/"/g, '""')}"`,
    `"${(v.location || '').replace(/"/g, '""')}"`,
    `"${v.description.replace(/"/g, '""')}"`,
    `"${v.actionTaken.replace(/"/g, '""')}"`,
    `"${v.status}"`,
    `"${(v.recordedBy || '').replace(/"/g, '""')}"`,
    `"${(v.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCommitmentsToExcel = (
  commitments: CommitmentRecord[],
  filename = 'تدبير_المتعلمين_سجل_الالتزامات_زرارة.xlsx'
) => {
  const exportData = commitments.map((c, index) => ({
    'ت': index + 1,
    'رقم الوثيقة': c.commitmentNumber,
    'الرقم الداخلي': c.registrationNumber,
    'اسم المتعلم': c.learnerName,
    'القسم': c.className,
    'الشعبة': c.stream,
    'تاريخ التحرير': c.date,
    'المخالفة المرتبطة': c.violationNumber || 'التزام عام',
    'الحالة': c.status,
    'ولي الأمر': c.guardianName || '',
    'هاتف ولي الأمر': c.guardianPhone || '',
    'ب.ت.و ولي الأمر': c.guardianCin || '',
    'ملاحظات المتابعة': c.notes || '',
    'تاريخ آخر متابعة': c.lastFollowUpDate || '',
    'المسؤول المسجل': c.recordedBy || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل الالتزامات');

  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (!workbook.Workbook.Views[0]) workbook.Workbook.Views[0] = {};
  workbook.Workbook.Views[0].RTL = true;

  XLSX.writeFile(workbook, filename);
};

export const exportCommitmentsToCsv = (
  commitments: CommitmentRecord[],
  filename = 'تدبير_المتعلمين_سجل_الالتزامات_زرارة.csv'
) => {
  const headers = [
    'ت',
    'رقم الوثيقة',
    'الرقم الداخلي',
    'اسم المتعلم',
    'القسم',
    'الشعبة',
    'تاريخ التحرير',
    'المخالفة المرتبطة',
    'الحالة',
    'ولي الأمر',
    'هاتف ولي الأمر',
    'ب.ت.و ولي الأمر',
    'ملاحظات المتابعة',
    'تاريخ آخر متابعة',
    'المسؤول المسجل',
  ];

  const rows = commitments.map((c, index) => [
    index + 1,
    `"${c.commitmentNumber}"`,
    `"${c.registrationNumber}"`,
    `"${c.learnerName.replace(/"/g, '""')}"`,
    `"${c.className.replace(/"/g, '""')}"`,
    `"${c.stream.replace(/"/g, '""')}"`,
    `"${c.date}"`,
    `"${c.violationNumber || 'التزام عام'}"`,
    `"${c.status}"`,
    `"${(c.guardianName || '').replace(/"/g, '""')}"`,
    `"${(c.guardianPhone || '').replace(/"/g, '""')}"`,
    `"${(c.guardianCin || '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`,
    `"${c.lastFollowUpDate || ''}"`,
    `"${(c.recordedBy || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAnimatorsToExcel = (
  animators: Animator[],
  filename = 'تدبير_المنشطين_مركز_زرارة.xlsx'
) => {
  const exportData = animators.map((a, index) => ({
    'ت': index + 1,
    'الرقم التعريفي': a.registrationNumber,
    'الاسم الكامل (عربي)': a.arabicName,
    'الاسم الكامل (فرنسي)': a.frenchName || '-',
    'نوع النشاط': a.activityType,
    'التخصص / مجال التكوين': a.specialty,
    'الأقسام المسندة': a.assignedClasses.join('، ') || 'غير محدد',
    'الشعب المسندة': a.assignedStreams.join('، ') || 'غير محدد',
    'رقم الهاتف': a.phone,
    'البريد الإلكتروني': a.email || '-',
    'تاريخ بداية العمل': a.startDate,
    'الوضعية المهنية': a.status,
    'ملاحظات إدارية': a.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المنشطون');

  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (!workbook.Workbook.Views[0]) workbook.Workbook.Views[0] = {};
  workbook.Workbook.Views[0].RTL = true;

  XLSX.writeFile(workbook, filename);
};

