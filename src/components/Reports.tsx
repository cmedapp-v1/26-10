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
  AppSettings
} from '../types';
import { calculateReportStats, calculateBranchMonthlyStats, BranchMonthlyStats } from '../utils/statsUtils';
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
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC<ReportsProps> = ({ 
  learners, 
  attendance, 
  violations, 
  schedule,
  exitPapers,
  infirmaryVisits,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'branch-monthly'>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterStream, setFilterStream] = useState<string>('');
  
  // For branch monthly report
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedBranchClass, setSelectedBranchClass] = useState<string>('');

  const stats = useMemo(() => {
    return calculateReportStats(
      learners,
      attendance,
      violations,
      exitPapers,
      infirmaryVisits,
      dateRange,
      { className: filterClass || undefined, stream: filterStream || undefined }
    );
  }, [learners, attendance, violations, exitPapers, infirmaryVisits, dateRange, filterClass, filterStream]);

  const branchMonthlyStats = useMemo(() => {
    return calculateBranchMonthlyStats(
      learners,
      attendance,
      selectedMonth,
      selectedBranchClass || undefined
    );
  }, [learners, attendance, selectedMonth, selectedBranchClass]);

  const exportToExcel = () => {
    if (activeTab === 'overview') {
      const data = [
        ['التقرير العام للإحصائيات'],
        ['المؤسسة', settings.schoolNameFull],
        ['الفترة', `${dateRange.start} إلى ${dateRange.end}`],
        ['القسم', filterClass || 'الكل'],
        ['الشعبة', filterStream || 'الكل'],
        [''],
        ['الإحصائية', 'القيمة'],
        ['إجمالي المتعلمين', stats.totalLearners],
        ['المتعلمون النشطون', stats.activeLearners],
        ['المتعلمون المنقطعون', stats.droppedLearners],
        ['نسبة الانقطاع', `${stats.dropoutRate}%`],
        ['نسبة الحضور العامة', `${stats.attendanceRate}%`],
        ['إجمالي الغيابات', stats.totalAbsences],
        ['المخالفات المسجلة', stats.totalViolations],
        ['أوراق الخروج', stats.totalExitPapers],
        ['زيارات المستوصف', stats.totalInfirmaryVisits],
      ];

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
        ['تقرير نسبة المواظبة الشهرية حسب الشعبة'],
        ['المؤسسة', settings.schoolNameFull],
        ['الشهر', selectedMonth],
        ['القسم', selectedBranchClass || 'الكل'],
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
      doc.text('Rapport Statistiques General', 105, 45, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Periode: ${dateRange.start} - ${dateRange.end}`, 20, 55);
      
      const tableData = [
        ['Indicateur', 'Valeur'],
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
        startY: 65,
        head: [['Indicateur', 'Valeur']],
        body: tableData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
    } else {
      doc.setFontSize(16);
      doc.text('Rapport d\'Assiduite Mensuel par Branche', 105, 45, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Mois: ${selectedMonth}`, 20, 55);
      doc.text(`Classe: ${selectedBranchClass || 'Toutes'}`, 20, 62);
      
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
        startY: 70,
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
            <p className="text-sm text-slate-500 dark:text-slate-400">تحليل البيانات ومؤشرات الأداء للمؤسسة</p>
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
          الإحصائيات العامة
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
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Filters Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
          </div>
        </>
      ) : (
        <>
          {/* Branch Monthly Report Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
            <div className="flex items-end">
               <p className="text-xs text-slate-500 italic mb-2">سيتم احتساب المؤشرات بناءً على أوراق النداء المؤكدة فقط للشهر المحدد.</p>
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
      )}

      {/* Footer Info */}
      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-sm flex items-start gap-3">
        <div className="p-1 bg-white dark:bg-slate-900 rounded-full shadow-sm mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <p>تعتمد هذه الإحصائيات على السجلات المؤكدة في قاعدة البيانات. يتم احتساب نسبة الحضور بناءً على عدد الحصص المسجلة فعلياً في الفترة المحددة.</p>
      </div>
    </div>
  );
};
