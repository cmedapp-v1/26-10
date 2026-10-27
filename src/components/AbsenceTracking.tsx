import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert,
  FileText,
  Clock,
  Search,
  Calendar,
  Filter,
  Printer,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  FileEdit,
  School,
  X,
  AlertCircle,
  Stethoscope,
  History
} from 'lucide-react';
import { Learner, AttendanceRecord, AttendanceStatus, AppSettings, ScheduledSession, ExitPaper, InfirmaryVisit } from '../types';
import { exportAttendanceReportToExcel } from '../utils/excelImportExport';
import { generateNextExitPaperNumber, generateNextInfirmaryVisitNumber } from '../utils/storage';
import { InfirmaryModal } from './InfirmaryModal';
import { ExitPaperModal } from './ExitPaperModal';
import { ConfirmDialog } from './ConfirmDialog';

interface AbsenceTrackingProps {
  learners: Learner[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  schedule: ScheduledSession[];
  settings: AppSettings;
  onOpenViolations?: () => void;
  violationsCount?: number;
  exitPapers: ExitPaper[];
  setExitPapers: React.Dispatch<React.SetStateAction<ExitPaper[]>>;
  infirmaryVisits: InfirmaryVisit[];
  setInfirmaryVisits: React.Dispatch<React.SetStateAction<InfirmaryVisit[]>>;
}

export const AbsenceTracking: React.FC<AbsenceTrackingProps> = ({
  learners,
  attendance,
  setAttendance,
  schedule = [],
  settings,
  onOpenViolations,
  violationsCount = 0,
  exitPapers,
  setExitPapers,
  infirmaryVisits,
  setInfirmaryVisits,
}) => {
  // Learners Map
  const learnersMap = useMemo(() => {
    const map = new Map<string, Learner>();
    learners.forEach((l) => map.set(l.id, l));
    return map;
  }, [learners]);

  // Filters State
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('all_non_present');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sub-tabs state
  type SubTabType = 'absences' | 'exit-papers' | 'infirmary' | 'return-tracking' | 'stats';
  const [activeSubTab, setActiveTabInternal] = useState<SubTabType>('absences');

  // Justify Modal state
  const [justifyingRecord, setJustifyingRecord] = useState<AttendanceRecord | null>(null);
  const [justificationReason, setJustificationReason] = useState('');

  // WhatsApp Entry Slip Modal state
  const [whatsappSlipRecord, setWhatsappSlipRecord] = useState<AttendanceRecord | null>(null);
  const [whatsappSlipText, setWhatsappSlipText] = useState('');
  const [returnDateInput, setReturnDateInput] = useState(() => new Date().toISOString().split('T')[0]);

  // Animator WhatsApp Notification Modal state
  const [animatorWhatsappRecord, setAnimatorWhatsappRecord] = useState<AttendanceRecord | null>(null);
  const [animatorWhatsappText, setAnimatorWhatsappText] = useState('');
  const [targetAnimatorPhone, setTargetAnimatorPhone] = useState('');
  const [targetAnimatorName, setTargetAnimatorName] = useState('');
  const [matchedSessionInfo, setMatchedSessionInfo] = useState<string>('');

  // Infirmary/Exit Modals
  const [showInfirmaryModal, setShowInfirmaryModal] = useState(false);
  const [showExitPaperModal, setShowExitPaperModal] = useState(false);

  // Print states
  const [printingExitPaper, setPrintingExitPaper] = useState<ExitPaper | null>(null);
  const [printingInfirmaryVisit, setPrintingInfirmaryVisit] = useState<InfirmaryVisit | null>(null);

  // Correction Modal state
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatus>('حاضر');
  const [correctionReason, setCorrectionReason] = useState('');

  // Confirmation Modals State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return attendance.filter((rec) => {
      const learner = learnersMap.get(rec.learnerId);
      if (!learner) return false;

      // Filter out 'حاضر' unless explicitly chosen or all non-present
      if (statusFilter === 'all_non_present' && rec.status === 'حاضر') {
        return false;
      }
      if (statusFilter !== 'all_non_present' && statusFilter !== 'all' && rec.status !== statusFilter) {
        return false;
      }

      const matchesDate = rec.date >= startDate && rec.date <= endDate;
      const matchesClass = classFilter === 'all' || learner.className === classFilter;
      const matchesSearch =
        learner.arabicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        learner.masarCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        learner.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesClass && matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, learnersMap, startDate, endDate, statusFilter, classFilter, searchTerm]);

  // Statistics counters
  const stats = useMemo(() => {
    let totalAbsences = 0;
    let totalLates = 0;
    let totalExcused = 0;

    filteredRecords.forEach((r) => {
      if (r.status === 'غائب') totalAbsences++;
      else if (r.status === 'متأخر') totalLates++;
      else if (r.status === 'غياب مبرر') totalExcused++;
    });

    return { totalAbsences, totalLates, totalExcused, totalRecords: filteredRecords.length };
  }, [filteredRecords]);

  // Handle Justify or Revoke Justification
  const handleConfirmJustification = (reason: string = justificationReason) => {
    openConfirm(
      'تأكيد تبرير الغياب',
      'هل أنت متأكد من أنك تريد حفظ تبرير هذا الغياب؟',
      () => executeConfirmJustification(reason),
      'info'
    );
  };

  const executeConfirmJustification = (reason: string = justificationReason) => {
    if (!justifyingRecord) return;

    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === justifyingRecord.id) {
          return {
            ...rec,
            status: 'غياب مبرر' as AttendanceStatus,
            reason: reason.trim() || 'تم التبرير بشهادة / عذر مقبول',
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );

    setJustifyingRecord(null);
    setJustificationReason('');
  };

  const handleRevokeJustification = (record: AttendanceRecord) => {
    openConfirm(
      'تأكيد إلغاء التبرير',
      'هل أنت متأكد من أنك تريد إلغاء تبرير هذا الغياب؟ سيتم إعادة حالة المتعلم إلى "غائب".',
      () => executeRevokeJustification(record),
      'warning'
    );
  };

  // Handle Record Correction
  const handleConfirmCorrection = () => {
    if (!correctingRecord) return;

    openConfirm(
      'تأكيد تصحيح التسجيل',
      'هل أنت متأكد من أنك تريد تعديل حالة الحضور لهذا التسجيل؟ قد يؤثر ذلك على التقارير والإحصائيات.',
      () => executeConfirmCorrection(),
      'warning'
    );
  };

  const executeConfirmCorrection = () => {
    if (!correctingRecord) return;

    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === correctingRecord.id) {
          return {
            ...rec,
            status: correctionStatus,
            reason: correctionReason.trim() || rec.reason,
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );

    setCorrectingRecord(null);
    setCorrectionReason('');
  };

  const executeRevokeJustification = (record: AttendanceRecord) => {
    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === record.id) {
          return {
            ...rec,
            status: 'غائب' as AttendanceStatus,
            reason: 'تم إلغاء التبرير',
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );
  };

  // Trigger browser print
  const handlePrintReport = () => {
    window.print();
  };

  const handlePrintExitPaper = (paper: ExitPaper) => {
    setPrintingExitPaper(paper);
    setTimeout(() => {
      window.print();
      setPrintingExitPaper(null);
    }, 100);
  };

  const handlePrintInfirmaryVisit = (visit: InfirmaryVisit) => {
    setPrintingInfirmaryVisit(visit);
    setTimeout(() => {
      window.print();
      setPrintingInfirmaryVisit(null);
    }, 100);
  };

  // Handle WhatsApp Entry Slip Modal
  const handleOpenWhatsappSlip = (record: AttendanceRecord) => {
    const learner = learnersMap.get(record.learnerId);
    if (!learner) return;

    const defReturnDate = new Date().toISOString().split('T')[0];
    setReturnDateInput(defReturnDate);

    const defaultMsg = `السلام عليكم ورحمة الله وبركاته،\n\nنخبركم بأنه تم قبول تبرير الغياب الخاص بالمتعلم(ة) *${learner.arabicName}*، بمركز الفرصة الثانية الجيل الجديد زرارة، عن تاريخ *${record.date}*.\n\nيمكن للمتعلم(ة) الالتحاق بالمركز ابتداءً من *${defReturnDate}*، مع الالتزام بالنظام الداخلي للمركز والمواظبة على الحضور.\n\nمع تحيات إدارة مركز الفرصة الثانية الجيل الجديد زرارة.`;

    setWhatsappSlipRecord(record);
    setWhatsappSlipText(defaultMsg);
  };

  const handleSendWhatsappSlip = () => {
    if (!whatsappSlipRecord) return;
    const learner = learnersMap.get(whatsappSlipRecord.learnerId);
    if (!learner || !learner.whatsapp) return;

    const cleanPhone = learner.whatsapp.replace(/^0/, '');
    const url = `https://wa.me/212${cleanPhone}?text=${encodeURIComponent(whatsappSlipText)}`;
    
    // Open WhatsApp
    window.open(url, '_blank');

    // Mark as prepared/sent date
    const todayStr = new Date().toISOString().split('T')[0];
    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === whatsappSlipRecord.id) {
          return {
            ...rec,
            entrySlipWhatsappSent: true,
            entrySlipSentDate: todayStr,
            returnDate: returnDateInput,
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );

    setWhatsappSlipRecord(null);
  };

  const handleToggleMarkSent = (record: AttendanceRecord) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === record.id) {
          const newState = !rec.entrySlipWhatsappSent;
          return {
            ...rec,
            entrySlipWhatsappSent: newState,
            entrySlipSentDate: newState ? todayStr : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );
  };

  // Helper to determine day of week name in Arabic from YYYY-MM-DD
  const getDayNameInArabic = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dayIdx = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const map: Record<number, string> = {
        0: 'الأحد',
        1: 'الاثنين',
        2: 'الثلاثاء',
        3: 'الأربعاء',
        4: 'الخميس',
        5: 'الجمعة',
        6: 'السبت',
      };
      return map[dayIdx] || 'الاثنين';
    } catch {
      return 'الاثنين';
    }
  };

  const handleOpenAnimatorWhatsapp = (record: AttendanceRecord) => {
    const learner = learnersMap.get(record.learnerId);
    if (!learner) return;

    // Find matching session in schedule based on date dayOfWeek and learner's class/stream
    const dayName = getDayNameInArabic(record.date);
    const matchingSessions = schedule.filter((s) => {
      const matchesDay = s.dayOfWeek === dayName;
      const matchesClass = s.classes.includes('الكل') || s.classes.includes(learner.className);
      const matchesTime = s.timeSlot === record.session;
      return matchesDay && matchesClass && matchesTime;
    });

    let chosenSession = matchingSessions[0] || schedule.find((s) => s.dayOfWeek === dayName && (s.classes.includes('الكل') || s.classes.includes(learner.className)));

    const animatorName = chosenSession?.animator || 'أستاذ(ة) المادة';
    const subjectName = chosenSession?.subject || record.session;
    // Map animator name to phone if stored in settings or sample
    // In our sample data, animators have names like 'أ. مصطفى التازي'. Let's provide a default professional phone or check if we store it.
    const animatorPhoneMap: Record<string, string> = {
      'أ. مصطفى التازي': '0661112233',
      'أ. حكيم بناني': '0662223344',
      'أ. نادية العمراني': '0663334455',
      'أ. خديجة العبدلاوي': '0664445566',
      'أ. طارق التازي': '0665556677',
    };
    const animatorPhone = animatorPhoneMap[animatorName] || '0661000000';

    setTargetAnimatorName(animatorName);
    setTargetAnimatorPhone(animatorPhone);
    setMatchedSessionInfo(`الحصة: ${subjectName} (${record.session}) · القسم: ${learner.className} · الشعبة: ${learner.stream}`);

    const defaultMsg = `السلام عليكم,\n\nنخبركم بأن المتعلم(ة) *${learner.arabicName}*، المنتمي(ة) إلى القسم *${learner.className}* والشعبة *${learner.stream}*، قد تم قبول تبرير غيابه(ها) عن حصة يوم *${record.date}* (${record.session}).\n\nيرجى أخذ هذا التبرير بعين الاعتبار في تتبع الحضور والغياب الخاص بالحصة المعنية.\n\nمع تحيات إدارة مركز الفرصة الثانية الجيل الجديد زرارة.`;

    setAnimatorWhatsappRecord(record);
    setAnimatorWhatsappText(defaultMsg);
  };

  const handleSendAnimatorWhatsapp = () => {
    if (!animatorWhatsappRecord) return;
    if (!targetAnimatorPhone) return;

    const cleanPhone = targetAnimatorPhone.replace(/^0/, '');
    const url = `https://wa.me/212${cleanPhone}?text=${encodeURIComponent(animatorWhatsappText)}`;
    window.open(url, '_blank');

    const todayStr = new Date().toISOString().split('T')[0];
    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === animatorWhatsappRecord.id) {
          return {
            ...rec,
            animatorWhatsappSent: true,
            animatorSentDate: todayStr,
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );

    setAnimatorWhatsappRecord(null);
  };

  const handleToggleAnimatorMarkSent = (record: AttendanceRecord) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === record.id) {
          const newState = !rec.animatorWhatsappSent;
          return {
            ...rec,
            animatorWhatsappSent: newState,
            animatorSentDate: newState ? todayStr : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return rec;
      })
    );
  };

  const PrintHeader = () => (
    <div className="flex justify-between items-start w-full mb-8 border-b-2 border-black pb-4 text-[10px] sm:text-xs">
      <div className="flex items-center gap-2">
        {settings.ministryLogoDataURL && (
          <img 
            src={settings.ministryLogoDataURL} 
            alt="Logo" 
            className="h-14 w-auto object-contain"
          />
        )}
        <div className="text-right space-y-0.5">
          <p className="font-bold">المملكة المغربية</p>
          <p>وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل</p>
          <p>المديرية الإقليمية الصخيرات تمارة</p>
        </div>
      </div>
      
      <div className="text-center self-center">
        {settings.schoolLogoDataURL && (
          <img 
            src={settings.schoolLogoDataURL} 
            alt="School Logo" 
            className="h-10 mx-auto mb-1 object-contain"
          />
        )}
        <p className="font-bold text-[8px] opacity-70">نظام تدبير المركز</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-left space-y-0.5 flex flex-col items-end">
          <p className="font-bold text-left">الهيئة المغربية للتربية والتنمية</p>
          <p className="text-left">مدرسة الفرصة الثانية الجيل الجديد زرارة</p>
          <p className="italic text-left">إدارة المركز</p>
        </div>
        {settings.associationLogoDataURL && (
          <img 
            src={settings.associationLogoDataURL} 
            alt="Assoc Logo" 
            className="h-14 w-auto object-contain"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn relative">
      
      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmLabel="نعم، متأكد"
        cancelLabel="إلغاء"
      />
      
      {/* Printable Exit Paper (A4 Portrait, 2 copies) */}
      {printingExitPaper && (
        <div className="fixed inset-0 z-[100] bg-white print-only text-right dir-rtl font-sans" style={{ direction: 'rtl' }}>
          {[1, 2].map((i) => (
            <div key={i} className={`h-1/2 p-10 relative flex flex-col ${i === 1 ? 'border-b-2 border-dashed border-gray-400' : ''}`}>
              <PrintHeader />
              
              <div className="flex-1">
                <div className="text-center mb-8">
                  <h1 className="text-xl font-black underline decoration-2 underline-offset-4">ورقة خروج متعلم</h1>
                  <p className="text-xs font-mono mt-1">رقم: {printingExitPaper.exitNumber}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
                  <div className="col-span-2 flex items-baseline gap-2 border-b border-gray-100 pb-2">
                    <span className="font-bold text-gray-700 min-w-[100px]">اسم المتعلم(ة):</span> 
                    <span className="text-sm font-black text-indigo-900">{printingExitPaper.learnerName}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">الرقم الداخلي:</span> 
                    <span className="font-mono">{printingExitPaper.registrationNumber}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">القسم / الشعبة:</span> 
                    <span>{printingExitPaper.className} - {printingExitPaper.stream}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">تاريخ الخروج:</span> 
                    <span className="font-mono">{printingExitPaper.date}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">وقت الخروج:</span> 
                    <span className="font-mono">{printingExitPaper.timeOut}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">نوع الخروج:</span> 
                    <span className="px-2 py-0.5 bg-gray-50 rounded font-semibold">{printingExitPaper.type}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">وقت العودة:</span> 
                    <span className="font-mono text-gray-400">........................</span>
                  </div>
                  
                  <div className="col-span-2 flex items-start gap-2">
                    <span className="font-bold text-gray-700 min-w-[100px]">سبب الخروج:</span> 
                    <span className="text-gray-800 italic">{printingExitPaper.reason}</span>
                  </div>
                  
                  {printingExitPaper.destination && (
                    <div className="col-span-2 flex items-baseline gap-2">
                      <span className="font-bold text-gray-700 min-w-[100px]">الوجهة:</span> 
                      <span>{printingExitPaper.destination}</span>
                    </div>
                  )}

                  <div className="col-span-2 mt-4">
                    <span className="font-bold text-gray-700 block mb-1">ملاحظات الإدارة:</span>
                    <div className="border border-dashed border-gray-300 p-3 min-h-[60px] rounded text-[11px] text-gray-600">
                      {printingExitPaper.notes || 'لا توجد ملاحظات إضافية.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                <span>{i === 1 ? 'نسخة المتعلم' : 'نسخة الإدارة'}</span>
                <span>تاريخ الطباعة: {new Date().toLocaleString('ar-MA')}</span>
                <span>نظام تدبير مركز زرارة</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Infirmary Visit (A4 Portrait, 2 copies) */}
      {printingInfirmaryVisit && (
        <div className="fixed inset-0 z-[100] bg-white print-only text-right dir-rtl font-sans" style={{ direction: 'rtl' }}>
          {[1, 2].map((i) => (
            <div key={i} className={`h-1/2 p-10 relative flex flex-col ${i === 1 ? 'border-b-2 border-dashed border-gray-400' : ''}`}>
              <PrintHeader />

              <div className="flex-1">
                <div className="text-center mb-8">
                  <h1 className="text-xl font-black underline decoration-2 underline-offset-4">ورقة زيارة المستوصف</h1>
                  <p className="text-xs font-mono mt-1">رقم: {printingInfirmaryVisit.visitNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
                  <div className="col-span-2 flex items-baseline gap-2 border-b border-gray-100 pb-2">
                    <span className="font-bold text-gray-700 min-w-[100px]">اسم المتعلم(ة):</span> 
                    <span className="text-sm font-black text-emerald-900">{printingInfirmaryVisit.learnerName}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">القسم:</span> 
                    <span>{printingInfirmaryVisit.className}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">الشعبة:</span> 
                    <span>{printingInfirmaryVisit.stream}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">تاريخ الزيارة:</span> 
                    <span className="font-mono">{printingInfirmaryVisit.date}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700">ساعة المغادرة:</span> 
                    <span className="font-mono">{printingInfirmaryVisit.timeOut}</span>
                  </div>

                  <div className="col-span-2 flex items-start gap-2">
                    <span className="font-bold text-gray-700 min-w-[100px]">الشكاية / الأعراض:</span> 
                    <span className="text-gray-800 italic">{printingInfirmaryVisit.complaint}</span>
                  </div>

                  <div className="col-span-2 flex items-baseline gap-2">
                    <span className="font-bold text-gray-700 min-w-[100px]">المؤسسة الصحية:</span> 
                    <span>{printingInfirmaryVisit.institution || 'المستوصف المحلي'}</span>
                  </div>

                  <div className="col-span-2 mt-6 grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded p-4 h-24 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-500 mb-auto">توقيع الإدارة</span>
                    </div>
                    <div className="border border-gray-200 rounded p-4 h-24 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-500 mb-auto">تأشيرة المستوصف</span>
                      <p className="text-[9px] text-gray-400 mt-auto">عند العودة للمركز</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                <span>{i === 1 ? 'نسخة المتعلم' : 'نسخة الإدارة'}</span>
                <span>مستخرج من نظام تدبير مركز زرارة</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Official Header (Hidden on screen, visible during window.print()) */}
      <div className="print-only mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-black">تطبيق تدبير المتعلمين</h1>
        <p className="text-base font-bold text-slate-800 mt-1">{settings.schoolName}</p>
        <p className="text-xs text-slate-600 mt-0.5">المملكة المغربية · وزارة التربية الوطنية والتعليم الأولية والرياضة</p>
        <p className="text-sm font-semibold mt-1">تقرير تتبع حضور وغياب المتعلمين · السنة الدراسية {settings.schoolYear}</p>
        <div className="flex justify-between text-xs mt-3 pt-2 border-t border-slate-300">
          <span>الفترة من: {startDate} إلى: {endDate}</span>
          <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-MA')}</span>
        </div>
      </div>

      {/* Sub-Navigation between Absences & Violations */}
      {onOpenViolations && (
        <div className="no-print flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <button
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs flex items-center gap-2"
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>تتبع وتبرير الغيابات</span>
          </button>
          <button
            onClick={onOpenViolations}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>سجل المخالفات التأديبية</span>
            {violationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {violationsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Screen Header & Export/Print Actions */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-600" />
              <span>تدبير الغيابات والتبريرات وأوراق الخروج</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              إدارة شاملة للغيابات، أوراق الخروج، وزيارات المستوصف بمركز الفرصة الثانية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Infirmary/Exit Actions */}
            <button
              onClick={() => setShowInfirmaryModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs sm:text-sm font-semibold border border-emerald-200 transition-all"
            >
              <Stethoscope className="w-4 h-4" />
              <span>زيارة مستوصف</span>
            </button>
            <button
              onClick={() => setShowExitPaperModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs sm:text-sm font-semibold border border-indigo-200 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>ورقة خروج</span>
            </button>
            
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/50">
          {[
            { id: 'absences', label: 'الغيابات والتأخرات', icon: History },
            { id: 'exit-papers', label: 'أوراق الخروج', icon: FileText },
            { id: 'infirmary', label: 'زيارات المستوصف', icon: Stethoscope },
            { id: 'return-tracking', label: 'تتبع العودة', icon: Clock },
            { id: 'stats', label: 'الإحصائيات', icon: ShieldAlert },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabInternal(tab.id as SubTabType)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/80 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <InfirmaryModal
        isOpen={showInfirmaryModal}
        onClose={() => setShowInfirmaryModal(false)}
        learners={learners}
        onSave={(visit) => {
          const nextNum = generateNextInfirmaryVisitNumber(infirmaryVisits);
          const fullVisit = { ...visit, visitNumber: nextNum };
          setInfirmaryVisits([...infirmaryVisits, fullVisit]);
          // If a record exists for this learner and date, justify it automatically
          setAttendance(prev => prev.map(a => {
            if (a.learnerId === visit.learnerId && a.date === visit.date && a.status === 'غائب') {
                return { ...a, status: 'غياب مبرر', reason: 'زيارة المستوصف' };
            }
            return a;
          }));
        }}
      />
      <ExitPaperModal
        isOpen={showExitPaperModal}
        onClose={() => setShowExitPaperModal(false)}
        learners={learners}
        onSave={(paper) => {
          const nextNum = generateNextExitPaperNumber(exitPapers);
          const fullPaper = { ...paper, exitNumber: nextNum };
          setExitPapers([...exitPapers, fullPaper]);
          // If the reason is 'زيارة المستوصف', we could also auto-justify, but usually that comes from the Infirmary Visit specifically
        }}
      />

      {activeSubTab === 'absences' && (
        <>
          {/* Filters Bar */}
          <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  حالة الحضور
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all_non_present">الغيابات والتأخرات فقط (الكل)</option>
                  <option value="غائب">غائب بدون عذر</option>
                  <option value="متأخر">متأخر</option>
                  <option value="غياب مبرر">غياب مبرر</option>
                  <option value="all">جميع الحالات (بما فيها الحضور)</option>
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القسم
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">جميع الأقسام</option>
                  {settings.classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Learner Search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المتعلم أو رقم مسار
                </label>
                <input
                  type="text"
                  placeholder="ابحث بالاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

            </div>

            {/* Filtered Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-slate-500 block">إجمالي النتائج</span>
                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{stats.totalRecords}</span>
              </div>
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                <span className="text-rose-600 dark:text-rose-400 block font-semibold">غائب بدون عذر</span>
                <span className="text-base font-bold text-rose-700 dark:text-rose-300 font-mono">{stats.totalAbsences}</span>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                <span className="text-amber-600 dark:text-amber-400 block font-semibold">متأخر</span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-300 font-mono">{stats.totalLates}</span>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
                <span className="text-indigo-600 dark:text-indigo-400 block font-semibold">غياب مبرر</span>
                <span className="text-base font-bold text-indigo-700 dark:text-indigo-300 font-mono">{stats.totalExcused}</span>
              </div>
            </div>
          </div>

          {/* Main Table View */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print-page">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 text-right text-emerald-600">التاريخ والحصة</th>
                    <th className="p-4 text-right">المتعلم</th>
                    <th className="p-4 text-right">الرقم الداخلي</th>
                    <th className="p-4 text-right">القسم والشعبة</th>
                    <th className="p-4 text-right">الحالة</th>
                    <th className="p-4 text-right">مصدر التبرير</th>
                    <th className="p-4 text-right">السبب</th>
                    <th className="p-4 text-center no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((rec) => {
                      const learner = learnersMap.get(rec.learnerId);
                      if (!learner) return null;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          
                          {/* Date & Session */}
                          <td className="p-4 font-mono text-xs whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{rec.date}</div>
                            <div className="text-[11px] text-slate-500">{rec.session}</div>
                          </td>

                          {/* Learner Name */}
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{learner.arabicName}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{learner.frenchName}</div>
                          </td>

                          {/* Internal ID */}
                          <td className="p-4 font-mono whitespace-nowrap text-xs">
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{learner.registrationNumber}</span>
                          </td>

                          {/* Class & Stream */}
                          <td className="p-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">{learner.className}</div>
                            <div className="text-[11px] text-slate-500">{learner.stream}</div>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                              rec.status === 'حاضر'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                : rec.status === 'غائب'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                : rec.status === 'متأخر'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                            }`}>
                              {rec.status}
                            </span>
                          </td>

                          {/* Justification Source */}
                          <td className="p-4 text-xs">
                              {rec.status === 'غياب مبرر' ? (rec.reason?.includes('زيارة المستوصف') ? 'زيارة مستوصف' : 'تبرير إداري') : '-'}
                          </td>

                          {/* Reason */}
                          <td className="p-4 text-slate-700 dark:text-slate-300 text-xs">
                            {rec.reason || <span className="text-slate-400">-</span>}
                          </td>

                          {/* Actions */}
                          <td className="p-4 no-print whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {rec.status === 'غائب' ? (
                                <button
                                  onClick={() => {
                                    setJustifyingRecord(rec);
                                    setJustificationReason('');
                                  }}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors"
                                  title="تبرير الغياب"
                                >
                                  تبرير
                                </button>
                              ) : rec.status === 'غياب مبرر' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRevokeJustification(rec)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="إلغاء التبرير"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : null}

                              <button
                                onClick={() => {
                                  setCorrectingRecord(rec);
                                  setCorrectionStatus(rec.status);
                                  setCorrectionReason(rec.reason || '');
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="تصحيح بيانات التسجيل"
                              >
                                <FileEdit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <p className="font-bold">لا توجد سجلات غياب ضمن الفترة المحددة</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'exit-papers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">سجل أوراق الخروج</h3>
            <button
              onClick={() => setShowExitPaperModal(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
            >
              إضافة ورقة خروج
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 text-right">رقم الورقة</th>
                  <th className="p-4 text-right">المتعلم</th>
                  <th className="p-4 text-right">التاريخ والتوقيت</th>
                  <th className="p-4 text-right">النوع والسبب</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">المدة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exitPapers.length > 0 ? (
                  exitPapers.map((paper) => (
                    <tr key={paper.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600">{paper.exitNumber || paper.id.slice(-8)}</td>
                      <td className="p-4 font-bold">{paper.learnerName}</td>
                      <td className="p-4 font-mono text-[11px]">
                        <div>{paper.date}</div>
                        <div className="text-slate-500">{paper.timeOut}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[11px]">{paper.type}</div>
                        <div className="text-slate-500 text-[10px]">{paper.reason}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          paper.status === 'عاد إلى المركز' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {paper.status}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] font-mono">
                        {paper.timeInActual ? `${paper.durationMinutes} دقيقة` : 'قيد الاحتساب'}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handlePrintExitPaper(paper)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد أوراق خروج مسجلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'infirmary' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">سجل زيارات المستوصف</h3>
            <button
              onClick={() => setShowInfirmaryModal(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
            >
              إضافة زيارة مستوصف
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 text-right">رقم الزيارة</th>
                  <th className="p-4 text-right">المتعلم</th>
                  <th className="p-4 text-right">التاريخ والتوقيت</th>
                  <th className="p-4 text-right">الشكاية</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {infirmaryVisits.length > 0 ? (
                  infirmaryVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-600">{visit.visitNumber || visit.id.slice(-8)}</td>
                      <td className="p-4 font-bold">{visit.learnerName}</td>
                      <td className="p-4 font-mono text-[11px]">
                        <div>{visit.date}</div>
                        <div className="text-slate-500">{visit.timeOut}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[11px]">{visit.complaint}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          visit.status === 'عاد إلى المركز' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {visit.status || 'جاري'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handlePrintInfirmaryVisit(visit)}
                          className="p-1 text-slate-400 hover:text-emerald-600"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد زيارات مستوصف مسجلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'return-tracking' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50/30 dark:bg-rose-950/10">
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">تتبع عودة المتعلمين (لم يعودوا بعد)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 text-right">المتعلم</th>
                  <th className="p-4 text-right">نوع الخروج</th>
                  <th className="p-4 text-right">وقت المغادرة</th>
                  <th className="p-4 text-right">المدة المنقضية</th>
                  <th className="p-4 text-center">تسجيل العودة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...exitPapers, ...infirmaryVisits.map(v => ({...v, type: 'زيارة مستوصف'}))]
                  .filter(item => item.status !== 'عاد إلى المركز' && item.status !== 'ملغاة')
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold">{item.learnerName}</td>
                      <td className="p-4 text-[11px]">{(item as any).type || 'خروج'}</td>
                      <td className="p-4 font-mono text-[11px]">{item.timeOut}</td>
                      <td className="p-4 font-mono text-rose-600 font-bold animate-pulse">قيد الاحتساب...</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => {
                            const now = new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            const calculateDuration = (tOut: string, tIn: string) => {
                                try {
                                    const [hOut, mOut] = tOut.split(':').map(Number);
                                    const [hIn, mIn] = tIn.split(':').map(Number);
                                    const diff = (hIn * 60 + mIn) - (hOut * 60 + mOut);
                                    return diff > 0 ? diff : 0;
                                } catch { return 0; }
                            };

                            if ((item as any).exitNumber) {
                              setExitPapers(prev => prev.map(p => p.id === item.id ? { 
                                ...p, 
                                status: 'عاد إلى المركز', 
                                timeInActual: now,
                                durationMinutes: calculateDuration(p.timeOut, now)
                              } : p));
                            } else {
                              setInfirmaryVisits(prev => prev.map(v => v.id === item.id ? { 
                                ...v, 
                                status: 'عاد إلى المركز', 
                                timeInActual: now 
                              } : v));
                            }
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          تأكيد العودة الآن
                        </button>
                      </td>
                    </tr>
                  ))}
                {exitPapers.filter(p => p.status !== 'عاد إلى المركز').length === 0 && infirmaryVisits.filter(v => v.status !== 'عاد إلى المركز').length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">جميع المتعلمين عادوا إلى المركز</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 mb-4">ملخص الغيابات</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">إجمالي الحالات</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.totalRecords}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-rose-600">غياب غير مبرر</span>
                <span className="font-mono font-bold text-rose-600">{stats.totalAbsences}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-indigo-600">غياب مبرر</span>
                <span className="font-mono font-bold text-indigo-600">{stats.totalExcused}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 mb-4">أوراق الخروج</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">إجمالي الأوراق</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{exitPapers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-amber-600">لم يعودوا بعد</span>
                <span className="font-mono font-bold text-amber-600">{exitPapers.filter(p => p.status !== 'عاد إلى المركز').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 mb-4">زيارات المستوصف</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">إجمالي الزيارات</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{infirmaryVisits.length}</span>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 mb-4">نسبة المواظبة الشهرية حسب الشعبة (الشهر الحالي)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">الشعبة</th>
                    <th className="py-2">حضور</th>
                    <th className="py-2">غياب (مبرر/غير)</th>
                    <th className="py-2">تأخر</th>
                    <th className="py-2 text-left">النسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {settings.streams.map(stream => {
                    const streamLearners = learners.filter(l => l.stream === stream).map(l => l.id);
                    const streamRecords = attendance.filter(a => streamLearners.includes(a.learnerId));
                    
                    const presents = streamRecords.filter(r => r.status === 'حاضر').length;
                    const absents = streamRecords.filter(r => r.status === 'غائب' || r.status === 'غياب مبرر').length;
                    const lates = streamRecords.filter(r => r.status === 'متأخر').length;
                    const total = presents + absents + lates;
                    const rate = total > 0 ? Math.round((presents / total) * 100) : 0;

                    return (
                      <tr key={stream}>
                        <td className="py-3 font-semibold">{stream}</td>
                        <td className="py-3 text-emerald-600 font-bold">{presents}</td>
                        <td className="py-3 text-rose-600 font-bold">{absents}</td>
                        <td className="py-3 text-amber-600 font-bold">{lates}</td>
                        <td className="py-3 text-left">
                          <span className={`px-2 py-1 rounded font-bold ${rate > 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {total > 0 ? `${rate}%` : 'لا توجد بيانات كافية'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Official Print Footer for Absence Tracking Report (Only during print) */}
      <div className="print-only mt-4 pt-3 border-t-2 border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-800">
        <span>مركز الفرصة الثانية - الجيل الجديد زرارة · تقرير تتبع الغياب والتأخرات الرسمي</span>
        <span>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-MA')} · السنة الدراسية: {settings.schoolYear}</span>
      </div>

      {/* Modal for Justifying Absence */}
      {justifyingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <span>تسجيل تبرير الغياب</span>
              </h3>
              <button
                onClick={() => setJustifyingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
                <p>
                  <span className="font-bold text-slate-900 dark:text-white">المتعلم: </span>
                  {learnersMap.get(justifyingRecord.learnerId)?.arabicName}
                </p>
                <p>
                  <span className="font-bold text-slate-900 dark:text-white">تاريخ الغياب: </span>
                  {justifyingRecord.date} ({justifyingRecord.session})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التبرير (شهادة طبية، إشعار عائلي...)
                </label>
                <textarea
                  rows={3}
                  placeholder="أدخل تفاصيل التبرير أو رقم الشهادة الطبية..."
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setJustifyingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmJustification()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  حفظ وتأكيد التبرير
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal for WhatsApp Entry Slip */}
      {whatsappSlipRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-fadeIn space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <span>إعداد ورقة الدخول عبر واتساب</span>
              </h3>
              <button
                onClick={() => setWhatsappSlipRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  المتعلم(ة): {learnersMap.get(whatsappSlipRecord.learnerId)?.arabicName}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  رقم الهاتف: <span className="font-mono font-bold">{learnersMap.get(whatsappSlipRecord.learnerId)?.whatsapp || 'غير متوفر'}</span>
                </p>
              </div>

              {/* Return Date Input */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الالتحاق بالمركز (تاريخ العودة):
                </label>
                <input
                  type="date"
                  value={returnDateInput}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setReturnDateInput(newDate);
                    const learner = learnersMap.get(whatsappSlipRecord.learnerId);
                    if (learner) {
                      setWhatsappSlipText(`السلام عليكم ورحمة الله وبركاته،\n\nنخبركم بأنه تم قبول تبرير الغياب الخاص بالمتعلم(ة) *${learner.arabicName}*، بمركز الفرصة الثانية الجيل الجديد زرارة، عن تاريخ *${whatsappSlipRecord.date}*.\n\nيمكن للمتعلم(ة) الالتحاق بالمركز ابتداءً من *${newDate}*، مع الالتزام بالنظام الداخلي للمركز والمواظبة على الحضور.\n\nمع تحيات إدارة مركز الفرصة الثانية الجيل الجديد زرارة.`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Editable WhatsApp Message Box */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نص رسالة واتساب الجاهزة (قابلة للتعديل):
                </label>
                <textarea
                  rows={8}
                  value={whatsappSlipText}
                  onChange={(e) => setWhatsappSlipText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed font-sans resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleMarkSent(whatsappSlipRecord)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {whatsappSlipRecord.entrySlipWhatsappSent ? 'إلغاء علامة "تم الإرسال"' : 'تسجيل كـ "أرسلت فعلياً"'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsappSlipRecord(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsappSlip}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>فتح واتساب وإرسال الرسالة</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal for Animator WhatsApp Notification */}
      {animatorWhatsappRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-fadeIn space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <span>إرسال إشعار ورقة الدخول للمنشط عبر واتساب</span>
              </h3>
              <button
                onClick={() => setAnimatorWhatsappRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المنشط:</label>
                  <input
                    type="text"
                    value={targetAnimatorName}
                    onChange={(e) => setTargetAnimatorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم هاتف المنشط:</label>
                  <input
                    type="text"
                    value={targetAnimatorPhone}
                    onChange={(e) => setTargetAnimatorPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                {matchedSessionInfo}
              </p>

              {/* Editable WhatsApp Message Box */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نص رسالة واتساب الموجهة للمنشط (قابلة للتعديل):
                </label>
                <textarea
                  rows={8}
                  value={animatorWhatsappText}
                  onChange={(e) => setAnimatorWhatsappText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed font-sans resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleAnimatorMarkSent(animatorWhatsappRecord)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {animatorWhatsappRecord.animatorWhatsappSent ? 'إلغاء علامة "تم الإرسال للمنشط"' : 'تسجيل كـ "أرسلت فعلياً للمنشط"'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnimatorWhatsappRecord(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSendAnimatorWhatsapp}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>فتح واتساب وإرسال إشعار المنشط</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal for Correcting Attendance Record */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn text-right" dir="rtl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-emerald-600" />
                <span>تصحيح بيانات تسجيل الحضور</span>
              </h3>
              <button
                onClick={() => setCorrectingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
                <p>
                  <span className="font-bold text-slate-900 dark:text-white">المتعلم: </span>
                  {learnersMap.get(correctingRecord.learnerId)?.arabicName}
                </p>
                <p>
                  <span className="font-bold text-slate-900 dark:text-white">تاريخ التسجيل: </span>
                  {correctingRecord.date} ({correctingRecord.session})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الحالة الجديدة <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['حاضر', 'غائب', 'متأخر', 'غياب مبرر'] as AttendanceStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setCorrectionStatus(status)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        correctionStatus === status
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل أو ملاحظات إضافية
                </label>
                <textarea
                  rows={2}
                  placeholder="أدخل سبب التعديل (اختياري)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCorrection}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                >
                  حفظ التصحيح
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
