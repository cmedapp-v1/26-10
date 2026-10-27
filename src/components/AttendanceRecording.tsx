import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  UserX, 
  AlertCircle, 
  Check, 
  Save, 
  Sparkles,
  Users,
  Search,
  BookOpen,
  CalendarDays,
  Layers,
  FileText,
  Printer,
  X,
  School,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

import { 
  Learner, 
  AttendanceRecord, 
  AttendanceStatus, 
  AppSettings, 
  SessionTime, 
  ScheduledSession, 
  Holiday 
} from '../types';
import { WeeklyCallSheetModal } from './WeeklyCallSheetModal';

interface AttendanceRecordingProps {
  learners: Learner[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  settings: AppSettings;
  schedule?: ScheduledSession[];
  holidays?: Holiday[];
  initialPrefill?: {
    date: string;
    sessionTime: SessionTime;
    className: string;
    subject?: string;
  } | null;
}


const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const AttendanceRecording: React.FC<AttendanceRecordingProps> = ({
  learners,
  attendance,
  setAttendance,
  settings,
  schedule = [],
  holidays = [],
  initialPrefill = null,
}) => {
  // Selection State
  const [selectedDate, setSelectedDate] = useState<string>(
    initialPrefill?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedSession, setSelectedSession] = useState<SessionTime>(
    initialPrefill?.sessionTime || settings.sessions[0] || '09:00–11:00'
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    initialPrefill?.className || settings.classes[0] || 'القسم 1 - تكوين أساسي'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // PDF Preview Modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isWeeklyCallSheetModalOpen, setIsWeeklyCallSheetModalOpen] = useState(false);

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


  // Update selection if prefill changes
  useEffect(() => {
    if (initialPrefill) {
      if (initialPrefill.date) setSelectedDate(initialPrefill.date);
      if (initialPrefill.sessionTime) setSelectedSession(initialPrefill.sessionTime);
      if (initialPrefill.className) setSelectedClass(initialPrefill.className);
    }
  }, [initialPrefill]);

  // Determine day of week for selectedDate
  const dayOfWeekArabic = useMemo(() => {
    if (!selectedDate) return '';
    const dateObj = new Date(selectedDate);
    return ARABIC_DAYS[dateObj.getDay()] || '';
  }, [selectedDate]);

  // Check if selected date is on holiday
  const activeHoliday = useMemo(() => {
    if (!selectedDate) return null;
    return holidays.find((h) => selectedDate >= h.startDate && selectedDate <= h.endDate) || null;
  }, [selectedDate, holidays]);

  // Fetch scheduled sessions for selected date & day of week
  const dayScheduledSessions = useMemo(() => {
    return schedule.filter((s) => {
      if (s.dayOfWeek !== dayOfWeekArabic) return false;
      if (!s.isRecurring && s.specificDate && s.specificDate !== selectedDate) return false;
      return true;
    });
  }, [schedule, dayOfWeekArabic, selectedDate]);

  // Active learners in chosen class
  const classLearners = useMemo(() => {
    return learners.filter(
      (l) =>
        l.status === 'نشط' &&
        (selectedClass === 'all' || l.className === selectedClass) &&
        (l.arabicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.masarCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [learners, selectedClass, searchTerm]);

  // Local draft state for current attendance sheet
  const [draftAttendance, setDraftAttendance] = useState<
    Record<string, { status: AttendanceStatus; reason: string }>
  >({});

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load existing records for the chosen Date + Session
  useEffect(() => {
    const existingMap: Record<string, { status: AttendanceStatus; reason: string }> = {};

    attendance.forEach((rec) => {
      if (rec.date === selectedDate && rec.session === selectedSession) {
        existingMap[rec.learnerId] = {
          status: rec.status,
          reason: rec.reason || '',
        };
      }
    });

    // Default unrecorded students to 'حاضر'
    const updatedDraft: Record<string, { status: AttendanceStatus; reason: string }> = {};
    classLearners.forEach((learner) => {
      if (existingMap[learner.id]) {
        updatedDraft[learner.id] = existingMap[learner.id];
      } else {
        updatedDraft[learner.id] = { status: 'حاضر', reason: '' };
      }
    });

    setDraftAttendance(updatedDraft);
  }, [selectedDate, selectedSession, selectedClass, attendance, classLearners]);

  // Check if current draft is already saved in global state
  const isAlreadySavedInSystem = useMemo(() => {
    const activeIdsInView = new Set(classLearners.map((l) => l.id));
    return attendance.some(
      (rec) => rec.date === selectedDate && rec.session === selectedSession && activeIdsInView.has(rec.learnerId)
    );
  }, [attendance, selectedDate, selectedSession, classLearners]);

  // KPI Statistics for the active view
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    classLearners.forEach((l) => {
      const status = draftAttendance[l.id]?.status || 'حاضر';
      if (status === 'حاضر') present++;
      else if (status === 'غائب') absent++;
      else if (status === 'متأخر') late++;
      else if (status === 'غياب مبرر') excused++;
    });

    const total = classLearners.length;
    return {
      total,
      present,
      absent,
      late,
      excused,
      presentPct: total > 0 ? Math.round((present / total) * 100) : 0,
      absentPct: total > 0 ? Math.round((absent / total) * 100) : 0,
    };
  }, [classLearners, draftAttendance]);

  // Update individual student status
  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        status,
      },
    }));
  };

  // Update individual student reason
  const handleReasonChange = (learnerId: string, reason: string) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [learnerId]: {
        ...(prev[learnerId] || { status: 'حاضر', reason: '' }),
        reason,
      },
    }));
  };

  // Mark All Present ("الكل حاضر")
  const handleMarkAllPresent = () => {
    openConfirm(
      'تأكيد تسجيل حضور الجميع',
      'هل أنت متأكد من أنك تريد تعيين جميع المتعلمين في هذا القسم كـ "حاضر"؟',
      executeMarkAllPresent,
      'info'
    );
  };

  const executeMarkAllPresent = () => {
    const newDraft: Record<string, { status: AttendanceStatus; reason: string }> = { ...draftAttendance };
    classLearners.forEach((l) => {
      newDraft[l.id] = { status: 'حاضر', reason: '' };
    });
    setDraftAttendance(newDraft);

    setToastMessage('تم تعيين جميع المتعلمين كـ "حاضر" بنجاح');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick Select a scheduled session from timetable chip
  const handleSelectScheduledSession = (sch: ScheduledSession) => {
    setSelectedSession(sch.timeSlot);
    if (sch.classes.length > 0) {
      setSelectedClass(sch.classes[0]);
    }
  };

  // Save Attendance to global state
  const handleSaveAttendance = () => {
    openConfirm(
      'تأكيد حفظ ورقة الحضور',
      `هل أنت متأكد من أنك تريد حفظ ورقة حضور يوم ${selectedDate} (الحصة: ${selectedSession})؟ سيتم تحديث السجلات الحالية في قاعدة البيانات.`,
      executeSaveAttendance,
      'warning'
    );
  };

  const executeSaveAttendance = () => {
    const now = new Date().toISOString();

    setAttendance((prevAttendance) => {
      // Remove existing records for this date + session + active learners in current view
      const activeIdsInView = new Set(classLearners.map((l) => l.id));
      const filtered = prevAttendance.filter(
        (rec) => !(rec.date === selectedDate && rec.session === selectedSession && activeIdsInView.has(rec.learnerId))
      );

      // Create new records
      const newRecords: AttendanceRecord[] = classLearners.map((learner) => {
        const draft = draftAttendance[learner.id] || { status: 'حاضر', reason: '' };
        return {
          id: `att_${learner.id}_${selectedDate}_${selectedSession.replace(/[^0-9]/g, '')}`,
          learnerId: learner.id,
          date: selectedDate,
          session: selectedSession,
          status: draft.status,
          reason: draft.reason,
          updatedAt: now,
        };
      });

      return [...filtered, ...newRecords];
    });

    setToastMessage(`تم حفظ ورقة الحضور ليوم ${selectedDate} (الحصة: ${selectedSession}) بنجاح!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset individual learner attendance status & reason ("مسح المعطيات")
  const handleResetLearnerAttendance = (learnerId: string) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [learnerId]: { status: 'حاضر', reason: '' },
    }));
  };


  // Trigger browser print to PDF
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
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
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="no-print p-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-between transition-all animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* Holiday Warning Banner */}
      {activeHoliday && (
        <div className="no-print p-4 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-900 dark:text-rose-100 shadow-sm">
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <h4 className="font-extrabold text-sm">
              تنبيه: اليوم المختار يصادف عطلة رسمية ({activeHoliday.title})
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              فترة العطلة من {activeHoliday.startDate} إلى {activeHoliday.endDate} ({activeHoliday.type}). يمكنك معاينة أو حفظ السجل استثنائيًا إن استدعى الأمر.
            </p>
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-emerald-600" />
              <span>تسجيل الحضور والغياب اليومي</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              اختر التاريخ والحصة والقسم لرصد حالات الحضور والغياب والتأخر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick action "Mark All Present" */}
            <button
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl text-xs font-bold transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>الكل حاضر</span>
            </button>

            {/* Export Daily Call Sheet to PDF Button */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>ورقة النداء اليومية (PDF)</span>
            </button>

            {/* Export Weekly Call Sheet to PDF Button */}
            <button
              onClick={() => setIsWeeklyCallSheetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>ورقة النداء الأسبوعية (PDF)</span>
            </button>


            {/* Save Button */}
            <button
              onClick={handleSaveAttendance}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>حفظ سجل الحضور</span>
            </button>
          </div>
        </div>

        {/* Timetable Quick Selector Chips */}
        {dayScheduledSessions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>الحصص المبرمجة ليوم {dayOfWeekArabic} ({selectedDate}):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dayScheduledSessions.map((sch) => {
                const isSelected = selectedSession === sch.timeSlot && sch.classes.includes(selectedClass);
                const isEducational = sch.sessionType === 'التأهيل التربوي';

                return (
                  <button
                    key={sch.id}
                    onClick={() => handleSelectScheduledSession(sch)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border text-right flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isEducational
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    <span className="font-mono dir-ltr">{sch.timeSlot}</span>
                    <span>·</span>
                    <span>{sch.subject}</span>
                    <span className="opacity-75 text-[10px]">({sch.classes.join('، ')})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection Pickers Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>التاريخ</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Session Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>الحصة الزمنية</span>
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value as SessionTime)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="09:00–11:00">09:00 – 11:00 (صباحية 1)</option>
              <option value="11:00–13:00">11:00 – 13:00 (صباحية 2)</option>
              <option value="09:00–13:00">09:00 – 13:00 (تأهيل ممتد)</option>
              <option value="14:00–16:00">14:00 – 16:00 (بعد الزوال)</option>
            </select>
          </div>

          {/* Class Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>القسم</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">جميع الأقسام</option>
              {settings.classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Student Search */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>تصفية اسم المتعلم</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="البحث داخل القسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 pl-8"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  title="مسح البحث"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Student Attendance List Cards / Table */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span>ورقة الحضور ({classLearners.length} متعلم نشط)</span>
            {isAlreadySavedInSystem ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                مسجلة بالنظام
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold">
                مسودة (لم تُحفظ بعد)
              </span>
            )}
          </div>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            {selectedDate} ({dayOfWeekArabic}) · الحصة: {selectedSession}
          </span>
        </div>

        {classLearners.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {classLearners.map((learner) => {
              const current = draftAttendance[learner.id] || { status: 'حاضر', reason: '' };

              return (
                <div
                  key={learner.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    current.status === 'حاضر'
                      ? 'bg-white dark:bg-slate-900'
                      : current.status === 'غائب'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20'
                      : current.status === 'متأخر'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/20'
                  }`}
                >
                  
                  {/* Student Info */}
                  <div className="flex items-start gap-3 min-w-[240px]">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shrink-0">
                      {learner.arabicName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {learner.arabicName}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          {learner.registrationNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        رقم مسار: <span className="font-mono">{learner.masarCode}</span> · {learner.stream}
                      </p>
                    </div>
                  </div>

                  {/* Status Segmented Radio Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    
                    {/* Present */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(learner.id, 'حاضر')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        current.status === 'حاضر'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>حاضر (P)</span>
                    </button>

                    {/* Absent */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(learner.id, 'غائب')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        current.status === 'غائب'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>غائب (A)</span>
                    </button>

                    {/* Late */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(learner.id, 'متأخر')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        current.status === 'متأخر'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>متأخر (L)</span>
                    </button>

                    {/* Excused */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(learner.id, 'غياب مبرر')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        current.status === 'غياب مبرر'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>غياب مبرر</span>
                    </button>

                  </div>

                  {/* Reason input for Absent / Late / Excused & Reset button */}
                  <div className="flex items-center gap-1.5 w-full md:w-72">
                    <input
                      type="text"
                      placeholder={
                        current.status === 'حاضر'
                          ? 'ملاحظات اختيارية...'
                          : 'سبب الغياب أو التأخر...'
                      }
                      value={current.reason || ''}
                      onChange={(e) => handleReasonChange(learner.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />

                    {(current.status !== 'حاضر' || current.reason) && (
                      <button
                        type="button"
                        onClick={() => handleResetLearnerAttendance(learner.id)}
                        title="مسح المعطيات وإعادة الضبط كـ حاضر"
                        className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-all border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>مسح</span>
                      </button>
                    )}
                  </div>


                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-bold">لا يوجد متعلمون نشطون في هذا القسم</p>
            <p className="text-xs mt-1">يرجى اختيار قسم آخر أو إضافة متعلمين من قائمة تدبير المتعلمين.</p>
          </div>
        )}

        {classLearners.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>معاينة وتصدير PDF</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>حفظ ورقة الحضور بشكل نهائي</span>
            </button>
          </div>
        )}

      </div>

      {/* Modal: Export Call Sheet to PDF / Print Preview */}
      {isPdfModalOpen && (
        <div className="modal-backdrop-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="print-container bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-auto relative border border-slate-300 text-right">
            
            {/* Modal Controls Bar (Hidden during actual print) */}
            <div className="no-print flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    معاينة ورقة النداء اليومية للتصدير إلى PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    جاهزة للطباعة أو التنزيل بصيغة PDF عبر خيار «حفظ بصيغة PDF»
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة / حفظ بصيغة PDF</span>
                </button>

                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE DOCUMENT AREA (A4 Official Layout) */}
            <div className="space-y-5">
              
              {/* Official Moroccan Institutional Header */}
              <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1">
                <div className="flex items-center justify-between gap-4">
                  
                  {/* Right Header Text */}
                  <div className="text-right text-xs font-bold text-slate-800 space-y-0.5 leading-tight">
                    <p className="font-extrabold text-sm">المملكة المغربية</p>
                    <p>وزارة التربية الوطنية والتعليم الأولية والرياضة</p>
                    <p>الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة</p>
                    <p>المديرية الإقليمية الصخيرات تمارة</p>
                  </div>

                  {/* Logo Center Emblem */}
                  <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex flex-col items-center justify-center font-black p-2 shadow-sm shrink-0">
                    <School className="w-8 h-8" />
                  </div>

                  {/* Left Center Details */}
                  <div className="text-left text-xs font-bold text-slate-800 space-y-0.5 leading-tight">
                    <p className="font-extrabold text-sm">{settings.schoolName}</p>
                    <p>السنة الدراسية: <span className="font-mono">{settings.schoolYear}</span></p>
                    <p className="text-[11px] text-slate-600">تاريخ التصدير: {new Date().toLocaleDateString('ar-MA')}</p>
                  </div>

                </div>

                {/* Document Main Title */}
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                    ورقة النداء اليومية لتسجيل الحضور والغياب
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    اليوم: <span className="text-emerald-800">{dayOfWeekArabic} {selectedDate}</span> · الحصة: <span className="font-mono text-emerald-800 dir-ltr">{selectedSession}</span> · القسم: <span className="text-emerald-800">{selectedClass}</span>
                  </p>
                </div>
              </div>

              {/* Status Notice (Saved vs Draft) */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold border border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700">حالة السجل بالنظام:</span>
                  {isAlreadySavedInSystem ? (
                    <span className="text-emerald-700 font-black">سجل مؤكد ومحفوظ بنجاح</span>
                  ) : (
                    <span className="text-amber-700 font-black">مسودة ورقة النداء (قيد التسجيل)</span>
                  )}
                </div>

                {/* KPI Summary */}
                <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
                  <span>المجموع: {stats.total}</span>
                  <span className="text-emerald-700">حاضر: {stats.present}</span>
                  <span className="text-rose-700">غائب: {stats.absent}</span>
                  <span className="text-amber-700">متأخر: {stats.late}</span>
                  <span className="text-indigo-700">مبرر: {stats.excused}</span>
                </div>
              </div>

              {/* Printable Learners Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black text-[11px] border-y-2 border-slate-800">
                      <th className="p-2 text-center w-10">#</th>
                      <th className="p-2 w-28">رقم التسجيل</th>
                      <th className="p-2">الاسم الكامل للمتعلم</th>
                      <th className="p-2 w-28">رقم مسار</th>
                      <th className="p-2 text-center w-16">الجنس</th>
                      <th className="p-2">الشعبة التكوينية</th>
                      <th className="p-2 text-center w-28">حالة الحضور</th>
                      <th className="p-2">ملاحظات / أسباب الغياب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-medium text-slate-900">
                    {classLearners.map((learner, idx) => {
                      const rec = draftAttendance[learner.id] || { status: 'حاضر', reason: '' };
                      let badgeClass = 'bg-slate-100 text-slate-800';
                      let code = 'P (حاضر)';

                      if (rec.status === 'حاضر') {
                        badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        code = 'حاضر (P)';
                      } else if (rec.status === 'غائب') {
                        badgeClass = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
                        code = 'غائب (A)';
                      } else if (rec.status === 'متأخر') {
                        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                        code = 'متأخر (L)';
                      } else if (rec.status === 'غياب مبرر') {
                        badgeClass = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                        code = 'غياب مبرر (E)';
                      }

                      return (
                        <tr key={learner.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono text-slate-600">{idx + 1}</td>
                          <td className="p-2 font-mono font-bold text-slate-800">{learner.registrationNumber}</td>
                          <td className="p-2 font-bold text-slate-900">{learner.arabicName}</td>
                          <td className="p-2 font-mono text-slate-700">{learner.masarCode}</td>
                          <td className="p-2 text-center text-slate-700">{learner.gender}</td>
                          <td className="p-2 text-slate-800">{learner.stream}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeClass}`}>
                              {code}
                            </span>
                          </td>
                          <td className="p-2 text-slate-700 italic">
                            {rec.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Official Document Footer (No Signatures) */}
              <div className="pt-4 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-700">
                <div className="font-bold">
                  مركز الفرصة الثانية - الجيل الجديد زرارة · وثيقة تسجيل الحضور والغياب اليومي الرسمية
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  تاريخ الطبع / التصدير: {new Date().toLocaleDateString('ar-MA')} · السنة الدراسية: {settings.schoolYear}
                </div>
              </div>

            </div>

            {/* Bottom Actions inside Modal (Hidden during print) */}
            <div className="no-print mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                عند الضغط على طباعة، يمكنك اختيار «حفظ بصيغة PDF» (Save as PDF) كوجهة للطباعة.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إغلاق
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة / حفظ بصيغة PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* Modal: Export Weekly Call Sheet to PDF */}
      <WeeklyCallSheetModal
        isOpen={isWeeklyCallSheetModalOpen}
        onClose={() => setIsWeeklyCallSheetModalOpen(false)}
        learners={learners}
        attendance={attendance}
        schedule={schedule}
        holidays={holidays}
        settings={settings}
        defaultClass={selectedClass}
      />

    </div>
  );
};


