import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  School, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Users,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { 
  Learner, 
  AttendanceRecord, 
  ScheduledSession, 
  Holiday, 
  AppSettings 
} from '../types';

interface WeeklyCallSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  learners: Learner[];
  attendance: AttendanceRecord[];
  schedule: ScheduledSession[];
  holidays: Holiday[];
  settings: AppSettings;
  defaultClass?: string;
  defaultWeekOffset?: number;
}

const DAYS_OF_WEEK = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] as const;

export const WeeklyCallSheetModal: React.FC<WeeklyCallSheetModalProps> = ({
  isOpen,
  onClose,
  learners,
  attendance,
  schedule,
  holidays,
  settings,
  defaultClass = 'الكل',
  defaultWeekOffset = 0,
}) => {
  const [weekOffset, setWeekOffset] = useState<number>(defaultWeekOffset);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [selectedStream, setSelectedStream] = useState<string>('الكل');
  const [showToast, setShowToast] = useState(false);

  // Calculate dates for current week Mon-Fri
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMon + weekOffset * 7);

    return DAYS_OF_WEEK.map((dayName, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const isoDate = d.toISOString().split('T')[0];
      const shortDate = d.toLocaleDateString('ar-MA', { day: 'numeric', month: 'numeric' });
      return {
        dayName,
        isoDate,
        shortDate,
        dateObj: d,
      };
    });
  }, [weekOffset]);

  const weekRangeString = useMemo(() => {
    if (weekDates.length === 0) return '';
    const start = weekDates[0].shortDate;
    const end = weekDates[4].shortDate;
    const year = weekDates[0].dateObj.getFullYear();
    return `الأسبوع الممتد من ${start} إلى ${end} (${year})`;
  }, [weekDates]);

  // Active learners matching filters
  const filteredLearners = useMemo(() => {
    return learners.filter((l) => {
      if (l.status !== 'نشط') return false;
      if (selectedClass !== 'الكل' && l.className !== selectedClass) return false;
      if (selectedStream !== 'الكل' && l.stream !== selectedStream) return false;
      return true;
    });
  }, [learners, selectedClass, selectedStream]);

  // Unique session slots occurring during this week's scheduled sessions for this class/stream
  const daySessionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      const daySch = schedule.filter((s) => {
        if (s.dayOfWeek !== day) return false;
        if (selectedClass !== 'الكل' && !s.classes.includes(selectedClass)) return false;
        if (selectedStream !== 'الكل' && !s.streams.includes(selectedStream)) return false;
        return true;
      });

      // Default sessions if none scheduled specifically
      if (daySch.length === 0) {
        map[day] = ['09:00–11:00', '11:00–13:00', '14:00–16:00'];
      } else {
        const slots = Array.from(new Set(daySch.map((s) => s.timeSlot)));
        map[day] = slots.length > 0 ? slots : ['09:00–11:00', '11:00–13:00', '14:00–16:00'];
      }
    });
    return map;
  }, [schedule, selectedClass, selectedStream]);

  // Attendance lookup map: learnerId + date + session -> record
  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach((rec) => {
      const key = `${rec.learnerId}_${rec.date}_${rec.session}`;
      map[key] = rec;
    });
    return map;
  }, [attendance]);

  // Summary counts for this week view
  const summaryStats = useMemo(() => {
    let totalP = 0;
    let totalA = 0;
    let totalL = 0;
    let totalE = 0;

    filteredLearners.forEach((l) => {
      weekDates.forEach(({ isoDate, dayName }) => {
        const slots = daySessionsMap[dayName] || [];
        slots.forEach((slot) => {
          const rec = attendanceMap[`${l.id}_${isoDate}_${slot}`];
          if (rec) {
            if (rec.status === 'حاضر') totalP++;
            else if (rec.status === 'غائب') totalA++;
            else if (rec.status === 'متأخر') totalL++;
            else if (rec.status === 'غياب مبرر') totalE++;
          }
        });
      });
    });

    return { totalP, totalA, totalL, totalE };
  }, [filteredLearners, weekDates, daySessionsMap, attendanceMap]);

  // Trigger print / save as PDF
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `ورقة_النداء_الأسبوعية_زرارة_${selectedClass.replace(/[^a-zA-Z0-9أ-ي]/g, '_')}`;
    window.print();
    document.title = originalTitle;

    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="print-container bg-white text-slate-900 rounded-2xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl my-auto relative border border-slate-300 text-right">
        
        {/* Controls Bar (Hidden during print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                تصدير ورقة النداء الأسبوعية إلى PDF
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ورقة تسجيل وحصر الحضور الأسبوعي حسب جدول الحصص والسجلات المحفوظة بالنظام
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ بصيغة PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Selection Bar (Hidden during print) */}
        <div className="no-print p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Week offset */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              اختر الأسبوع:
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
              >
                السابق
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className={`px-2 py-1 border rounded text-xs font-bold ${
                  weekOffset === 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300'
                }`}
              >
                الأسبوع الحالي
              </button>
              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
              >
                التالي
              </button>
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              القسم:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
            >
              <option value="الكل">جميع الأقسام</option>
              {settings.classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stream Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              الشعبة:
            </label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
            >
              <option value="الكل">جميع الشعب</option>
              {settings.streams.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Success Toast Banner */}
        {showToast && (
          <div className="no-print p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم فتح نافذة طباعة/تصدير PDF بنجاح! اختر «حفظ بصيغة PDF» لاقتناء الملف على جهازك.</span>
            </div>
            <button onClick={() => setShowToast(false)} className="text-white">✕</button>
          </div>
        )}

        {/* PRINTABLE DOCUMENT CONTAINER (Landscape Optimized) */}
        <div className="space-y-4">
          
          {/* Institutional Moroccan Header */}
          <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
            <div className="flex items-center justify-between gap-4">
              
              <div className="text-right text-[11px] font-bold text-slate-800 space-y-0.5 leading-tight">
                <p className="font-extrabold text-xs">المملكة المغربية</p>
                <p>وزارة التربية الوطنية والتعليم الأولية والرياضة</p>
                <p>الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة</p>
                <p>المديرية الإقليمية الصخيرات تمارة</p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex flex-col items-center justify-center font-black p-2 shadow-sm shrink-0">
                <School className="w-7 h-7" />
              </div>

              <div className="text-left text-[11px] font-bold text-slate-800 space-y-0.5 leading-tight">
                <p className="font-extrabold text-xs">{settings.schoolName}</p>
                <p>السنة الدراسية: <span className="font-mono">{settings.schoolYear}</span></p>
                <p className="text-[10px] text-slate-600">تاريخ الإصدار: {new Date().toLocaleDateString('ar-MA')}</p>
              </div>

            </div>

            <div className="mt-2 pt-2 border-t border-slate-200">
              <h1 className="text-base font-black text-slate-900">
                ورقة النداء وتتبع الحضور والغياب الأسبوعية (Weekly Call Sheet)
              </h1>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {weekRangeString} · القسم: <span className="text-emerald-800">{selectedClass}</span> · الشعبة: <span className="text-emerald-800">{selectedStream}</span>
              </p>
            </div>
          </div>

          {/* Weekly KPI Banner */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold border border-slate-300">
            <span>عدد المتعلمين المدرجين: <strong className="font-mono text-emerald-800">{filteredLearners.length}</strong> متعلم</span>
            
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-emerald-800">حاضر (P): {summaryStats.totalP}</span>
              <span className="text-rose-800">غائب (A): {summaryStats.totalA}</span>
              <span className="text-amber-800">متأخر (L): {summaryStats.totalL}</span>
              <span className="text-indigo-800">مبرر (E): {summaryStats.totalE}</span>
            </div>
          </div>

          {/* Main Weekly Call Sheet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px] border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black border-y-2 border-slate-800">
                  <th className="p-1.5 text-center w-8">#</th>
                  <th className="p-1.5 w-24">رقم التسجيل</th>
                  <th className="p-1.5 w-40">الاسم الكامل</th>
                  <th className="p-1.5 w-24">رقم مسار</th>

                  {/* Days Mon-Fri headers */}
                  {weekDates.map(({ dayName, shortDate }) => (
                    <th key={dayName} className="p-1 text-center border-r border-slate-400 bg-slate-200/80">
                      <div>{dayName}</div>
                      <div className="text-[9px] font-mono text-slate-600">{shortDate}</div>
                    </th>
                  ))}

                  <th className="p-1.5 text-center w-20 border-r border-slate-400">ملاحظات الغياب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium text-slate-900">
                {filteredLearners.length > 0 ? (
                  filteredLearners.map((learner, idx) => {
                    let learnerAbsenceCount = 0;

                    return (
                      <tr key={learner.id} className="hover:bg-slate-50">
                        <td className="p-1.5 text-center font-mono text-slate-600">{idx + 1}</td>
                        <td className="p-1.5 font-mono font-bold text-slate-800">{learner.registrationNumber}</td>
                        <td className="p-1.5 font-bold text-slate-900">{learner.arabicName}</td>
                        <td className="p-1.5 font-mono text-slate-700">{learner.masarCode}</td>

                        {/* Mon-Fri daily session statuses */}
                        {weekDates.map(({ dayName, isoDate }) => {
                          const slots = daySessionsMap[dayName] || [];
                          
                          return (
                            <td key={dayName} className="p-1 text-center border-r border-slate-300">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {slots.map((slot) => {
                                  const rec = attendanceMap[`${learner.id}_${isoDate}_${slot}`];
                                  let code = '—';
                                  let bgClass = 'text-slate-400';

                                  if (rec) {
                                    if (rec.status === 'حاضر') {
                                      code = 'P';
                                      bgClass = 'bg-emerald-100 text-emerald-900 font-bold px-1 rounded';
                                    } else if (rec.status === 'غائب') {
                                      code = 'A';
                                      bgClass = 'bg-rose-200 text-rose-950 font-black px-1 rounded';
                                      learnerAbsenceCount++;
                                    } else if (rec.status === 'متأخر') {
                                      code = 'L';
                                      bgClass = 'bg-amber-100 text-amber-900 font-bold px-1 rounded';
                                    } else if (rec.status === 'غياب مبرر') {
                                      code = 'E';
                                      bgClass = 'bg-indigo-100 text-indigo-900 font-bold px-1 rounded';
                                    }
                                  }

                                  return (
                                    <span key={slot} title={`${slot}: ${rec?.status || 'غير مسجل'}`} className={`text-[10px] ${bgClass}`}>
                                      {code}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}

                        <td className="p-1.5 text-center border-r border-slate-400 font-bold">
                          {learnerAbsenceCount > 0 ? (
                            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              {learnerAbsenceCount} غيابات
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500 font-bold">
                      لا يوجد متعلمون نشطون يطابقون المرشحات المختارة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend Explanation */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 pt-1">
            <span>دليل الرموز:</span>
            <span className="px-1.5 bg-emerald-100 text-emerald-900 rounded">P = حاضر</span>
            <span className="px-1.5 bg-rose-200 text-rose-950 rounded">A = غائب</span>
            <span className="px-1.5 bg-amber-100 text-amber-900 rounded">L = متأخر</span>
            <span className="px-1.5 bg-indigo-100 text-indigo-900 rounded">E = غياب مبرر</span>
            <span className="text-slate-400">— = غير مسجل (لا يحتسب غياباً)</span>
          </div>

          {/* Official Document Footer (No Signatures) */}
          <div className="pt-3 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-700">
            <div className="font-bold">
              مركز الفرصة الثانية - الجيل الجديد زرارة · ورقة النداء وتتبع الحضور الأسبوعية الرسمية
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              تاريخ الطبع / التصدير: {new Date().toLocaleDateString('ar-MA')} · السنة الدراسية: {settings.schoolYear}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (Hidden during print) */}
        <div className="no-print mt-6 pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            اسم الملف الافتراضي عند الحفظ: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">ورقة_النداء_الأسبوعية_زرارة.pdf</code>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إغلاق
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ بصيغة PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
