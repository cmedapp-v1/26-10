import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Users, 
  Clock, 
  ClipboardList, 
  ShieldAlert, 
  Percent, 
  Download, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Hospital,
  LogOut
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Learner, 
  AttendanceRecord, 
  Violation, 
  ScheduledSession, 
  ExitPaper, 
  InfirmaryVisit,
  AppSettings,
  Animator
} from '../types';
import { calculateReportStats, calculateBranchMonthlyStats, BranchMonthlyStats } from '../utils/statsUtils';
import { PersonalProjectListModal } from './PersonalProjectListModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  learners: Learner[];
  attendance: AttendanceRecord[];
  violations: Violation[];
  schedule: ScheduledSession[];
  exitPapers: ExitPaper[];
  infirmaryVisits: InfirmaryVisit[];
  settings: AppSettings;
  animators?: Animator[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC<ReportsProps> = ({ 
  learners, 
  attendance, 
  violations, 
  schedule,
  exitPapers,
  infirmaryVisits,
  settings,
  animators = []
}) => {
  const [isPersonalProjectModalOpen, setIsPersonalProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'branch-monthly' | 'animators'>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterStream, setFilterStream] = useState<string>('');
  const [filterPersonalProject, setFilterPersonalProject] = useState<string>('');
  
  // For branch monthly report
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedBranchClass, setSelectedBranchClass] = useState<string>('');
  const [selectedBranchProject, setSelectedBranchProject] = useState<string>('');

  const stats = useMemo(() => {
    return calculateReportStats(
      learners,
      attendance,
      violations,
      exitPapers,
      infirmaryVisits,
      dateRange,
      { 
        className: filterClass || undefined, 
        stream: filterStream || undefined,
        personalProject: filterPersonalProject || undefined
      }
    );
  }, [learners, attendance, violations, exitPapers, infirmaryVisits, dateRange, filterClass, filterStream, filterPersonalProject]);

  const branchMonthlyStats = useMemo(() => {
    return calculateBranchMonthlyStats(
      learners,
      attendance,
      selectedMonth,
      selectedBranchClass || undefined,
      selectedBranchProject || undefined
    );
  }, [learners, attendance, selectedMonth, selectedBranchClass, selectedBranchProject]);

  const animatorStats = useMemo(() => {
    const total = animators.length;
    const active = animators.filter((a) => a.status === 'نشط').length;
    const inactive = animators.filter((a) => a.status === 'غير نشط').length;
    const suspended = animators.filter((a) => a.status === 'متوقف عن العمل').length;
    const pedagogical = animators.filter((a) => a.activityType === 'التأهيل التربوي').length;
    const vocational = animators.filter((a) => a.activityType === 'التأهيل المهني').length;

    const loads = animators.map((a) => {
      const assigned = schedule.filter(
        (s) =>
          (s.animatorId && s.animatorId === a.id) ||
          s.animator.trim().toLowerCase() === a.arabicName.trim().toLowerCase()
      );
      let hours = 0;
      assigned.forEach((s) => {
        hours += s.timeSlot === '09:00–13:00' ? 4 : 2;
      });
      return {
        id: a.id,
        name: a.arabicName,
        code: a.registrationNumber,
        specialty: a.specialty,
        activityType: a.activityType,
        status: a.status,
        classes: a.assignedClasses.join('، ') || 'غير محدد',
        streams: a.assignedStreams.join('، ') || 'غير محدد',
        sessionsCount: assigned.length,
        hours,
      };
    });

    const activityTypeDistribution = [
      { name: 'التأهيل التربوي', value: pedagogical, color: '#3b82f6' },
      { name: 'التأهيل المهني', value: vocational, color: '#10b981' },
    ];

    return {
      total,
      active,
      inactive,
      suspended,
      pedagogical,
      vocational,
      loads,
      activityTypeDistribution,
    };
  }, [animators, schedule]);

  const exportToExcel = () => {
    if (activeTab === 'overview') {
      const data: any[][] = [
        ['التقرير العام للإحصائيات والتحليلات'],
        ['المؤسسة', settings.schoolNameFull],
        ['الفترة', `${dateRange.start} إلى ${dateRange.end}`],
        ['القسم', filterClass || 'جميع الأقسام'],
        ['الشعبة', filterStream || 'جميع الشعب'],
        ['المشروع الشخصي', filterPersonalProject || 'جميع المشاريع الشخصية'],
        [''],
        ['المؤشر الإحصائي', 'القيمة'],
        ['إجمالي المتعلمين', stats.totalLearners],
        ['المتعلمون النشطون', stats.activeLearners],
        ['المتعلمون المنقطعون', stats.droppedLearners],
        ['نسبة الانقطاع', `${stats.dropoutRate}%`],
        ['نسبة الحضور العامة', `${stats.attendanceRate}%`],
        ['إجمالي الغيابات', stats.totalAbsences],
        ['المخالفات المسجلة', stats.totalViolations],
        ['أوراق الخروج', stats.totalExitPapers],
        ['زيارات المستوصف', stats.totalInfirmaryVisits],
        [''],
        ['توزيع المتعلمين حسب المشروع الشخصي'],
        ['المشروع الشخصي', 'عدد المتعلمين', 'النسبة المئوية']
      ];

      stats.distributionByPersonalProject.forEach(p => {
        data.push([p.name, p.count, `${p.percentage}%`]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الإحصائيات العامة');
      
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      if (!wb.Workbook.Views[0]) wb.Workbook.Views[0] = {};
      wb.Workbook.Views[0].RTL = true;

      XLSX.writeFile(wb, `تقرير_إحصائيات_${dateRange.start}_إلى_${dateRange.end}.xlsx`);
    } else {
      const data: any[][] = [
        ['تقرير نسبة المواظبة الشهرية حسب الشعبة والمشروع الشخصي'],
        ['المؤسسة', settings.schoolNameFull],
        ['الشهر', selectedMonth],
        ['القسم', selectedBranchClass || 'جميع الأقسام'],
        ['المشروع الشخصي', selectedBranchProject || 'جميع المشاريع الشخصية'],
        [''],
        ['الشعبة', 'عدد المتعلمين', 'الحضور', 'الغياب غير المبرر', 'الغياب المبرر', 'التأخرات', 'إجمالي الحصص', 'نسبة المواظبة', 'نسبة الغياب']
      ];

      branchMonthlyStats.forEach(s => {
        data.push([
          s.stream,
          s.learnerCount,
          s.presentCount,
          s.absentCount,
          s.excusedCount,
          s.lateCount,
          s.totalSessions,
          `${s.attendanceRate}%`,
          `${s.absenceRate}%`
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'نسبة المواظبة حسب الشعبة');
      
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      if (!wb.Workbook.Views[0]) wb.Workbook.Views[0] = {};
      wb.Workbook.Views[0].RTL = true;

      XLSX.writeFile(wb, `تقرير_المواظبة_الشعبي_${selectedMonth}.xlsx`);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header Info
    doc.setFontSize(10);
    doc.text('Royaume du Maroc', 20, 15);
    doc.text('Ministere de l\'Education Nationale', 20, 20);
    doc.text(settings.schoolNameFull, 20, 25);
    
    if (activeTab === 'overview') {
      doc.setFontSize(16);
      doc.text('Rapport Statistiques General', 105, 42, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`Periode: ${dateRange.start} - ${dateRange.end}`, 20, 50);
      doc.text(`Classe: ${filterClass || 'Toutes'} | Branche: ${filterStream || 'Toutes'}`, 20, 56);
      doc.text(`Projet Personnel: ${filterPersonalProject || 'Tous'}`, 20, 62);
      
      const tableData = [
        ['Total Apprenants', stats.totalLearners.toString()],
        ['Apprenants Actifs', stats.activeLearners.toString()],
        ['Apprenants Abandon', stats.droppedLearners.toString()],
        ['Taux d\'Abandon', `${stats.dropoutRate}%`],
        ['Taux de Presence', `${stats.attendanceRate}%`],
        ['Total Absences', stats.totalAbsences.toString()],
        ['Infractions', stats.totalViolations.toString()],
        ['Papiers de Sortie', stats.totalExitPapers.toString()],
        ['Visites Infirmerie', stats.totalInfirmaryVisits.toString()],
      ];

      autoTable(doc, {
        startY: 68,
        head: [['Indicateur Global', 'Valeur']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });

      const projectData = stats.distributionByPersonalProject.map(p => [
        p.name,
        p.count.toString(),
        `${p.percentage}%`
      ]);

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 130;

      autoTable(doc, {
        startY: finalY,
        head: [['Projet Personnel', 'Nombre d\'apprenants', 'Pourcentage']],
        body: projectData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });
    } else {
      doc.setFontSize(16);
      doc.text('Rapport d\'Assiduite Mensuel par Branche', 105, 42, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`Mois: ${selectedMonth}`, 20, 50);
      doc.text(`Classe: ${selectedBranchClass || 'Toutes'} | Projet Personnel: ${selectedBranchProject || 'Tous'}`, 20, 56);
      
      const tableData = branchMonthlyStats.map(s => [
        s.stream,
        s.learnerCount.toString(),
        s.presentCount.toString(),
        s.absentCount.toString(),
        s.excusedCount.toString(),
        s.lateCount.toString(),
        `${s.attendanceRate}%`,
        `${s.absenceRate}%`
      ]);

      autoTable(doc, {
        startY: 64,
        head: [['Branche', 'Apprenants', 'Pres.', 'Abs. NJ', 'Abs. J', 'Retards', 'Assiduite', 'Absentéisme']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });
    }

    doc.save(`Rapport_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const statCards = [
    { title: 'إجمالي المتعلمين', value: stats.totalLearners, icon: Users, color: 'indigo' },
    { title: 'نسبة الحضور', value: `${stats.attendanceRate}%`, icon: Percent, color: 'emerald' },
    { title: 'نسبة الانقطاع', value: `${stats.dropoutRate}%`, icon: TrendingUp, color: 'amber' },
    { title: 'المخالفات', value: stats.totalViolations, icon: ShieldAlert, color: 'rose' },
    { title: 'أوراق الخروج', value: stats.totalExitPapers, icon: LogOut, color: 'blue' },
    { title: 'زيارات المستوصف', value: stats.totalInfirmaryVisits, icon: Hospital, color: 'teal' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">التقارير والإحصائيات</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">تحليل البيانات والمؤشرات ومسارات المشاريع الشخصية للمتعلمين</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير PDF
          </button>
          <button 
            onClick={() => setIsPersonalProjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            لائحة المشروع الشخصي
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'overview' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          الإحصائيات العامة والمشاريع الشخصية
        </button>
        <button
          onClick={() => setActiveTab('branch-monthly')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'branch-monthly' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          نسبة المواظبة حسب الشعبة
        </button>
        <button
          onClick={() => setActiveTab('animators')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'animators' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          إحصائيات المنشطين والمؤطرين
        </button>
      </div>

      {/* Personal Project List Modal */}
      <PersonalProjectListModal
        isOpen={isPersonalProjectModalOpen}
        onClose={() => setIsPersonalProjectModalOpen(false)}
        learners={learners}
        settings={settings}
      />

      {activeTab === 'overview' ? (
        <>
          {/* Filters Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> من تاريخ
              </label>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> إلى تاريخ
              </label>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> القسم
              </label>
              <select 
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">جميع الأقسام</option>
                {settings.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> الشعبة
              </label>
              <select 
                value={filterStream}
                onChange={(e) => setFilterStream(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">جميع الشعب</option>
                {settings.streams.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-600" /> المشروع الشخصي
              </label>
              <select 
                value={filterPersonalProject}
                onChange={(e) => setFilterPersonalProject(e.target.value)}
                className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-semibold text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">جميع المشاريع الشخصية</option>
                <option value="الإدماج المدرسي">الإدماج المدرسي</option>
                <option value="التكوين المهني">التكوين المهني</option>
                <option value="سوق الشغل">سوق الشغل</option>
                <option value="غير محدد">غير محدد</option>
              </select>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center gap-2">
                <div className={`p-2 rounded-lg bg-${card.color}-50 dark:bg-${card.color}-950/30 text-${card.color}-600 dark:text-${card.color}-400`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Personal Project Summary Cards */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              ملخص توزيع المسارات والمشاريع الشخصية
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {stats.distributionByPersonalProject.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    filterPersonalProject === item.name 
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.name}</span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{item.count}</span>
                    <span className="text-xs text-slate-500">متعلم</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                تطور نسبة الحضور شهرياً
              </h3>
              <div className="h-64 w-full">
                {stats.monthlyAttendance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.monthlyAttendance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">لا توجد بيانات كافية</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                توزيع المتعلمين حسب الأقسام
              </h3>
              <div className="h-64 w-full">
                {stats.distributionByClass.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.distributionByClass} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">لا توجد بيانات كافية</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                توزيع المشاريع الشخصية للمتعلمين
              </h3>
              <div className="h-64 w-full">
                {stats.distributionByPersonalProject.some(p => p.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.distributionByPersonalProject}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {stats.distributionByPersonalProject.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">لا توجد بيانات كافية</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                توزيع المشاريع الشخصية حسب الجنس (ذكور / إناث)
              </h3>
              <div className="h-64 w-full">
                {stats.projectByGender.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.projectByGender}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="project" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} />
                      <Legend />
                      <Bar name="ذكور" dataKey="male" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="إناث" dataKey="female" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">لا توجد بيانات كافية</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'branch-monthly' ? (
        <>
          {/* Branch Monthly Report Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> الشهر والسنة
              </label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> القسم
              </label>
              <select 
                value={selectedBranchClass}
                onChange={(e) => setSelectedBranchClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">جميع الأقسام</option>
                {settings.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-600" /> المشروع الشخصي
              </label>
              <select 
                value={selectedBranchProject}
                onChange={(e) => setSelectedBranchProject(e.target.value)}
                className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-semibold text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">جميع المشاريع الشخصية</option>
                <option value="الإدماج المدرسي">الإدماج المدرسي</option>
                <option value="التكوين المهني">التكوين المهني</option>
                <option value="سوق الشغل">سوق الشغل</option>
                <option value="غير محدد">غير محدد</option>
              </select>
            </div>
            <div className="flex items-end">
               <p className="text-xs text-slate-500 italic mb-2">سيتم احتساب المؤشرات بناءً على أوراق النداء المؤكدة والفلاتر المحددة.</p>
            </div>
          </div>

          {/* Branch Comparison Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              مقارنة نسبة المواظبة حسب الشعبة
            </h3>
            <div className="h-80 w-full">
              {branchMonthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchMonthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="stream" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Legend />
                    <Bar name="نسبة المواظبة" dataKey="attendanceRate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar name="نسبة الغياب" dataKey="absenceRate" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">لا توجد بيانات لهذا الشهر</div>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">الشعبة</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">عدد المتعلمين</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">الحضور</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm text-rose-600">غ. غير مبرر</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm text-emerald-600">غ. مبرر</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm text-amber-600">التأخرات</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">إجمالي الحصص</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">نسبة المواظبة</th>
                    <th className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">نسبة الغياب</th>
                  </tr>
                </thead>
                <tbody>
                  {branchMonthlyStats.length > 0 ? (
                    branchMonthlyStats.map((s, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">{s.stream}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{s.learnerCount}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{s.presentCount}</td>
                        <td className="px-4 py-4 text-rose-600 font-medium">{s.absentCount}</td>
                        <td className="px-4 py-4 text-emerald-600 font-medium">{s.excusedCount}</td>
                        <td className="px-4 py-4 text-amber-600 font-medium">{s.lateCount}</td>
                        <td className="px-4 py-4 text-slate-500">{s.totalSessions}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            s.attendanceRate >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            s.attendanceRate >= 75 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {s.attendanceRate}%
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-medium text-slate-600 dark:text-slate-400">{s.absenceRate}%</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500 italic">لا توجد بيانات متاحة للشهر المحدد</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">إجمالي المنشطين</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{animatorStats.total}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm text-center">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">المنشطون النشطون</p>
              <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{animatorStats.active}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">غير نشطين / متوقف</p>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{animatorStats.inactive + animatorStats.suspended}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm text-center">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">التأهيل التربوي</p>
              <p className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1">{animatorStats.pedagogical}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm text-center">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">التأهيل المهني</p>
              <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{animatorStats.vocational}</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm text-center">
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">إجمالي الحصص الأسبوعية</p>
              <p className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-1">
                {animatorStats.loads.reduce((acc, curr) => acc + curr.sessionsCount, 0)}
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Loads Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                توزيع الحصص الأسبوعية المبرمجة حسب المنشط
              </h3>
              <div className="h-72 w-full">
                {animatorStats.loads.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={animatorStats.loads}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} />
                      <Legend />
                      <Bar name="عدد الحصص الأسبوعية" dataKey="sessionsCount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar name="الحجم الساعي التقديري" dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">لا توجد بيانات متاحة</div>
                )}
              </div>
            </div>

            {/* Activity Type Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                توزيع المنشطين حسب نوع التأهيل
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={animatorStats.activityTypeDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={(props: any) => `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                    >
                      {animatorStats.activityTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-center font-bold">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  تأهيل تربوي: {animatorStats.pedagogical}
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  تأهيل مهني: {animatorStats.vocational}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                جدول حصص وتأطير المنشطين
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="px-4 py-3">ت</th>
                    <th className="px-4 py-3">الرقم</th>
                    <th className="px-4 py-3">الاسم الكامل</th>
                    <th className="px-4 py-3">نوع النشاط</th>
                    <th className="px-4 py-3">التخصص / المجال</th>
                    <th className="px-4 py-3">الأقسام</th>
                    <th className="px-4 py-3">الشعب</th>
                    <th className="px-4 py-3 text-center">الحصص</th>
                    <th className="px-4 py-3 text-center">الحجم الساعي</th>
                    <th className="px-4 py-3 text-center">الوضعية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {animatorStats.loads.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold">{a.code}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{a.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.activityType === 'التأهيل التربوي'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {a.activityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{a.specialty}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{a.classes}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{a.streams}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-700 dark:text-indigo-400">
                        {a.sessionsCount} حصص
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {a.hours} س
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'نشط'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : a.status === 'غير نشط'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-sm flex items-start gap-3">
        <div className="p-1 bg-white dark:bg-slate-900 rounded-full shadow-sm mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <p>تعتمد هذه الإحصائيات على السجلات المؤكدة في قاعدة البيانات. يتم احتساب نسبة الحضور والمواظبة وتوزيع المشاريع الشخصية بناءً على البيانات والفلاتر المحددة فعلياً.</p>
      </div>

      {/* Personal Project List Modal */}
      <PersonalProjectListModal
        isOpen={isPersonalProjectModalOpen}
        onClose={() => setIsPersonalProjectModalOpen(false)}
        learners={learners}
        settings={settings}
      />
    </div>
  );
};
