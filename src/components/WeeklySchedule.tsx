import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Printer, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  BookOpen, 
  Layers, 
  CalendarDays, 
  X, 
  Check, 
  Tag, 
  Search,
  Filter,
  Sparkles,
  FileText
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

import { 
  ScheduledSession, 
  Holiday, 
  SessionTime, 
  SessionType, 
  AppSettings,
  Learner,
  AttendanceRecord,
  Animator
} from '../types';
import { WeeklyCallSheetModal } from './WeeklyCallSheetModal';
import { PrintPreviewModal } from './PrintPreviewModal';

interface WeeklyScheduleProps {
  schedule: ScheduledSession[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduledSession[]>>;
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  settings: AppSettings;
  learners?: Learner[];
  attendance?: AttendanceRecord[];
  animators?: Animator[];
  initialAnimatorFilter?: string;
  onOpenAttendanceForSession?: (session: ScheduledSession, dateStr: string) => void;
}

const DAYS_OF_WEEK = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] as const;


// Official time slots according to requirements
const OFFICIAL_SLOTS: { id: string; label: string; range: SessionTime; isBreak?: boolean }[] = [
  { id: 'morning_ext', label: 'توقيت ممتد صباحي (09:00 – 13:00)', range: '09:00–13:00' },
  { id: 'morning_1', label: 'الحصة الصباحية الأولى (09:00 – 11:00)', range: '09:00–11:00' },
  { id: 'morning_2', label: 'الحصة الصباحية الثانية (11:00 – 13:00)', range: '11:00–13:00' },
  { id: 'lunch_break', label: 'استراحة الغداء (13:00 – 14:00)', range: '13:00–14:00', isBreak: true },
  { id: 'afternoon', label: 'حصة بعد الزوال (14:00 – 16:00)', range: '14:00–16:00' },
];

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  schedule,
  setSchedule,
  holidays,
  setHolidays,
  settings,
  learners = [],
  attendance = [],
  animators = [],
  initialAnimatorFilter,
  onOpenAttendanceForSession,
}) => {
  // Current active week offset (0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);
  
  // Tab view inside Schedule: 'timetable' or 'holidays'
  const [subTab, setSubTab] = useState<'timetable' | 'holidays'>('timetable');

  // Filters
  const [filterClass, setFilterClass] = useState<string>('الكل');
  const [filterStream, setFilterStream] = useState<string>('الكل');
  const [filterType, setFilterType] = useState<string>('الكل');
  const [filterAnimator, setFilterAnimator] = useState<string>(initialAnimatorFilter || 'الكل');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isWeeklyCallSheetOpen, setIsWeeklyCallSheetOpen] = useState<boolean>(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<ScheduledSession | null>(null);

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


  // Form State for Add/Edit Session
  const [formData, setFormData] = useState<{
    dayOfWeek: string;
    timeSlot: SessionTime;
    sessionType: SessionType;
    subject: string;
    animator: string;
    animatorId?: string;
    classes: string[];
    streams: string[];
    isRecurring: boolean;
    specificDate: string;
    notes: string;
  }>({
    dayOfWeek: 'الاثنين',
    timeSlot: '09:00–11:00',
    sessionType: 'التأهيل التربوي',
    subject: '',
    animator: '',
    animatorId: '',
    classes: [],
    streams: [],
    isRecurring: true,
    specificDate: '',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);
  const [holidayFormData, setHolidayFormData] = useState<{
    title: string;
    startDate: string;
    endDate: string;
    type: 'مدرسية' | 'وطنية' | 'دينية';
  }>({
    title: '',
    startDate: '',
    endDate: '',
    type: 'مدرسية',
  });

  // Calculate dates for current week Mon-Fri
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    // Distance to Monday
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMon + weekOffset * 7);

    return DAYS_OF_WEEK.map((dayName, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const isoDate = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' });
      const shortDate = d.toLocaleDateString('ar-MA', { day: 'numeric', month: 'numeric' });
      return {
        dayName,
        isoDate,
        formattedDate,
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
    return `الأسبوع من ${start} إلى ${end} (${year})`;
  }, [weekDates]);

  // Check if a date falls on a holiday
  const getHolidayForDate = (dateStr: string): Holiday | undefined => {
    return holidays.find((h) => dateStr >= h.startDate && dateStr <= h.endDate);
  };

  // Filtered schedule list
  const filteredSchedule = useMemo(() => {
    return schedule.filter((s) => {
      if (filterClass !== 'الكل' && !s.classes.includes(filterClass)) return false;
      if (filterStream !== 'الكل' && !s.streams.includes(filterStream)) return false;
      if (filterType !== 'الكل' && s.sessionType !== filterType) return false;
      if (filterAnimator !== 'الكل' && s.animator !== filterAnimator) return false;
      return true;
    });
  }, [schedule, filterClass, filterStream, filterType, filterAnimator]);

  // Open modal to create session
  const handleOpenAddModal = (defaultDay?: string, defaultTime?: SessionTime) => {
    setEditingSession(null);
    setFormError(null);
    setFormData({
      dayOfWeek: defaultDay || 'الاثنين',
      timeSlot: defaultTime || '09:00–11:00',
      sessionType: 'التأهيل التربوي',
      subject: '',
      animator: '',
      animatorId: '',
      classes: settings.classes.length > 0 ? [settings.classes[0]] : [],
      streams: settings.streams.length > 0 ? [settings.streams[0]] : [],
      isRecurring: true,
      specificDate: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal to edit session
  const handleOpenEditModal = (session: ScheduledSession) => {
    setEditingSession(session);
    setFormError(null);
    setFormData({
      dayOfWeek: session.dayOfWeek,
      timeSlot: session.timeSlot,
      sessionType: session.sessionType,
      subject: session.subject,
      animator: session.animator,
      animatorId: session.animatorId || '',
      classes: session.classes,
      streams: session.streams,
      isRecurring: session.isRecurring,
      specificDate: session.specificDate || '',
      notes: session.notes || '',
    });
    setIsModalOpen(true);
  };

  // Check overlapping time slots helper
  const isTimeSlotOverlap = (time1: SessionTime, time2: SessionTime): boolean => {
    if (time1 === time2) return true;
    if (time1 === '09:00–13:00' && (time2 === '09:00–11:00' || time2 === '11:00–13:00')) return true;
    if (time2 === '09:00–13:00' && (time1 === '09:00–11:00' || time1 === '11:00–13:00')) return true;
    return false;
  };

  // Validate form and check for conflicts
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.subject.trim()) {
      setFormError('يرجى إدخال اسم المادة أو النشاط.');
      return;
    }
    if (!formData.animator.trim()) {
      setFormError('يرجى إدخال اسم المنشط أو المؤطر.');
      return;
    }

    // Check if selected animator is inactive or suspended
    if (animators && animators.length > 0) {
      const chosen = animators.find(
        (a) =>
          (formData.animatorId && a.id === formData.animatorId) ||
          a.arabicName.trim().toLowerCase() === formData.animator.trim().toLowerCase()
      );
      if (chosen && chosen.status !== 'نشط') {
        setFormError(`المنشط «${chosen.arabicName}» في وضعية (${chosen.status}) ولا يمكن برمجة حصص جديدة له. يرجى تفعيل وضعيته أولاً في قسم تدبير المنشطين.`);
        return;
      }
    }

    if (formData.classes.length === 0) {
      setFormError('يرجى تحديد قسم واحد على الأقل.');
      return;
    }
    if (formData.timeSlot === '13:00–14:00') {
      setFormError('فترة الاستراحة (13:00 - 14:00) محددة مسبقًا ولا يمكن برمجة حصص فيها.');
      return;
    }

    openConfirm(
      'تأكيد حفظ الحصة',
      editingSession ? 'هل أنت متأكد من أنك تريد حفظ التعديلات على هذه الحصة؟' : 'هل أنت متأكد من أنك تريد إضافة هذه الحصة إلى استعمال الزمن؟',
      () => executeSaveSession(),
      'info'
    );
  };

  const executeSaveSession = () => {
    // Conflict detection
    const existingOtherSessions = schedule.filter((s) => editingSession === null || s.id !== editingSession.id);

    for (const existing of existingOtherSessions) {
      // Check if day matches
      if (existing.dayOfWeek === formData.dayOfWeek) {
        // Check if times overlap
        if (isTimeSlotOverlap(existing.timeSlot, formData.timeSlot)) {
          // Check animator conflict by ID or normalized name
          const isSameAnimator =
            (existing.animatorId && formData.animatorId && existing.animatorId === formData.animatorId) ||
            existing.animator.trim().toLowerCase() === formData.animator.trim().toLowerCase();

          if (isSameAnimator) {
            setFormError(`تعارض في الجدول: المنشط (${formData.animator}) لديه حصة أخرى (${existing.subject}) في نفس الوقت (${existing.timeSlot}) بـ ${existing.dayOfWeek}.`);
            return;
          }

          // Check class conflict
          const overlappingClasses = existing.classes.filter((c) => formData.classes.includes(c));
          if (overlappingClasses.length > 0) {
            setFormError(`تعارض في الجدول: ${overlappingClasses.join(', ')} لديهم حصة أخرى (${existing.subject}) في نفس الوقت (${existing.timeSlot}).`);
            return;
          }
        }
      }
    }

    if (editingSession) {
      // Update existing
      setSchedule((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? {
                ...s,
                ...formData,
              }
            : s
        )
      );
    } else {
      // Add new
      const newSession: ScheduledSession = {
        id: `sch_${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setSchedule((prev) => [...prev, newSession]);
    }

    setIsModalOpen(false);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    openConfirm(
      'تأكيد حذف الحصة',
      'هل أنت متأكد من رغبتك في حذف هذه الحصة من استعمال الزمن؟',
      () => setSchedule((prev) => prev.filter((s) => s.id !== id)),
      'danger'
    );
  };

  // Add holiday
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayFormData.title.trim() || !holidayFormData.startDate || !holidayFormData.endDate) {
      alert('يرجى ملا جميع حقول العطلة.');
      return;
    }

    const newHoliday: Holiday = {
      id: `hol_${Date.now()}`,
      ...holidayFormData,
    };

    setHolidays((prev) => [...prev, newHoliday]);
    setHolidayFormData({ title: '', startDate: '', endDate: '', type: 'مدرسية' });
    setIsHolidayModalOpen(false);
  };

  // Delete holiday
  const handleDeleteHoliday = (id: string) => {
    openConfirm(
      'تأكيد حذف العطلة',
      'هل أنت متأكد من حذف هذه العطلة من السجل؟',
      () => setHolidays((prev) => prev.filter((h) => h.id !== id)),
      'danger'
    );
  };

  // Toggle class selection in form
  const toggleClassSelection = (className: string) => {
    setFormData((prev) => {
      const exists = prev.classes.includes(className);
      return {
        ...prev,
        classes: exists ? prev.classes.filter((c) => c !== className) : [...prev.classes, className],
      };
    });
  };

  // Toggle stream selection in form
  const toggleStreamSelection = (streamName: string) => {
    setFormData((prev) => {
      const exists = prev.streams.includes(streamName);
      return {
        ...prev,
        streams: exists ? prev.streams.filter((s) => s !== streamName) : [...prev.streams, streamName],
      };
    });
  };

  // Print schedule function using PrintPreviewModal
  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  const generateTimetablePrintableHtml = () => {
    const timeSlots = [
      { id: '09:00–11:00', name: '09:00 – 11:00 (صباحاً)' },
      { id: '11:00–13:00', name: '11:00 – 13:00 (صباحاً)' },
      { id: '13:00–14:00', name: '13:00 – 14:00 (استراحة الغداء)', isBreak: true },
      { id: '14:00–16:00', name: '14:00 – 16:00 (بعد الزوال)' },
    ];

    return `
      <div class="header-title-box">
        <h1>التخطيط واستعمال الزمن الأسبوعي الرسمي</h1>
        <div class="meta-bar">
          <span><strong>الأسبوع:</strong> ${weekRangeString}</span>
          <span><strong>السنة الدراسية:</strong> ${settings.schoolYear}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 12%; text-align: center;">اليوم / التوقيت</th>
            ${timeSlots.map(ts => `<th style="text-align: center;">${ts.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${DAYS_OF_WEEK.map(day => `
            <tr>
              <td style="text-align: center; font-weight: bold; background-color: #f1f5f9;">${day}</td>
              ${timeSlots.map(ts => {
                if (ts.isBreak) {
                  return `<td style="text-align: center; background-color: #fef3c7; color: #92400e; font-weight: bold; font-size: 8.5pt;">استراحة وتغذية</td>`;
                }
                const session = filteredSchedule.find(s => s.dayOfWeek === day && s.timeSlot === ts.id);
                if (!session) {
                  return `<td style="text-align: center; color: #94a3b8; font-style: italic;">— فارغ —</td>`;
                }
                return `
                  <td style="padding: 6px;">
                    <div style="font-weight: bold; color: #0f172a; font-size: 10pt;">${session.subject}</div>
                    <div style="font-size: 8.5pt; color: #0369a1; font-weight: 600;">👨‍🏫 المنشط: ${session.animator}</div>
                    <div style="font-size: 8pt; color: #475569;">🏫 ${session.classes.join('، ')}</div>
                    <div style="font-size: 8pt; color: #059669; font-weight: 600;">نوع الحصة: ${session.sessionType}</div>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center; font-size: 9.5pt; page-break-inside: avoid;">
        <div>
          <strong>منسق الأنشطة التربوية والمهنية</strong><br /><br /><br />
          <span>...............................</span>
        </div>
        <div>
          <strong>مصادقة رئيس المؤسسة / المدير</strong><br /><br /><br />
          <span>...............................</span>
        </div>
      </div>
    `;
  };

  return (
    <div className="space-y-6">
      
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
      
      {/* Header Bar & Tab Switcher */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl">
                <CalendarIcon className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  استعمال الزمن الأسبوعي
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إدارة وبرمجة حصص التأهيل التربوي والمهني والأشغال التطبيقية بالمركز
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Subtabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setSubTab('timetable')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subTab === 'timetable'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>جدول الحصص</span>
              </button>
              <button
                onClick={() => setSubTab('holidays')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subTab === 'holidays'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>العطل المدرسية والوطنية ({holidays.length})</span>
              </button>
            </div>

            {/* Action Buttons */}
            {subTab === 'timetable' && (
              <>
                <button
                  onClick={() => setIsWeeklyCallSheetOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>تصدير ورقة النداء الأسبوعية (PDF)</span>
                </button>

                <button
                  onClick={() => handleOpenAddModal()}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة حصة جديدة</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة استعمال الزمن</span>
                </button>
              </>
            )}


            {subTab === 'holidays' && (
              <button
                onClick={() => setIsHolidayModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عطلة جديدة</span>
              </button>
            )}

          </div>

        </div>

        {/* Timetable Controls: Week Switcher & Filters */}
        {subTab === 'timetable' && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                title="الأسبوع السابق"
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  weekOffset === 0
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                الأسبوع الحالي
              </button>

              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                title="الأسبوع المقبل"
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                {weekRangeString}
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold ml-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>التصفية:</span>
              </div>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="الكل">جميع الأقسام</option>
                {settings.classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              {/* Stream Filter */}
              <select
                value={filterStream}
                onChange={(e) => setFilterStream(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="الكل">جميع الشعب</option>
                {settings.streams.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Session Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="الكل">جميع أنواع التأهيل</option>
                <option value="التأهيل التربوي">التأهيل التربوي</option>
                <option value="التأهيل المهني">التأهيل المهني</option>
              </select>

              {/* Animator Filter */}
              {animators && animators.length > 0 && (
                <select
                  value={filterAnimator}
                  onChange={(e) => setFilterAnimator(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 max-w-[150px] truncate"
                >
                  <option value="الكل">جميع المنشطين</option>
                  {animators.map((a) => (
                    <option key={a.id} value={a.arabicName}>
                      {a.arabicName}
                    </option>
                  ))}
                </select>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Main Timetable View */}
      {subTab === 'timetable' && (
        <div className="printable-schedule space-y-4">
          
          {/* Printable Official Header (only visible on print or PDF export) */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-xl font-black">المملكة المغربية</h1>
            <p className="text-sm font-bold">وزارة التربية الوطنية والتعليم الأولية والرياضة</p>
            <p className="text-base font-extrabold mt-1">{settings.schoolName}</p>
            <h2 className="text-lg font-black text-emerald-800 mt-2 underline">
              استعمال الزمن الأسبوعي — {settings.schoolYear}
            </h2>
            <p className="text-xs text-slate-600 mt-1">{weekRangeString}</p>
          </div>

          {/* Timetable Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 w-36 border-l border-slate-200 dark:border-slate-700">
                    التوقيت / اليوم
                  </th>
                  {weekDates.map(({ dayName, formattedDate, isoDate }) => {
                    const holiday = getHolidayForDate(isoDate);
                    return (
                      <th
                        key={dayName}
                        className={`p-3 text-center text-xs font-bold border-l last:border-l-0 border-slate-200 dark:border-slate-700 ${
                          holiday
                            ? 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-extrabold">{dayName}</span>
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {formattedDate}
                          </span>
                          {holiday && (
                            <span className="mt-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {holiday.title}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                
                {OFFICIAL_SLOTS.map((slot) => {
                  if (slot.isBreak) {
                    return (
                      <tr key={slot.id} className="bg-slate-100/50 dark:bg-slate-800/40">
                        <td
                          colSpan={6}
                          className="p-2.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 border-y border-slate-200 dark:border-slate-700 tracking-wide"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.label} — فترة استراحة ومنع برمجة الحصص</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      
                      {/* Slot Column */}
                      <td className="p-3 text-center font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold dir-ltr dir-left">
                            {slot.range}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {slot.id === 'morning_ext'
                              ? 'تأهيل ممتد'
                              : slot.id.startsWith('morning')
                              ? 'فترة صباحية'
                              : 'بعد الزوال'}
                          </span>
                        </div>
                      </td>

                      {/* Day Columns */}
                      {weekDates.map(({ dayName, isoDate }) => {
                        const holiday = getHolidayForDate(isoDate);

                        // Find matching sessions for this day and slot
                        const matchingSessions = filteredSchedule.filter((s) => {
                          if (s.dayOfWeek !== dayName) return false;
                          
                          // Check if specific date matches if non-recurring
                          if (!s.isRecurring && s.specificDate && s.specificDate !== isoDate) {
                            return false;
                          }

                          return s.timeSlot === slot.range;
                        });

                        return (
                          <td
                            key={dayName}
                            className={`p-2 border-l last:border-l-0 border-slate-200 dark:border-slate-700 align-top h-32 w-1/5 ${
                              holiday ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                            }`}
                          >
                            <div className="space-y-2 h-full flex flex-col justify-between">
                              
                              <div className="space-y-2">
                                {matchingSessions.length === 0 ? (
                                  <div className="h-full min-h-[70px] flex items-center justify-center group no-print">
                                    <button
                                      onClick={() => handleOpenAddModal(dayName, slot.range)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center gap-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>إضافة حصة</span>
                                    </button>
                                  </div>
                                ) : (
                                  matchingSessions.map((session) => {
                                    const isEducational = session.sessionType === 'التأهيل التربوي';

                                    return (
                                      <div
                                        key={session.id}
                                        className={`p-2.5 rounded-xl border transition-all text-xs relative group ${
                                          isEducational
                                            ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                                            : 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                                        }`}
                                      >
                                        
                                        {/* Action buttons hover overlay */}
                                        <div className="no-print absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                          <button
                                            onClick={() => handleOpenEditModal(session)}
                                            title="تعديل الحصة"
                                            className="p-1 text-slate-600 hover:text-blue-600 dark:text-slate-300"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            title="حذف الحصة"
                                            className="p-1 text-slate-600 hover:text-rose-600 dark:text-slate-300"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>

                                        {/* Session Type Badge */}
                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                              isEducational
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
                                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200'
                                            }`}
                                          >
                                            {session.sessionType}
                                          </span>

                                          {session.classes.length > 1 && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                              مشترك ({session.classes.length} أقسام)
                                            </span>
                                          )}
                                        </div>

                                        {/* Subject Title */}
                                        <h4 className="font-black text-sm mb-1 leading-snug">
                                          {session.subject}
                                        </h4>

                                        {/* Animator */}
                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                          <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                                          <span>{session.animator}</span>
                                        </div>

                                        {/* Classes & Streams */}
                                        <div className="space-y-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5 mt-1.5">
                                          <div className="flex items-center gap-1">
                                            <BookOpen className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                            <span className="truncate">{session.classes.join('، ')}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Layers className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                            <span className="truncate">{session.streams.join('، ')}</span>
                                          </div>
                                        </div>

                                        {/* Quick Jump to Attendance Recording */}
                                        {onOpenAttendanceForSession && !holiday && (
                                          <div className="no-print mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <button
                                              onClick={() => onOpenAttendanceForSession(session, isoDate)}
                                              className="w-full py-1 px-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center justify-center gap-1 transition-colors"
                                            >
                                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                              <span>تسجيل حضور الحصة</span>
                                            </button>
                                          </div>
                                        )}

                                      </div>
                                    );
                                  })
                                )}
                              </div>

                            </div>
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>

          {/* Official Print Footer for Weekly Schedule (Only in print) */}
          <div className="hidden print:flex mt-4 pt-3 border-t-2 border-slate-800 justify-between items-center text-xs font-semibold text-slate-800">
            <span>مركز الفرصة الثانية - الجيل الجديد زرارة · جدول استعمال الزمن الأسبوعي الرسمي</span>
            <span>تاريخ الطبع: {new Date().toLocaleDateString('ar-MA')} · السنة الدراسية: {settings.schoolYear}</span>
          </div>

        </div>
      )}

      {/* Holidays List View */}
      {subTab === 'holidays' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                قائمة العطل المدرسية والوطنية والدينية
              </h3>
              <p className="text-xs text-slate-500">
                تُستخدم العطل لتنبيه إدارة المركز عند محاولة تسجيل الحضور أو برمجة الحصص خلال أيام التوقف الرسمي
              </p>
            </div>
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة عطلة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        h.type === 'مدرسية'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : h.type === 'وطنية'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      عطلة {h.type}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {h.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 dir-ltr dir-left">
                    <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>من {h.startDate} إلى {h.endDate}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteHoliday(h.id)}
                  title="حذف العطلة"
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Scheduled Session */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-8 relative">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                  <CalendarIcon className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingSession ? 'تعديل بيانات الحصة' : 'برمجة حصة جديدة في استعمال الزمن'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSession} className="mt-4 space-y-4">
              
              {/* Session Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع التأهيل <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, sessionType: 'التأهيل التربوي' }))}
                    className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                      formData.sessionType === 'التأهيل التربوي'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>التأهيل التربوي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, sessionType: 'التأهيل المهني' }))}
                    className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                      formData.sessionType === 'التأهيل المهني'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>التأهيل المهني</span>
                  </button>
                </div>
              </div>

              {/* Day of Week & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اليوم الأسبوعي <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    فترة التوقيت <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.timeSlot}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timeSlot: e.target.value as SessionTime }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="09:00–11:00">09:00 – 11:00 (فترة صباحية أولى)</option>
                    <option value="11:00–13:00">11:00 – 13:00 (فترة صباحية ثانية)</option>
                    <option value="09:00–13:00">09:00 – 13:00 (تأهيل ممتد / ورشة)</option>
                    <option value="14:00–16:00">14:00 – 16:00 (فترة بعد الزوال)</option>
                  </select>
                </div>
              </div>

              {/* Subject & Animator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المادة أو ورشة التكوين <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="مثال: ورشة الكهرباء العامة / الرياضيات"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المنشط أو المؤطر المسؤول <span className="text-rose-500">*</span>
                  </label>
                  {animators && animators.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={formData.animatorId || (animators.find((a) => a.arabicName === formData.animator)?.id || '')}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const found = animators.find((a) => a.id === selectedId);
                          if (found) {
                            setFormData((prev) => ({
                              ...prev,
                              animator: found.arabicName,
                              animatorId: found.id,
                              sessionType: found.activityType || prev.sessionType,
                            }));
                          } else {
                            setFormData((prev) => ({ ...prev, animatorId: '' }));
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- اختر من لائحة المنشطين --</option>
                        {animators.map((a) => (
                          <option key={a.id} value={a.id} disabled={a.status !== 'نشط'}>
                            {a.arabicName} — {a.specialty} ({a.status})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formData.animator}
                        onChange={(e) => setFormData((prev) => ({ ...prev, animator: e.target.value, animatorId: '' }))}
                        placeholder="أو اكتب اسم المنشط يدوياً"
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formData.animator}
                      onChange={(e) => setFormData((prev) => ({ ...prev, animator: e.target.value }))}
                      placeholder="مثال: أ. طارق التازي"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                    />
                  )}
                </div>
              </div>

              {/* Target Classes Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الأقسام المعنية بالحصة <span className="text-rose-500">*</span> (يمكن تحديد أكثر من قسم)
                </label>
                <div className="flex flex-wrap gap-2">
                  {settings.classes.map((cls) => {
                    const isSelected = formData.classes.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClassSelection(cls)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                        <span>{cls}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Streams Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الشعب التكوينية المعنية <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {settings.streams.map((st) => {
                    const isSelected = formData.streams.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStreamSelection(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 text-amber-600" /> : null}
                        <span>{st}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  {editingSession ? 'حفظ التعديلات' : 'إضافة الحصة'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Add Holiday */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إضافة عطلة رسمية جديدة
              </h3>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم أو عنوان العطلة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={holidayFormData.title}
                  onChange={(e) => setHolidayFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: ذكرى المسيرة الخضراء / العطلة البينية الأولى"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع العطلة
                </label>
                <select
                  value={holidayFormData.type}
                  onChange={(e) =>
                    setHolidayFormData((prev) => ({
                      ...prev,
                      type: e.target.value as 'مدرسية' | 'وطنية' | 'دينية',
                    }))
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <option value="مدرسية">مدرسية</option>
                  <option value="وطنية">وطنية</option>
                  <option value="دينية">دينية</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ البداية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={holidayFormData.startDate}
                    onChange={(e) => setHolidayFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ النهاية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={holidayFormData.endDate}
                    onChange={(e) => setHolidayFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
                >
                  إضافة العطلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal: Weekly Call Sheet PDF Export */}
      <WeeklyCallSheetModal
        isOpen={isWeeklyCallSheetOpen}
        onClose={() => setIsWeeklyCallSheetOpen(false)}
        learners={learners}
        attendance={attendance}
        schedule={schedule}
        holidays={holidays}
        settings={settings}
        defaultClass={filterClass}
        defaultWeekOffset={weekOffset}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title="استعمال الزمن الأسبوعي الرسمي"
        settings={settings}
        printableBodyHtml={generateTimetablePrintableHtml()}
        defaultOrientation="landscape"
        fileName={`استعمال_الزمن_${settings.schoolYear.replace(/\s+/g, '_')}`}
      />

    </div>
  );
};


