import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Search,
  Users,
  Database
} from 'lucide-react';
import { Learner, AttendanceRecord, Violation, ExitPaper, InfirmaryVisit, AppSettings } from '../types';
import { auditDataIntegrity, DataIssue, fixOrphanedAttendance, fixOrphanedViolations, fixOrphanedExits, fixOrphanedInfirmary } from '../utils/dataCorrectionUtils';
import { ConfirmDialog } from './ConfirmDialog';

interface DataCorrectionProps {
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  violations: Violation[];
  setViolations: React.Dispatch<React.SetStateAction<Violation[]>>;
  exitPapers: ExitPaper[];
  setExitPapers: React.Dispatch<React.SetStateAction<ExitPaper[]>>;
  infirmaryVisits: InfirmaryVisit[];
  setInfirmaryVisits: React.Dispatch<React.SetStateAction<InfirmaryVisit[]>>;
  settings: AppSettings;
}

export const DataCorrection: React.FC<DataCorrectionProps> = ({
  learners,
  setLearners,
  attendance,
  setAttendance,
  violations,
  setViolations,
  exitPapers,
  setExitPapers,
  infirmaryVisits,
  setInfirmaryVisits,
  settings
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [lastAuditDate, setLastAuditDate] = useState<string | null>(null);
  
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

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const results = auditDataIntegrity(learners, attendance, violations, exitPapers, infirmaryVisits);
      setIssues(results);
      setIsAuditing(false);
      setLastAuditDate(new Date().toLocaleString('ar-MA'));
    }, 800);
  };

  const handleFixOrphans = () => {
    openConfirm(
      'تأكيد تنظيف البيانات اليتيمة',
      'سيتم حذف جميع سجلات الحضور والمخالفات وأوراق الخروج المرتبطة بمتعلمين غير موجودين حالياً في قاعدة البيانات. هل أنت متأكد؟',
      () => {
        const learnerIds = new Set(learners.map(l => l.id));
        setAttendance(prev => fixOrphanedAttendance(prev, learnerIds));
        setViolations(prev => fixOrphanedViolations(prev, learnerIds));
        setExitPapers(prev => fixOrphanedExits(prev, learnerIds));
        setInfirmaryVisits(prev => fixOrphanedInfirmary(prev, learnerIds));
        
        // Re-run audit
        const results = auditDataIntegrity(learners, 
          fixOrphanedAttendance(attendance, learnerIds), 
          fixOrphanedViolations(violations, learnerIds),
          fixOrphanedExits(exitPapers, learnerIds),
          fixOrphanedInfirmary(infirmaryVisits, learnerIds)
        );
        setIssues(results);
      },
      'danger'
    );
  };

  const stats = useMemo(() => {
    return {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };
  }, [issues]);

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
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

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">فحص وتصحيح البيانات</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">تدقيق سلامة قاعدة البيانات واكتشاف الأخطاء وتصحيحها</p>
          </div>
        </div>
        
        <button
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isAuditing ? 'animate-spin' : ''}`} />
          <span>{isAuditing ? 'جاري الفحص...' : 'تشغيل فحص النظام'}</span>
        </button>
      </div>

      {lastAuditDate ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المشاكل</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{issues.length}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm text-center">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">خطيرة جداً</p>
              <p className="text-3xl font-black text-rose-700 dark:text-rose-300">{stats.high}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm text-center">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">متوسطة الأهمية</p>
              <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{stats.medium}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm text-center">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">تحسينات وتنظيف</p>
              <p className="text-3xl font-black text-blue-700 dark:text-blue-300">{stats.low}</p>
            </div>
          </div>

          {/* Action Tools */}
          {issues.some(i => i.type.startsWith('orphaned')) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">تنظيف السجلات اليتيمة</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">تم اكتشاف سجلات مرتبطة بمتعلمين تم حذفهم سابقاً. يوصى بحذفها لتنظيف القاعدة.</p>
                </div>
              </div>
              <button
                onClick={handleFixOrphans}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف جميع اليتامى</span>
              </button>
            </div>
          )}

          {/* Issues List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">نتائج فحص البيانات ({lastAuditDate})</h3>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {issues.length > 0 ? (
                issues.map((issue) => (
                  <div key={issue.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-start gap-4">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      issue.severity === 'high' ? 'bg-rose-100 text-rose-600' :
                      issue.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {issue.severity === 'high' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{issue.message}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          issue.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                          issue.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {issue.severity === 'high' ? 'حرجة' : issue.severity === 'medium' ? 'متوسطة' : 'بسيطة'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">الإجراء المقترح: {issue.suggestedAction}</p>
                      
                      {issue.type.includes('duplicate') && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {issue.itemIds.map(id => {
                            const learner = learners.find(l => l.id === id);
                            return learner ? (
                              <div key={id} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                                {learner.arabicName} ({learner.registrationNumber})
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">قاعدة البيانات سليمة!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">لم يتم العثور على أي مشاكل أو تكرارات في البيانات حالياً.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
          <Database className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">جاهز لفحص القاعدة؟</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
              سيقوم النظام بفحص شامل لجميع السجلات (أكثر من {learners.length + attendance.length} سجل) للبحث عن أي تكرارات أو بيانات غير متناسقة.
            </p>
          </div>
          <button
            onClick={handleRunAudit}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            بدء عملية التدقيق الآن
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs flex items-start gap-3 leading-relaxed">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          <span className="font-bold block mb-1">لماذا هذا القسم مهم؟</span>
          عند استيراد ملفات Excel بشكل متكرر أو وقوع أخطاء تقنية، قد تظهر بيانات مكررة أو سجلات يتيمة. يساعد هذا القسم الإدارة على الحفاظ على دقة التقارير والإحصائيات التي تعتمد عليها المؤسسة في تتبع المتعلمين.
        </p>
      </div>
    </div>
  );
};
