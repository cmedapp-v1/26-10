import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Printer, 
  Eye, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Phone, 
  Mail, 
  MessageCircle, 
  Briefcase, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Clock,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Animator, ScheduledSession, AppSettings, SessionType, AnimatorStatus } from '../types';
import { exportAnimatorsToExcel } from '../utils/excelImportExport';
import { AnimatorModal } from './AnimatorModal';
import { AnimatorCardModal } from './AnimatorCardModal';
import { ConfirmDialog } from './ConfirmDialog';

interface AnimatorManagementProps {
  animators: Animator[];
  setAnimators: React.Dispatch<React.SetStateAction<Animator[]>>;
  schedule: ScheduledSession[];
  setSchedule?: React.Dispatch<React.SetStateAction<ScheduledSession[]>>;
  settings: AppSettings;
  onNavigateToSchedule?: (animatorName?: string) => void;
}

export const AnimatorManagement: React.FC<AnimatorManagementProps> = ({
  animators,
  setAnimators,
  schedule,
  settings,
  onNavigateToSchedule,
}) => {
  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterActivityType, setFilterActivityType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStream, setFilterStream] = useState<string>('all');

  // Selection for bulk export/print
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [animatorToEdit, setAnimatorToEdit] = useState<Animator | null>(null);

  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [selectedAnimatorForCard, setSelectedAnimatorForCard] = useState<Animator | null>(null);

  // Confirmation dialog state
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
    type: 'info',
  });

  // Extract unique specialties from current animators
  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    animators.forEach((a) => {
      if (a.specialty) set.add(a.specialty.trim());
    });
    return Array.from(set);
  }, [animators]);

  // Map session counts and hours per animator
  const animatorScheduleStats = useMemo(() => {
    const stats: Record<string, { sessionCount: number; hours: number }> = {};
    animators.forEach((a) => {
      stats[a.id] = { sessionCount: 0, hours: 0 };
    });

    schedule.forEach((s) => {
      const matched = animators.find(
        (a) =>
          (s.animatorId && s.animatorId === a.id) ||
          s.animator.trim().toLowerCase() === a.arabicName.trim().toLowerCase()
      );
      if (matched) {
        if (!stats[matched.id]) {
          stats[matched.id] = { sessionCount: 0, hours: 0 };
        }
        stats[matched.id].sessionCount += 1;
        let h = 2;
        if (s.timeSlot === '09:00–13:00') h = 4;
        stats[matched.id].hours += h;
      }
    });

    return stats;
  }, [animators, schedule]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = animators.length;
    const active = animators.filter((a) => a.status === 'نشط').length;
    const inactive = animators.filter((a) => a.status === 'غير نشط').length;
    const suspended = animators.filter((a) => a.status === 'متوقف عن العمل').length;
    const pedagogical = animators.filter((a) => a.activityType === 'التأهيل التربوي').length;
    const vocational = animators.filter((a) => a.activityType === 'التأهيل المهني').length;
    const totalSessions = Object.values(animatorScheduleStats).reduce((acc, curr) => acc + curr.sessionCount, 0);

    return {
      total,
      active,
      inactive,
      suspended,
      pedagogical,
      vocational,
      totalSessions,
    };
  }, [animators, animatorScheduleStats]);

  // Filtered Animators
  const filteredAnimators = useMemo(() => {
    return animators.filter((a) => {
      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchNameAr = a.arabicName.toLowerCase().includes(query);
        const matchNameFr = Boolean(a.frenchName && a.frenchName.toLowerCase().includes(query));
        const matchReg = a.registrationNumber.toLowerCase().includes(query);
        const matchPhone = a.phone.includes(query);
        const matchSpecialty = a.specialty.toLowerCase().includes(query);
        if (!matchNameAr && !matchNameFr && !matchReg && !matchPhone && !matchSpecialty) {
          return false;
        }
      }

      // Filter by Specialty
      if (filterSpecialty !== 'all' && a.specialty !== filterSpecialty) {
        return false;
      }

      // Filter by Activity Type
      if (filterActivityType !== 'all' && a.activityType !== filterActivityType) {
        return false;
      }

      // Filter by Status
      if (filterStatus !== 'all' && a.status !== filterStatus) {
        return false;
      }

      // Filter by Class
      if (filterClass !== 'all' && !a.assignedClasses.includes(filterClass)) {
        return false;
      }

      // Filter by Stream
      if (filterStream !== 'all' && !a.assignedStreams.includes(filterStream)) {
        return false;
      }

      return true;
    });
  }, [animators, searchTerm, filterSpecialty, filterActivityType, filterStatus, filterClass, filterStream]);

  // Multi-selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAnimators.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add / Edit Handlers
  const handleOpenAdd = () => {
    setAnimatorToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (animator: Animator) => {
    setAnimatorToEdit(animator);
    setIsAddEditModalOpen(true);
  };

  const handleSaveAnimator = (animator: Animator) => {
    if (animatorToEdit) {
      // Update
      setAnimators((prev) => prev.map((a) => (a.id === animator.id ? animator : a)));
      // Also update selected if card open
      if (selectedAnimatorForCard?.id === animator.id) {
        setSelectedAnimatorForCard(animator);
      }
    } else {
      // Add
      setAnimators((prev) => [animator, ...prev]);
    }
  };

  // Status Toggle / Change
  const handleChangeStatus = (animator: Animator, newStatus: AnimatorStatus) => {
    if (animator.status === newStatus) return;

    setConfirmConfig({
      isOpen: true,
      title: 'تأكيد تغيير الوضعية المهنية',
      message: `هل أنت متأكد من تغيير وضعية المنشط «${animator.arabicName}» من (${animator.status}) إلى (${newStatus})؟`,
      type: newStatus === 'نشط' ? 'info' : 'warning',
      onConfirm: () => {
        setAnimators((prev) =>
          prev.map((a) => (a.id === animator.id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a))
        );
        if (selectedAnimatorForCard?.id === animator.id) {
          setSelectedAnimatorForCard({ ...animator, status: newStatus });
        }
      },
    });
  };

  // Export to Excel
  const handleExportExcel = (onlySelected = false) => {
    const listToExport = onlySelected
      ? animators.filter((a) => selectedIds.includes(a.id))
      : filteredAnimators;

    if (listToExport.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }

    const filename = `تدبير_المنشطين_زرارة_${settings.schoolYear.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportAnimatorsToExcel(listToExport, filename);
  };

  // Print List using isolated iframe
  const handlePrintList = (onlySelected = false) => {
    const listToPrint = onlySelected
      ? animators.filter((a) => selectedIds.includes(a.id))
      : filteredAnimators;

    if (listToPrint.length === 0) {
      alert('لا توجد بيانات للطباعة.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const rowsHtml = listToPrint.map((a, idx) => {
      const stats = animatorScheduleStats[a.id] || { sessionCount: 0, hours: 0 };
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${a.registrationNumber}</td>
          <td>
            <div style="font-weight: bold; font-size: 11pt;">${a.arabicName}</div>
            ${a.frenchName ? `<div style="font-size: 8.5pt; color: #475569; font-family: sans-serif;">${a.frenchName}</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 600;">${a.activityType}</td>
          <td style="font-weight: 600;">${a.specialty}</td>
          <td>${a.assignedClasses.join('، ') || 'غير محدد'}</td>
          <td>${a.assignedStreams.join('، ') || 'غير محدد'}</td>
          <td style="text-align: center; font-family: monospace;" dir="ltr">${a.phone}</td>
          <td style="text-align: center;">${stats.sessionCount} حصص (${stats.hours} س)</td>
          <td style="text-align: center; font-weight: bold;">${a.status}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>لائحة المنشطين والمؤطرين - مدرسة الفرصة الثانية الجيل الجديد زرارة</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            line-height: 1.35;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .title-banner {
            background-color: #f8fafc;
            border: 1.5px solid #0f172a;
            text-align: center;
            padding: 8px;
            margin-bottom: 12px;
            border-radius: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            padding: 6px 4px;
            font-weight: bold;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 5px 4px;
          }
          .summary-bar {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            font-weight: bold;
            margin-top: 10px;
            padding: 6px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .signature-box {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 9.5pt;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div style="text-align: right; line-height: 1.35; font-size: 9.5pt;">
            <div style="font-weight: bold; font-size: 10.5pt;">المملكة المغربية</div>
            <div style="font-weight: bold; color: #334155;">وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
            <div style="color: #475569;">الأكاديمية الجهوية للتربية والتكوين جهة الرباط - سلا - القنيطرة</div>
            <div style="color: #475569;">المديرية الإقليمية بسيدي قاسم</div>
          </div>
          <div style="text-align: center;">
            ${settings.ministryLogoDataURL ? `<img src="${settings.ministryLogoDataURL}" style="height: 55px; max-width: 130px; object-fit: contain;" alt="شعار الوزارة" />` : ''}
          </div>
          <div style="text-align: left; line-height: 1.35; font-size: 9.5pt;">
            <div style="font-weight: bold; font-size: 10pt; color: #1e3a8a;">مركز الفرصة الثانية - الجيل الجديد زرارة</div>
            <div style="color: #475569;">السنة الدراسية: ${settings.schoolYear}</div>
            <div style="color: #64748b; font-size: 8.5pt;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-MA')}</div>
          </div>
        </div>

        <div class="title-banner">
          <h2 style="margin: 0; font-size: 13pt; color: #0f172a;">لائحة المنشطين والمؤطرين (LISTE DES ANIMATEURS)</h2>
          <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
            إجمالي المنشطين: <strong>${listToPrint.length}</strong> — نشطون: <strong>${listToPrint.filter((a) => a.status === 'نشط').length}</strong> — تأهيل تربوي: <strong>${listToPrint.filter((a) => a.activityType === 'التأهيل التربوي').length}</strong> — تأهيل مهني: <strong>${listToPrint.filter((a) => a.activityType === 'التأهيل المهني').length}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">ت</th>
              <th style="width: 70px;">الرقم</th>
              <th style="width: 140px;">الاسم الكامل</th>
              <th style="width: 80px;">نوع النشاط</th>
              <th style="width: 130px;">التخصص / المجال</th>
              <th style="width: 110px;">الأقسام</th>
              <th style="width: 110px;">الشعب</th>
              <th style="width: 85px;">الهاتف</th>
              <th style="width: 80px;">الحصص أسبوعياً</th>
              <th style="width: 70px;">الوضعية</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signature-box">
          <div>
            <strong>توقيع منسق الأنشطة والتكوين</strong><br /><br /><br />
            <span>...............................</span>
          </div>
          <div>
            <strong>إدارة المركز / خاتم المؤسسة</strong><br /><br /><br />
            <span>...............................</span>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSpecialty('all');
    setFilterActivityType('all');
    setFilterStatus('all');
    setFilterClass('all');
    setFilterStream('all');
    setSelectedIds([]);
  };

  const isAllSelected = filteredAnimators.length > 0 && selectedIds.length === filteredAnimators.length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                قسم تدبير المنشطين والمؤطرين
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-sans">
                Gestion des Animateurs
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              مدرسة الفرصة الثانية الجيل الجديد زرارة — بطاقات المنشطين، الوضعية المهنية، وربط الحصص الأسبوعية
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExportExcel(false)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => handlePrintList(false)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>طباعة اللائحة PDF</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة منشط جديد</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي المنشطين</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">مسجلون بالمركز</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">المنشطون النشطون</div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{stats.active}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">يزاولون مهامهم</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">غير نشطين</div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{stats.inactive}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">إجازات أو مؤقت</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">متوقفون عن العمل</div>
          <div className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">{stats.suspended}</div>
          <div className="text-[10px] text-rose-600 dark:text-rose-500 mt-0.5">توقيف مؤقت</div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">تأهيل تربوي / مهني</div>
          <div className="text-lg font-black text-blue-900 dark:text-blue-200 mt-1">
            {stats.pedagogical} <span className="text-xs font-normal text-slate-500">/</span> {stats.vocational}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">تربوي مقابل مهني</div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">الحصص المبرمجة</div>
          <div className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-1">{stats.totalSessions}</div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">في الجدول الأسبوعي</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم بالعربية أو الفرنسية، الرقم الداخلي، الهاتف، أو التخصص..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                مسح
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الوضعيات</option>
              <option value="نشط">نشط (Actif)</option>
              <option value="غير نشط">غير نشط (Inactif)</option>
              <option value="متوقف عن العمل">متوقف عن العمل</option>
            </select>

            {/* Activity Type */}
            <select
              value={filterActivityType}
              onChange={(e) => setFilterActivityType(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع أنواع الأنشطة</option>
              <option value="التأهيل التربوي">التأهيل التربوي</option>
              <option value="التأهيل المهني">التأهيل المهني</option>
            </select>

            {/* Specialty */}
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
            >
              <option value="all">جميع التخصصات</option>
              {allSpecialties.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>

            {/* Class */}
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
            >
              <option value="all">جميع الأقسام</option>
              {settings.classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            {/* Reset */}
            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
              title="إعادة تعيين الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>

        {/* Selected Items Floating Action Banner */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-200">
              تم تحديد <span className="underline">{selectedIds.length}</span> منشط(ة)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportExcel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير المحددين (Excel)</span>
              </button>
              <button
                onClick={() => handlePrintList(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المحددين (PDF)</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 font-bold"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3 w-12 text-center">ت</th>
                <th className="py-3.5 px-3 w-28">الرقم التعريفي</th>
                <th className="py-3.5 px-4">الاسم الكامل للمنشط</th>
                <th className="py-3.5 px-3">نوع النشاط</th>
                <th className="py-3.5 px-4">التخصص / مجال التكوين</th>
                <th className="py-3.5 px-4">الأقسام والشعب المسندة</th>
                <th className="py-3.5 px-3">الهاتف والواتساب</th>
                <th className="py-3.5 px-3 text-center">الحصص الأسبوعية</th>
                <th className="py-3.5 px-3 text-center">الوضعية</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAnimators.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">لم يتم العثور على أي منشط يطابق معايير البحث.</p>
                    <p className="text-xs text-slate-400 mt-1">يمكنك تعديل كلمات البحث أو ضبط الفلاتر أو إضافة منشط جديد.</p>
                  </td>
                </tr>
              ) : (
                filteredAnimators.map((animator, index) => {
                  const isSelected = selectedIds.includes(animator.id);
                  const sessionStats = animatorScheduleStats[animator.id] || { sessionCount: 0, hours: 0 };

                  return (
                    <tr
                      key={animator.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(animator.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Index */}
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">
                        {index + 1}
                      </td>

                      {/* Code */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {animator.registrationNumber}
                        </span>
                      </td>

                      {/* Names */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {animator.arabicName}
                        </div>
                        {animator.frenchName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans" dir="ltr">
                            {animator.frenchName}
                          </div>
                        )}
                      </td>

                      {/* Activity Type */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          animator.activityType === 'التأهيل التربوي'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                        }`}>
                          {animator.activityType === 'التأهيل التربوي' ? (
                            <GraduationCap className="w-3 h-3" />
                          ) : (
                            <Briefcase className="w-3 h-3" />
                          )}
                          <span>{animator.activityType}</span>
                        </span>
                      </td>

                      {/* Specialty */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {animator.specialty}
                        </div>
                      </td>

                      {/* Assigned Classes & Streams */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {animator.assignedClasses.map((cls) => (
                            <span
                              key={cls}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                        {animator.assignedStreams.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            {animator.assignedStreams.join('، ')}
                          </div>
                        )}
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 font-mono font-semibold" dir="ltr">
                          <span>{animator.phone}</span>
                          <a
                            href={`https://wa.me/212${animator.phone.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            title="مراسلة عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Weekly Sessions Count */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onNavigateToSchedule && onNavigateToSchedule(animator.arabicName)}
                          className="inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 transition border border-slate-200 dark:border-slate-700"
                          title="عرض في جدول الحصص الأسبوعي"
                        >
                          <span className="font-bold text-xs">{sessionStats.sessionCount} حصص</span>
                          <span className="text-[9px] text-slate-400">{sessionStats.hours} س / أسبوعياً</span>
                        </button>
                      </td>

                      {/* Status Dropdown / Quick Switch */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={animator.status}
                          onChange={(e) => handleChangeStatus(animator, e.target.value as AnimatorStatus)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-full border cursor-pointer focus:outline-none transition ${
                            animator.status === 'نشط'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                              : animator.status === 'غير نشط'
                              ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <option value="نشط">نشط</option>
                          <option value="غير نشط">غير نشط</option>
                          <option value="متوقف عن العمل">متوقف</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAnimatorForCard(animator);
                              setIsCardModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 rounded-lg transition"
                            title="عرض البطاقة التفصيلية"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(animator)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition"
                            title="تعديل بيانات المنشط"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            عرض <span className="font-bold text-slate-900 dark:text-white">{filteredAnimators.length}</span> من أصل{' '}
            <span className="font-bold text-slate-900 dark:text-white">{animators.length}</span> منشط(ة)
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>نشط: {stats.active}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span>غير نشط: {stats.inactive}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>متوقف: {stats.suspended}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatorModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={handleSaveAnimator}
        animatorToEdit={animatorToEdit}
        existingAnimators={animators}
        settings={settings}
      />

      {/* Detailed Card Modal */}
      <AnimatorCardModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setSelectedAnimatorForCard(null);
        }}
        animator={selectedAnimatorForCard}
        schedule={schedule}
        settings={settings}
        onEdit={(animator) => {
          setIsCardModalOpen(false);
          handleOpenEdit(animator);
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        type={confirmConfig.type}
      />
    </div>
  );
};
