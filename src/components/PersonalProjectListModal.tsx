import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  X, 
  Printer, 
  Download, 
  Filter, 
  RotateCcw, 
  Users, 
  Search, 
  CheckCircle2, 
  Compass, 
  Briefcase, 
  GraduationCap, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { Learner, AppSettings, PersonalProjectPath } from '../types';
import * as XLSX from 'xlsx';
import { PrintPreviewModal } from './PrintPreviewModal';
import { printHtmlDocument } from '../utils/printUtils';

interface PersonalProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  learners: Learner[];
  settings: AppSettings;
}

export const PersonalProjectListModal: React.FC<PersonalProjectListModalProps> = ({ 
  isOpen, 
  onClose, 
  learners, 
  settings 
}) => {
  // Filter States
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Applied Filters State (committed when clicking "تطبيق الفلاتر")
  const [appliedFilters, setAppliedFilters] = useState({
    project: 'all',
    className: 'all',
    stream: 'all',
    status: 'all',
    gender: 'all',
    search: ''
  });

  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Dynamic streams linked to selected class
  const availableStreams = useMemo(() => {
    if (classFilter === 'all') {
      const allStreams = new Set<string>(settings.streams);
      learners.forEach(l => {
        if (l.stream) allStreams.add(l.stream);
      });
      return Array.from(allStreams);
    }
    const streamsInClass = new Set<string>();
    learners.filter(l => l.className === classFilter).forEach(l => {
      if (l.stream) streamsInClass.add(l.stream);
    });
    if (streamsInClass.size === 0) {
      return settings.streams;
    }
    return Array.from(streamsInClass);
  }, [classFilter, learners, settings.streams]);

  // Reset stream when class changes if stream is no longer valid
  const handleClassChange = (newClass: string) => {
    setClassFilter(newClass);
    if (newClass !== 'all') {
      const streamsInClass = learners
        .filter(l => l.className === newClass)
        .map(l => l.stream);
      if (streamFilter !== 'all' && !streamsInClass.includes(streamFilter)) {
        setStreamFilter('all');
      }
    }
  };

  // Filter application
  const applyFilters = () => {
    setAppliedFilters({
      project: projectFilter,
      className: classFilter,
      stream: streamFilter,
      status: statusFilter,
      gender: genderFilter,
      search: searchTerm.trim()
    });
  };

  // Filter reset
  const resetFilters = () => {
    setProjectFilter('all');
    setClassFilter('all');
    setStreamFilter('all');
    setStatusFilter('all');
    setGenderFilter('all');
    setSearchTerm('');
    setAppliedFilters({
      project: 'all',
      className: 'all',
      stream: 'all',
      status: 'all',
      gender: 'all',
      search: ''
    });
  };

  // Filtered Learners based on applied filters
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      // Personal project
      const matchesProject = appliedFilters.project === 'all' || 
        (appliedFilters.project === 'غير محدد' 
          ? (!l.personalProject || l.personalProject === 'غير محدد') 
          : l.personalProject === appliedFilters.project);

      // Class
      const matchesClass = appliedFilters.className === 'all' || l.className === appliedFilters.className;

      // Stream
      const matchesStream = appliedFilters.stream === 'all' || l.stream === appliedFilters.stream;

      // Administrative Status
      let matchesStatus = true;
      if (appliedFilters.status === 'نشط') {
        matchesStatus = l.status === 'نشط';
      } else if (appliedFilters.status === 'غير نشط') {
        matchesStatus = l.status !== 'نشط';
      } else if (appliedFilters.status === 'منقطع') {
        matchesStatus = l.status === 'منقطع';
      } else if (appliedFilters.status === 'مغادر') {
        matchesStatus = l.status === 'مغادر';
      }

      // Gender
      const matchesGender = appliedFilters.gender === 'all' || l.gender === appliedFilters.gender;

      // Search (Name, Registration number, Masar code)
      let matchesSearch = true;
      if (appliedFilters.search) {
        const query = appliedFilters.search.toLowerCase();
        matchesSearch = Boolean(
          (l.arabicName && l.arabicName.toLowerCase().includes(query)) ||
          (l.frenchName && l.frenchName.toLowerCase().includes(query)) ||
          (l.registrationNumber && l.registrationNumber.toLowerCase().includes(query)) ||
          (l.masarCode && l.masarCode.toLowerCase().includes(query))
        );
      }

      return matchesProject && matchesClass && matchesStream && matchesStatus && matchesGender && matchesSearch;
    });
  }, [learners, appliedFilters]);

  // Statistics of filtered learners
  const stats = useMemo(() => {
    const total = filteredLearners.length;
    const males = filteredLearners.filter(l => l.gender === 'ذكر').length;
    const females = filteredLearners.filter(l => l.gender === 'أنثى').length;
    
    const schoolIntegration = filteredLearners.filter(l => l.personalProject === 'الإدماج المدرسي').length;
    const vocationalTraining = filteredLearners.filter(l => l.personalProject === 'التكوين المهني').length;
    const jobMarket = filteredLearners.filter(l => l.personalProject === 'سوق الشغل').length;
    const unspecified = filteredLearners.filter(l => !l.personalProject || l.personalProject === 'غير محدد').length;

    return {
      total,
      males,
      females,
      schoolIntegration,
      vocationalTraining,
      jobMarket,
      unspecified
    };
  }, [filteredLearners]);

  // Helper text for applied filters summary
  const filtersSummaryText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`المشروع: ${appliedFilters.project === 'all' ? 'جميع المشاريع' : appliedFilters.project}`);
    parts.push(`القسم: ${appliedFilters.className === 'all' ? 'جميع الأقسام' : appliedFilters.className}`);
    parts.push(`الشعبة: ${appliedFilters.stream === 'all' ? 'جميع الشعب' : appliedFilters.stream}`);
    parts.push(`الحالة: ${appliedFilters.status === 'all' ? 'جميع الحالات' : appliedFilters.status}`);
    parts.push(`الجنس: ${appliedFilters.gender === 'all' ? 'الكل' : appliedFilters.gender}`);
    if (appliedFilters.search) {
      parts.push(`البحث: "${appliedFilters.search}"`);
    }
    return parts.join(' | ');
  }, [appliedFilters]);

  // Current formatted timestamp
  const currentTimestamp = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-MA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} - ${timeStr}`;
  }, []);

  if (!isOpen) return null;

  // Export to Excel
  const exportToExcel = () => {
    const titleRows = [
      ['المملكة المغربية'],
      ['وزارة التربية الوطنية والتعليم الأولي والرياضة'],
      ['الأكاديمية الجهوية للتربية والتكوين جهة الرباط - سلا - القنيطرة'],
      ['المديرية الإقليمية بسيدي قاسم'],
      [`${settings.schoolName} - ${settings.schoolNameFull}`],
      [''],
      ['لائحة المتعلمين حسب المشروع الشخصي'],
      [`السنة التكوينية / الدراسية: ${settings.schoolYear}`],
      [`تاريخ وتوقيت الاستخراج: ${currentTimestamp}`],
      [`الفلاتر المطبقة: ${filtersSummaryText}`],
      [`إحصائيات اللائحة: المجموع الكلي: ${stats.total} | ذكور: ${stats.males} | إناث: ${stats.females} | إدماج مدرسي: ${stats.schoolIntegration} | تكوين مهني: ${stats.vocationalTraining} | سوق الشغل: ${stats.jobMarket} | غير محدد: ${stats.unspecified}`],
      [''],
      [
        'الرقم الترتيبي',
        'الاسم الكامل (بالعربية)',
        'الاسم بالفرنسية',
        'رقم التسجيل الداخلي',
        'رقم مسار',
        'القسم',
        'الشعبة / المسار التكويني',
        'الجنس',
        'المشروع الشخصي',
        'الحالة الإدارية',
        'المستوى الدراسي السابق',
        'رقم هاتف ولي الأمر'
      ]
    ];

    const dataRows = filteredLearners.map((l, idx) => [
      idx + 1,
      l.arabicName || '',
      l.frenchName || '',
      l.registrationNumber || '',
      l.masarCode || '-',
      l.className || '',
      l.stream || '',
      l.gender || '',
      l.personalProject || 'غير محدد',
      l.status || 'نشط',
      l.previousLevel || '',
      l.parentPhone || ''
    ]);

    const worksheetData = [...titleRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Enable RTL on Excel worksheet
    ws['!views'] = [{ rightToLeft: true }];
    
    // Column widths
    ws['!cols'] = [
      { wch: 10 }, // N°
      { wch: 25 }, // Arabic Name
      { wch: 22 }, // French Name
      { wch: 18 }, // Reg No
      { wch: 16 }, // Masar
      { wch: 22 }, // Class
      { wch: 22 }, // Stream
      { wch: 10 }, // Gender
      { wch: 20 }, // Personal Project
      { wch: 14 }, // Status
      { wch: 22 }, // Previous Level
      { wch: 16 }, // Phone
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'لائحة المشروع الشخصي');
    XLSX.writeFile(wb, `لائحة_المشروع_الشخصي_${settings.schoolYear.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle print preview trigger
  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  // Helper to build body HTML for PrintPreviewModal
  const generatePrintableHtml = () => {
    const rowsHtml = filteredLearners.map((l, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td>
          <div style="font-weight: bold; font-size: 11pt;">${l.arabicName}</div>
          ${l.frenchName ? `<div style="font-size: 9pt; color: #475569; font-family: sans-serif;">${l.frenchName}</div>` : ''}
        </td>
        <td style="text-align: center; font-family: monospace; font-weight: bold; font-size: 10pt;">${l.registrationNumber || '-'}</td>
        <td style="text-align: center; font-family: monospace; font-size: 10pt;">${l.masarCode || '-'}</td>
        <td>${l.className}</td>
        <td>${l.stream}</td>
        <td style="text-align: center;">${l.gender}</td>
        <td style="font-weight: bold; color: #1e3a8a;">${l.personalProject || 'غير محدد'}</td>
        <td style="text-align: center;">${l.status}</td>
      </tr>
    `).join('');

    return `
      <div class="header-title-box">
        <h1>لائحة المتعلمين حسب المشروع الشخصي</h1>
        <div class="meta-bar">
          <span><strong>الفلاتر المعتمدة:</strong> ${filtersSummaryText}</span>
          <span><strong>تاريخ الاستخراج:</strong> ${currentTimestamp}</span>
        </div>
      </div>

      <div class="stats-badges">
        <span>إجمالي المتعلمين: <span style="color: #0369a1;">${stats.total}</span></span>
        <span>ذكور: <span style="color: #0284c7;">${stats.males}</span></span>
        <span>إناث: <span style="color: #d946ef;">${stats.females}</span></span>
        <span>|</span>
        <span>إدماج مدرسي: <span style="color: #4f46e5;">${stats.schoolIntegration}</span></span>
        <span>تكوين مهني: <span style="color: #059669;">${stats.vocationalTraining}</span></span>
        <span>سوق الشغل: <span style="color: #d97706;">${stats.jobMarket}</span></span>
        <span>غير محدد: <span style="color: #64748b;">${stats.unspecified}</span></span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 4%; text-align: center;">ت</th>
            <th style="width: 20%;">الاسم الكامل</th>
            <th style="width: 11%; text-align: center;">رقم التسجيل</th>
            <th style="width: 11%; text-align: center;">رقم مسار</th>
            <th style="width: 14%;">القسم</th>
            <th style="width: 14%;">الشعبة</th>
            <th style="width: 6%; text-align: center;">الجنس</th>
            <th style="width: 12%;">المشروع الشخصي</th>
            <th style="width: 8%; text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  };

  // Badge stylings for personal project
  const getProjectBadgeClass = (project?: string) => {
    switch (project) {
      case 'الإدماج المدرسي':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'التكوين المهني':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'سوق الشغل':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  // Badge stylings for administrative status
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'نشط':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
      case 'منقطع':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300';
      case 'مغادر':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-7xl w-full h-[94vh] flex flex-col overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>لائحة المشروع الشخصي للمتعلمين</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold tabular-nums">
                  {stats.total} متعلم
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إعداد ومعاينة وتصدير لائحة مسارات المشاريع الشخصية (مدرسة الفرصة الثانية الجيل الجديد زرارة)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Print / PDF Action */}
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl shadow-xs transition-all cursor-pointer"
              title="طباعة اللائحة الرسمية أو حفظها كـ PDF"
            >
              <Printer className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              <span>طباعة / تصدير PDF</span>
            </button>

            {/* Excel Export Action */}
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              title="تصدير إلى ملف Excel (.xlsx) باللغة العربية"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            {/* Close Modal */}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Panel */}
        <div className="p-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            
            {/* 1. Filter: Personal Project */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                المشروع الشخصي
              </label>
              <select 
                value={projectFilter} 
                onChange={e => setProjectFilter(e.target.value)} 
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">جميع المشاريع الشخصية</option>
                <option value="الإدماج المدرسي">الإدماج المدرسي</option>
                <option value="التكوين المهني">التكوين المهني</option>
                <option value="سوق الشغل">سوق الشغل</option>
                <option value="غير محدد">غير محدد</option>
              </select>
            </div>

            {/* 2. Filter: Class */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                القسم
              </label>
              <select 
                value={classFilter} 
                onChange={e => handleClassChange(e.target.value)} 
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">جميع الأقسام</option>
                {settings.classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 3. Filter: Stream / Track */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                الشعبة / المسار التكويني
              </label>
              <select 
                value={streamFilter} 
                onChange={e => setStreamFilter(e.target.value)} 
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">جميع الشعب</option>
                {availableStreams.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 4. Filter: Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                الحالة الإدارية
              </label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">جميع الحالات الإدارية</option>
                <option value="نشط">نشط</option>
                <option value="منقطع">منقطع عن التكوين</option>
                <option value="مغادر">أنهى التكوين / مغادر</option>
                <option value="غير نشط">غير نشط (الكل عدا نشط)</option>
              </select>
            </div>

            {/* 5. Filter: Gender */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                الجنس
              </label>
              <select 
                value={genderFilter} 
                onChange={e => setGenderFilter(e.target.value)} 
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">الكل (ذكور وإناث)</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                البحث السريع
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="اسم، رقم مسار، تسجيل..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyFilters(); }}
                  className="w-full pr-8 pl-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

          </div>

          {/* Action Buttons & Statistics Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            
            {/* Filter Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={applyFilters}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>تطبيق الفلاتر</span>
              </button>

              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>

            {/* Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold border border-slate-200 dark:border-slate-700">
                المجموع: <strong className="text-slate-900 dark:text-white tabular-nums">{stats.total}</strong>
              </span>
              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg font-bold border border-blue-100 dark:border-blue-900/50">
                ذكور: <strong className="tabular-nums">{stats.males}</strong>
              </span>
              <span className="px-2.5 py-1 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 rounded-lg font-bold border border-pink-100 dark:border-pink-900/50">
                إناث: <strong className="tabular-nums">{stats.females}</strong>
              </span>

              {/* Project breakdown pill indicators */}
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mr-2">
                (إدماج مدرسي: <strong className="text-blue-600">{stats.schoolIntegration}</strong> · 
                تكوين مهني: <strong className="text-emerald-600">{stats.vocationalTraining}</strong> · 
                شغل: <strong className="text-amber-600">{stats.jobMarket}</strong> · 
                غير محدد: <strong className="text-slate-600">{stats.unspecified}</strong>)
              </span>
            </div>

          </div>
        </div>

        {/* Printable/Preview Moroccan Official Sheet Header in Modal View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/50">
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 space-y-4">
            
            {/* Moroccan Official Letterhead */}
            <div className="flex flex-col md:flex-row justify-between items-start pb-4 border-b-2 border-slate-800 dark:border-slate-200 gap-4">
              
              {/* Ministry Block */}
              <div className="text-right text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white">المملكة المغربية</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
                <div className="text-slate-600 dark:text-slate-400">الأكاديمية الجهوية للتربية والتكوين جهة الرباط - سلا - القنيطرة</div>
                <div className="text-slate-600 dark:text-slate-400">المديرية الإقليمية بسيدي قاسم</div>
              </div>

              {/* Center Logo & Title */}
              <div className="text-center flex flex-col items-center">
                {settings.ministryLogoDataURL && (
                  <img 
                    src={settings.ministryLogoDataURL} 
                    alt="شعار الوزارة" 
                    className="h-14 w-auto object-contain mb-1"
                  />
                )}
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {settings.schoolName}
                </h1>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  السنة الدراسية: {settings.schoolYear}
                </div>
              </div>

              {/* Association / Managing Entity */}
              <div className="text-left md:text-left flex flex-col items-start md:items-end text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white">الهيئة المغربية للتربية والتنمية</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">مدرسة الفرصة الثانية الجيل الجديد</div>
                <div className="text-slate-600 dark:text-slate-400">مركز زرارة - سيدي قاسم</div>
                {settings.associationLogoDataURL && (
                  <img 
                    src={settings.associationLogoDataURL} 
                    alt="شعار الهيئة" 
                    className="h-10 w-auto object-contain mt-1"
                  />
                )}
              </div>

            </div>

            {/* Document Title Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                لائحة المتعلمين حسب المشروع الشخصي
              </h2>
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <span>
                  <strong>الفلاتر المطبقة:</strong> {filtersSummaryText}
                </span>
                <span>
                  <strong>تاريخ وتوقيت الاستخراج:</strong> {currentTimestamp}
                </span>
              </div>
            </div>

            {/* Summary Counters Bar */}
            <div className="flex flex-wrap items-center justify-around p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>إجمالي المتعلمين باللائحة: <strong className="text-amber-800 dark:text-amber-300 tabular-nums">{stats.total}</strong></span>
              <span>عدد الذكور: <strong className="text-blue-700 dark:text-blue-300 tabular-nums">{stats.males}</strong></span>
              <span>عدد الإناث: <strong className="text-pink-700 dark:text-pink-300 tabular-nums">{stats.females}</strong></span>
              <span>الإدماج المدرسي: <strong className="text-indigo-700 dark:text-indigo-300 tabular-nums">{stats.schoolIntegration}</strong></span>
              <span>التكوين المهني: <strong className="text-emerald-700 dark:text-emerald-300 tabular-nums">{stats.vocationalTraining}</strong></span>
              <span>سوق الشغل: <strong className="text-amber-700 dark:text-amber-300 tabular-nums">{stats.jobMarket}</strong></span>
              <span>غير محدد: <strong className="text-slate-600 dark:text-slate-400 tabular-nums">{stats.unspecified}</strong></span>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700 text-center w-12">N°</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700">الاسم الكامل للمتعلم</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700 text-center">رقم التسجيل</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700 text-center">رقم مسار</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700">القسم</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700">الشعبة / المسار التكويني</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700 text-center">الجنس</th>
                    <th className="p-2.5 border-l border-slate-200 dark:border-slate-700">المشروع الشخصي</th>
                    <th className="p-2.5 text-center">الحالة الإدارية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredLearners.length > 0 ? (
                    filteredLearners.map((learner, idx) => (
                      <tr 
                        key={learner.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800 text-center font-bold text-slate-500 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {learner.arabicName}
                          </div>
                          {learner.frenchName && (
                            <div className="text-[11px] text-slate-400 font-sans">
                              {learner.frenchName}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {learner.registrationNumber || '-'}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800 text-center font-mono text-slate-600 dark:text-slate-400">
                          {learner.masarCode || '-'}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800 font-medium">
                          {learner.className}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {learner.stream}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            learner.gender === 'ذكر' 
                              ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40' 
                              : 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40'
                          }`}>
                            {learner.gender}
                          </span>
                        </td>
                        <td className="p-2.5 border-l border-slate-200 dark:border-slate-800">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${getProjectBadgeClass(learner.personalProject)}`}>
                            {learner.personalProject || 'غير محدد'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${getStatusBadgeClass(learner.status)}`}>
                            {learner.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500 italic">
                        لا يوجد أي متعلم يطابق خيارات التصفية المحددة. جرب تغيير الفلاتر أو إعادة ضبطها.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Official Note (Strictly WITHOUT signature block as requested) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
              <span>{settings.schoolName} · مدرسة الفرصة الثانية الجيل الجديد زرارة</span>
              <span>سجل توجيه ومواكبة المشاريع الشخصية للمتعلمين</span>
            </div>

          </div>

        </div>

      </div>

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title="لائحة المتعلمين حسب المشروع الشخصي"
        settings={settings}
        printableBodyHtml={generatePrintableHtml()}
        defaultOrientation="landscape"
        fileName={`لائحة_المشروع_الشخصي_${settings.schoolYear.replace(/\s+/g, '_')}`}
      />
    </div>
  );
};
