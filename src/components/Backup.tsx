import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  Upload, 
  Download, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  FolderOpen, 
  Settings as SettingsIcon,
  FileJson,
  Activity
} from 'lucide-react';
import { 
  BackupData, 
  AppSettings, 
  Learner, 
  AttendanceRecord, 
  ScheduledSession, 
  Holiday, 
  Violation, 
  CommitmentRecord, 
  ExitPaper, 
  InfirmaryVisit 
} from '../types';
import { exportFullBackup, restoreFullBackup } from '../utils/storage';

interface BackupProps {
  settings: AppSettings;
  learners: Learner[];
  attendance: AttendanceRecord[];
  schedule: ScheduledSession[];
  holidays: Holiday[];
  violations: Violation[];
  commitments: CommitmentRecord[];
  exitPapers: ExitPaper[];
  infirmaryVisits: InfirmaryVisit[];
  setSettings: (s: AppSettings) => void;
  setLearners: (l: Learner[]) => void;
  setAttendance: (a: AttendanceRecord[]) => void;
  setSchedule: (s: ScheduledSession[]) => void;
  setHolidays: (h: Holiday[]) => void;
  setViolations: (v: Violation[]) => void;
  setCommitments: (c: CommitmentRecord[]) => void;
  setExitPapers: (p: ExitPaper[]) => void;
  setInfirmaryVisits: (v: InfirmaryVisit[]) => void;
}

interface BackupLog {
  id: string;
  date: string;
  type: 'backup' | 'restore' | 'integrity_check';
  status: 'success' | 'failure';
  message: string;
}

export const Backup: React.FC<BackupProps> = ({
  settings,
  learners,
  attendance,
  schedule,
  holidays,
  violations,
  commitments,
  exitPapers,
  infirmaryVisits,
  setSettings,
  setLearners,
  setAttendance,
  setSchedule,
  setHolidays,
  setViolations,
  setCommitments,
  setExitPapers,
  setInfirmaryVisits
}) => {
  const [logs, setLogs] = useState<BackupLog[]>(() => {
    const savedLogs = localStorage.getItem('e2s_zirara_backup_logs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [integrityResults, setIntegrityResults] = useState<{ 
    passed: boolean; 
    errors: string[]; 
    warnings: string[];
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('e2s_zirara_backup_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = (type: BackupLog['type'], status: BackupLog['status'], message: string) => {
    const newLog: BackupLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type,
      status,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const handleCreateBackup = () => {
    try {
      const backupData: BackupData = {
        version: '1.5',
        exportDate: new Date().toISOString(),
        settings,
        learners,
        attendance,
        schedule,
        holidays,
        violations,
        commitments,
        exitPapers,
        infirmaryVisits
      };
      exportFullBackup(backupData);
      addLog('backup', 'success', 'تم إنشاء نسخة احتياطية وتنزيلها بنجاح');
    } catch (error) {
      addLog('backup', 'failure', `فشل إنشاء النسخة الاحتياطية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as BackupData;
        
        // Basic validation
        if (!parsed.learners || !parsed.settings) {
          throw new Error('ملف النسخة الاحتياطية غير صالح أو مفقود لبيانات أساسية');
        }

        setPendingRestoreData(parsed);
        setShowRestoreConfirm(true);
      } catch (error) {
        addLog('restore', 'failure', `فشل قراءة ملف الاستعادة: ${error instanceof Error ? error.message : 'تنسيق غير صالح'}`);
        alert('الملف الذي اخترته غير صالح كنسخة احتياطية لهذا التطبيق.');
      }
    };
    reader.readAsText(file);
    // Reset input value to allow selecting same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmRestore = () => {
    if (!pendingRestoreData) return;

    try {
      const { data } = restoreFullBackup(JSON.stringify(pendingRestoreData));
      
      if (data) {
        setSettings(data.settings);
        setLearners(data.learners);
        setAttendance(data.attendance);
        setSchedule(data.schedule);
        setHolidays(data.holidays);
        setViolations(data.violations);
        setCommitments(data.commitments);
        setExitPapers(data.exitPapers);
        setInfirmaryVisits(data.infirmaryVisits);

        addLog('restore', 'success', 'تمت استعادة البيانات بنجاح من النسخة الاحتياطية');
        alert('تمت استعادة كافة البيانات بنجاح!');
      }
    } catch (error) {
      addLog('restore', 'failure', `فشل تنفيذ الاستعادة: ${error instanceof Error ? error.message : 'خطأ غير متوقع'}`);
    } finally {
      setShowRestoreConfirm(false);
      setPendingRestoreData(null);
    }
  };

  const runIntegrityCheck = () => {
    setIsChecking(true);
    setIntegrityResults(null);

    // Simulate some processing time
    setTimeout(() => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Check for orphaned attendance
      const learnerIds = new Set(learners.map(l => l.id));
      attendance.forEach(att => {
        if (!learnerIds.has(att.learnerId)) {
          errors.push(`تسجيل حضور يتيم: المتعلم بالمعرف ${att.learnerId} غير موجود.`);
        }
      });

      // 2. Check for missing vital settings
      if (!settings.schoolName) errors.push('اسم المؤسسة مفقود في الإعدادات.');
      if (!settings.classes || settings.classes.length === 0) warnings.push('لم يتم تحديد أي أقسام في الإعدادات.');

      // 3. Check for overlapping dates in holidays (simplified)
      holidays.forEach((h, i) => {
        if (new Date(h.startDate) > new Date(h.endDate)) {
          errors.push(`عطلة غير صالحة: "${h.title}" تاريخ البدء بعد تاريخ الانتهاء.`);
        }
      });

      // 4. Check for exit papers linked to non-existent learners
      exitPapers.forEach(p => {
        if (!learnerIds.has(p.learnerId)) {
          errors.push(`ورقة خروج يتيمة: المتعلم بالمعرف ${p.learnerId} غير موجود.`);
        }
      });

      const passed = errors.length === 0;
      setIntegrityResults({ passed, errors, warnings });
      setIsChecking(false);
      addLog('integrity_check', passed ? 'success' : 'failure', passed ? 'فحص سلامة البيانات: ناجح' : `فحص سلامة البيانات: وجد ${errors.length} أخطاء`);
    }, 1000);
  };

  const fixIntegrityErrors = () => {
    if (!integrityResults) return;

    if (!confirm('هل أنت متأكد من تنفيذ الإصلاح التلقائي؟ سيتم حذف السجلات اليتيمة وتصحيح التواريخ غير الصالحة.')) {
      return;
    }

    const learnerIds = new Set(learners.map(l => l.id));

    // 1. Fix orphaned attendance
    const fixedAttendance = attendance.filter(att => learnerIds.has(att.learnerId));

    // 2. Fix invalid holidays
    const fixedHolidays = holidays.map(h => {
      if (new Date(h.startDate) > new Date(h.endDate)) {
        return { ...h, endDate: h.startDate };
      }
      return h;
    });

    // 3. Fix orphaned exit papers
    const fixedExitPapers = exitPapers.filter(p => learnerIds.has(p.learnerId));

    setAttendance(fixedAttendance);
    setHolidays(fixedHolidays);
    setExitPapers(fixedExitPapers);

    addLog('integrity_check', 'success', 'تم تنفيذ الإصلاح التلقائي لسلامة البيانات بنجاح');
    runIntegrityCheck(); // Re-run check
    alert('تم تنفيذ الإصلاحات بنجاح!');
  };

  const clearLogs = () => {
    if (confirm('هل أنت متأكد من حذف سجل العمليات؟')) {
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <span>نظام النسخ الاحتياطي واسترجاع البيانات</span>
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => alert('نظام المجلدات يعتمد على إعدادات المتصفح. النسخ تحفظ تلقائياً في مجلد "Downloads"')}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="إعدادات المجلد"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleCreateBackup}
            className="flex flex-col items-center justify-center p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all group"
          >
            <Download className="w-10 h-10 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-indigo-900 dark:text-indigo-300">إنشاء نسخة احتياطية</span>
            <span className="text-xs text-indigo-600/70 dark:text-indigo-400/50 mt-1">تنزيل ملف JSON شامل</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all group"
          >
            <Upload className="w-10 h-10 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-emerald-900 dark:text-emerald-300">استرجاع البيانات</span>
            <span className="text-xs text-emerald-600/70 dark:text-emerald-400/50 mt-1">تحميل من ملف نسخة سابقة</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
          </button>

          <button
            onClick={runIntegrityCheck}
            disabled={isChecking}
            className="flex flex-col items-center justify-center p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all group disabled:opacity-50"
          >
            <Activity className={`w-10 h-10 text-amber-600 mb-3 group-hover:scale-110 transition-transform ${isChecking ? 'animate-pulse' : ''}`} />
            <span className="font-bold text-amber-900 dark:text-amber-300">فحص سلامة البيانات</span>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/50 mt-1">تحقق من التناسق والروابط</span>
          </button>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xs text-slate-500 mb-1">آخر نسخة محفوظة</span>
            <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
              {logs.find(l => l.type === 'backup' && l.status === 'success')?.date 
                ? new Date(logs.find(l => l.type === 'backup' && l.status === 'success')!.date).toLocaleDateString('ar-MA') 
                : 'لا يوجد'}
            </span>
            <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-full opacity-50"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integrity Check Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>نتائج الفحص</span>
            </h3>

            {!integrityResults ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShieldCheck className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">لم يتم تشغيل الفحص بعد</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-3 rounded-lg flex items-center gap-3 ${integrityResults.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' : 'bg-red-50 text-red-700 dark:bg-red-900/20'}`}>
                  {integrityResults.passed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span className="font-bold">{integrityResults.passed ? 'قاعدة البيانات سليمة' : 'تم اكتشاف أخطاء'}</span>
                </div>

                {integrityResults.errors.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-red-600 uppercase mb-2 block">الأخطاء الحرجة ({integrityResults.errors.length})</span>
                    <ul className="space-y-2">
                      {integrityResults.errors.map((err, i) => (
                        <li key={i} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/10 p-2 rounded border-r-2 border-red-500">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {integrityResults.errors.length > 0 && (
                  <button
                    onClick={fixIntegrityErrors}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>إصلاح الأخطاء تلقائياً</span>
                  </button>
                )}

                {integrityResults.warnings.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase mb-2 block">تنبيهات ({integrityResults.warnings.length})</span>
                    <ul className="space-y-2">
                      {integrityResults.warnings.map((warn, i) => (
                        <li key={i} className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-2 rounded border-r-2 border-amber-500">
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>سجل العمليات</span>
              </h3>
              <button 
                onClick={clearLogs}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>مسح السجل</span>
              </button>
            </div>

            <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">التاريخ والوقت</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">العملية</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                        لا توجد عمليات مسجلة حالياً
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(log.date).toLocaleString('ar-MA')}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900 dark:text-slate-200">
                          {log.type === 'backup' && 'نسخ احتياطي'}
                          {log.type === 'restore' && 'استرجاع'}
                          {log.type === 'integrity_check' && 'فحص السلامة'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                            log.status === 'success' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {log.status === 'success' ? 'ناجحة' : 'فاشلة'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                          {log.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">تأكيد استعادة البيانات</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
                سيؤدي هذا الإجراء إلى <span className="text-red-600 font-bold">حذف جميع البيانات الحالية</span> واستبدالها ببيانات النسخة الاحتياطية. 
                هل أنت متأكد من المتابعة؟
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ النسخة:</span>
                  <span className="font-bold">{new Date(pendingRestoreData?.exportDate || '').toLocaleString('ar-MA')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">عدد المتعلمين:</span>
                  <span className="font-bold">{pendingRestoreData?.learners.length}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmRestore}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  نعم، استعادة الآن
                </button>
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setPendingRestoreData(null);
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
