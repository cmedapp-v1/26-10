import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Wrench,
  Sparkles,
  Users,
  Database,
  Calendar,
  Layers,
  Eye,
  Download
} from 'lucide-react';
import { 
  Learner, 
  AttendanceRecord, 
  Violation, 
  ExitPaper, 
  InfirmaryVisit, 
  AppSettings, 
  ScheduledSession, 
  Animator 
} from '../types';
import { 
  auditDataIntegrity, 
  DataIssue, 
  fixDuplicateAttendance,
  fixOrphanedAttendance, 
  fixOrphanedViolations, 
  fixOrphanedExits, 
  fixOrphanedInfirmary,
  fixDuplicateLearners,
  fixOrphanedSchedule,
  fixDuplicateAnimators,
  identifyDemoTestData,
  removeDemoTestDataClean
} from '../utils/dataCorrectionUtils';
import { exportFullBackup } from '../utils/storage';
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
  schedule?: ScheduledSession[];
  setSchedule?: React.Dispatch<React.SetStateAction<ScheduledSession[]>>;
  animators?: Animator[];
  setAnimators?: React.Dispatch<React.SetStateAction<Animator[]>>;
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
  settings,
  schedule = [],
  setSchedule,
  animators = [],
  setAnimators,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [lastAuditDate, setLastAuditDate] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Review Demo Data Modal State
  const [isReviewDemoModalOpen, setIsReviewDemoModalOpen] = useState(false);
  
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

  const { demoLearners, demoAnimators } = useMemo(() => {
    return identifyDemoTestData(learners, animators);
  }, [learners, animators]);

  // Perform audit function
  const runAudit = (silent = false) => {
    if (!silent) setIsAuditing(true);
    const results = auditDataIntegrity(
      learners, 
      attendance, 
      violations, 
      exitPapers, 
      infirmaryVisits, 
      schedule, 
      animators
    );
    setIssues(results);
    setLastAuditDate(new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (!silent) {
      setTimeout(() => setIsAuditing(false), 300);
    }
  };

  // Auto-run audit on mount
  useEffect(() => {
    runAudit(true);
  }, [learners.length, attendance.length, violations.length, exitPapers.length, infirmaryVisits.length, schedule.length, animators.length]);

  const handleRunAuditManual = () => {
    setIsAuditing(true);
    setTimeout(() => {
      runAudit(false);
    }, 400);
  };

  // Handle Remove Demo Test Data with Backup & Safe Transaction
  const handleRemoveDemoTestData = () => {
    openConfirm(
      'تأكيد حذف البيانات التجريبية (Suppression des données de test)',
      `سيتم أولاً إنشاء نسخة احتياطية من قاعدة البيانات الحالية تلقائياً، ثم حذف ${demoLearners.length} متعلم تجريبي و ${demoAnimators.length} منشط تجريبي وبياناتهم المرتبطة، مع الحفاظ الكامل على الأقسام، الشعب، الإعدادات، الحسابات، والبيانات الحقيقية للمركز. هل أنت متأكد؟`,
      () => {
        try {
          // 1. Create automatic backup before deletion (Instruction 8)
          exportFullBackup();

          // 2. Execute safe transaction removal (Instruction 9)
          const result = removeDemoTestDataClean(
            learners,
            animators,
            attendance,
            violations,
            exitPapers,
            infirmaryVisits,
            schedule
          );

          setLearners(result.learners);
          if (setAnimators) setAnimators(result.animators);
          setAttendance(result.attendance);
          setViolations(result.violations);
          setExitPapers(result.exitPapers);
          setInfirmaryVisits(result.infirmaryVisits);
          if (setSchedule) setSchedule(result.schedule);

          setIsReviewDemoModalOpen(false);
          runAudit(true);

          setSuccessToast(`تم بنجاح حذف البيانات التجريبية (${result.removedCounts.learners} متعلم و ${result.removedCounts.animators} منشط). تم حفظ نسخة احتياطية قبل الحذف.`);
          setTimeout(() => setSuccessToast(null), 6000);
        } catch (err) {
          console.error(err);
          setSuccessToast('حدث خطأ أثناء تنفيذ الحذف الآمن. يرجى المحاولة لاحقاً.');
        }
      },
      'danger'
    );
  };

  // Fix All Issues Automatically
  const handleFixAllErrors = () => {
    openConfirm(
      'تأكيد الإصلاح والتصحيح الشامل التلقائي',
      'سيقوم النظام بتصحيح جميع الأخطاء المكتشفة تلقائياً: حذف سجلات الحضور المكررة، حذف السجلات اليتيمة، وتصحيح التكرارات في أرقام التسجيل. هل تريد المتابعة؟',
      () => {
        let fixedDups = 0;
        let fixedOrphans = 0;

        const cleanAttendance = fixDuplicateAttendance(attendance);
        fixedDups += attendance.length - cleanAttendance.length;

        const currentLearnerIds = new Set(learners.map(l => l.id));
        const finalAttendance = fixOrphanedAttendance(cleanAttendance, currentLearnerIds);
        fixedOrphans += cleanAttendance.length - finalAttendance.length;

        const finalViolations = fixOrphanedViolations(violations, currentLearnerIds);
        fixedOrphans += violations.length - finalViolations.length;

        const finalExits = fixOrphanedExits(exitPapers, currentLearnerIds);
        fixedOrphans += exitPapers.length - finalExits.length;

        const finalInfirmary = fixOrphanedInfirmary(infirmaryVisits, currentLearnerIds);
        fixedOrphans += infirmaryVisits.length - finalInfirmary.length;

        const cleanLearners = fixDuplicateLearners(learners);

        let cleanSchedule = schedule;
        if (setSchedule && animators.length > 0) {
          cleanSchedule = fixOrphanedSchedule(schedule, animators);
          setSchedule(cleanSchedule);
        }

        let cleanAnimators = animators;
        if (setAnimators && animators.length > 0) {
          cleanAnimators = fixDuplicateAnimators(animators);
          setAnimators(cleanAnimators);
        }

        setLearners(cleanLearners);
        setAttendance(finalAttendance);
        setViolations(finalViolations);
        setExitPapers(finalExits);
        setInfirmaryVisits(finalInfirmary);

        const results = auditDataIntegrity(
          cleanLearners, 
          finalAttendance, 
          finalViolations, 
          finalExits, 
          finalInfirmary, 
          cleanSchedule, 
          cleanAnimators
        );
        setIssues(results);

        setSuccessToast(`تم تصحيح كافة البيانات بنجاح! تم تنظيف ${fixedDups + fixedOrphans} سجل.`);
        setTimeout(() => setSuccessToast(null), 5000);
      },
      'danger'
    );
  };

  const handleFixDuplicateAttendance = () => {
    openConfirm(
      'تأكيد إزالة تسجيلات الحضور المكررة',
      'سيتم حذف السجلات المكررة لنفس الحصة والتاريخ والاحتفاظ بآخر تسجيل معتمد. هل تود المتابعة؟',
      () => {
        const clean = fixDuplicateAttendance(attendance);
        const removed = attendance.length - clean.length;
        setAttendance(clean);

        const results = auditDataIntegrity(learners, clean, violations, exitPapers, infirmaryVisits, schedule, animators);
        setIssues(results);
        setSuccessToast(`تم بنجاح حذف ${removed} سجل حضور مكرر وتثبيت السجلات الصحيحة.`);
        setTimeout(() => setSuccessToast(null), 4000);
      },
      'warning'
    );
  };

  const handleFixOrphans = () => {
    openConfirm(
      'تأكيد تنظيف السجلات اليتيمة',
      'سيتم حذف جميع سجلات الحضور والمخالفات وأوراق الخروج المرتبطة بمتعلمين غير موجودين حالياً في قاعدة البيانات. هل أنت متأكد؟',
      () => {
        const learnerIds = new Set(learners.map(l => l.id));
        const cleanAttendance = fixOrphanedAttendance(attendance, learnerIds);
        const cleanViolations = fixOrphanedViolations(violations, learnerIds);
        const cleanExits = fixOrphanedExits(exitPapers, learnerIds);
        const cleanInfirmary = fixOrphanedInfirmary(infirmaryVisits, learnerIds);

        const totalCleaned = 
          (attendance.length - cleanAttendance.length) +
          (violations.length - cleanViolations.length) +
          (exitPapers.length - cleanExits.length) +
          (infirmaryVisits.length - cleanInfirmary.length);

        setAttendance(cleanAttendance);
        setViolations(cleanViolations);
        setExitPapers(cleanExits);
        setInfirmaryVisits(cleanInfirmary);
        
        const results = auditDataIntegrity(learners, cleanAttendance, cleanViolations, cleanExits, cleanInfirmary, schedule, animators);
        setIssues(results);
        setSuccessToast(`تم تنظيف ${totalCleaned} سجل يتيم بنجاح.`);
        setTimeout(() => setSuccessToast(null), 4000);
      },
      'danger'
    );
  };

  const handleFixDuplicateLearnerRegs = () => {
    openConfirm(
      'تأكيد إعادة ترقيم أرقام التسجيل المكررة',
      'سيتم إسناد أرقام تسجيل فريدة جديدة لجميع المتعلمين الذين يحملون أرقاماً مكررة لضمان عدم حدوث تضارب. هل توافق؟',
      () => {
        const clean = fixDuplicateLearners(learners);
        setLearners(clean);
        const results = auditDataIntegrity(clean, attendance, violations, exitPapers, infirmaryVisits, schedule, animators);
        setIssues(results);
        setSuccessToast('تمت إعادة ترقيم أرقام التسجيل بنجاح وضمان فرادتها لجميع المتعلمين.');
        setTimeout(() => setSuccessToast(null), 4000);
      },
      'warning'
    );
  };

  const handleFixOrphanedSchedule = () => {
    if (!setSchedule) return;
    openConfirm(
      'تأكيد فك ارتباط الحصص بالمنشطين المحذوفين',
      'سيتم إلغاء تعيين المنشط للحصص التي تشير لمنشطين غير مسجلين حالياً. هل توافق؟',
      () => {
        const clean = fixOrphanedSchedule(schedule, animators);
        setSchedule(clean);
        const results = auditDataIntegrity(learners, attendance, violations, exitPapers, infirmaryVisits, clean, animators);
        setIssues(results);
        setSuccessToast('تم فك ارتباط المنشطين المحذوفين من جدول الحصص بنجاح.');
        setTimeout(() => setSuccessToast(null), 4000);
      },
      'warning'
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
        confirmLabel="نعم، تنفيذ الإجراء"
        cancelLabel="إلغاء"
      />

      {/* Success Toast Banner */}
      {successToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)} 
            className="text-white hover:opacity-80 px-2 py-1 rounded hover:bg-emerald-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تصحيح البيانات وحذف البيانات التجريبية (Correction & Données de test)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                تدقيق آلي
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              فحص شامل وتلقائي لسلامة قاعدة البيانات، مع إمكانية مراجعة وحذف البيانات التجريبية بأمان تام
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunAuditManual}
            disabled={isAuditing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'جاري الفحص...' : 'إعادة الفحص الآن'}</span>
          </button>

          {issues.length > 0 && (
            <button
              onClick={handleFixAllErrors}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20"
            >
              <Wrench className="w-4 h-4" />
              <span>تصحيح كافة الأخطاء تلقائياً</span>
            </button>
          )}
        </div>
      </div>

      {/* DEMO TEST DATA REMOVAL CARD (Instruction 1, 2, 8, 10) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:to-slate-900 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shrink-0 mt-1">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                حذف البيانات التجريبية (Suppression des données de test)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                {demoLearners.length} متعلم تجريبي · {demoAnimators.length} منشط تجريبي
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              يمكنك معاينة وحذف جميع السجلات التجريبية (Données de test) المرتبطة بالنظام التجريبي لمركز زيرارة، مع الاحتفاظ التام بالإعدادات الرسمية، العطل، الأقسام، الشعب، والحسابات والبيانات الحقيقية للمركز.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsReviewDemoModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
          >
            <Eye className="w-4 h-4 text-amber-600" />
            <span>معاينة السجلات المرشحة ({demoLearners.length})</span>
          </button>

          <button
            onClick={handleRemoveDemoTestData}
            disabled={demoLearners.length === 0 && demoAnimators.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-amber-600/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف البيانات التجريبية بأمان</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المشاكل المكتشفة</p>
          <p className={`text-3xl font-black ${issues.length === 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
            {issues.length}
          </p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm text-center">
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">أخطاء حرجة</p>
          <p className="text-3xl font-black text-rose-700 dark:text-rose-300">{stats.high}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm text-center">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">متوسطة الأهمية</p>
          <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{stats.medium}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm text-center">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">بسيطة / تحسينات</p>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-300">{stats.low}</p>
        </div>
      </div>

      {/* Quick Action Buttons per Error Category */}
      {issues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {issues.some(i => i.type === 'duplicate_attendance') && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">تسجيلات حضور مكررة</h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">تكرار تسجيل نفس الحصة والتاريخ</p>
              </div>
              <button
                onClick={handleFixDuplicateAttendance}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0"
              >
                حذف المكررات
              </button>
            </div>
          )}

          {issues.some(i => i.type.startsWith('orphaned')) && (
            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">سجلات يتيمة</h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">سجلات لمتعلمين غير مسجلين</p>
              </div>
              <button
                onClick={handleFixOrphans}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shrink-0"
              >
                تنظيف اليتامى
              </button>
            </div>
          )}

          {issues.some(i => i.type === 'duplicate_reg') && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">تكرار رقم التسجيل</h4>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">نفس رقم التسجيل لعدة متعلمين</p>
              </div>
              <button
                onClick={handleFixDuplicateLearnerRegs}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shrink-0"
              >
                إعادة الترقيم
              </button>
            </div>
          )}

          {issues.some(i => i.type === 'orphaned_schedule_animator') && (
            <div className="bg-sky-50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200">حصص لمنشطين محذوفين</h4>
                <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-0.5">فك تعيين المنشط في الجدول</p>
              </div>
              <button
                onClick={handleFixOrphanedSchedule}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shrink-0"
              >
                فك الارتباط
              </button>
            </div>
          )}
        </div>
      )}

      {/* Issues Detailed Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              قائمة نتائج التدقيق والفحص
            </h3>
            {lastAuditDate && (
              <span className="text-[11px] text-slate-400">
                (آخر فحص: {lastAuditDate})
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-500">
            {issues.length} تنبيه مسجل
          </span>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {issues.length > 0 ? (
            issues.map((issue) => (
              <div key={issue.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  issue.severity === 'high' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' :
                  issue.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' :
                  'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                }`}>
                  {issue.severity === 'high' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {issue.message}
                    </h4>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                      issue.severity === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                      issue.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {issue.severity === 'high' ? 'حرجة' : issue.severity === 'medium' ? 'متوسطة' : 'بسيطة'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">الإجراء المقترح:</span> {issue.suggestedAction}
                  </p>
                  
                  {issue.type.includes('duplicate') && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {issue.itemIds.map(id => {
                        const learner = learners.find(l => l.id === id);
                        return learner ? (
                          <div key={id} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
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
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  قاعدة البيانات سليمة ومتحقق منها!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  تم فحص جميع المتعلمين ({learners.length}) وسجلات الحضور والتخطيط، ولم يتم رصد أي أخطاء أو تعارضات.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Demo Data Modal (Instruction 10) */}
      {isReviewDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 animate-fadeIn space-y-5 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-xl">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    مراجعة السجلات المرشحة للحذف (البيانات التجريبية)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {demoLearners.length} متعلم و {demoAnimators.length} منشط تم رصدهم كبيانات تجريبية
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsReviewDemoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  لائحة المتعلمين التجريبيين ({demoLearners.length})
                </h4>
                {demoLearners.length > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto space-y-2">
                    {demoLearners.map(l => (
                      <div key={l.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-white">{l.arabicName} ({l.registrationNumber})</div>
                        <div className="text-slate-500">{l.className} - {l.stream}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">لا توجد بيانات متعلمين تجريبية.</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  لائحة المنشطين التجريبيين ({demoAnimators.length})
                </h4>
                {demoAnimators.length > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto space-y-2">
                    {demoAnimators.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-white">{a.arabicName} ({a.registrationNumber})</div>
                        <div className="text-slate-500">{a.specialty}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">لا توجد بيانات منشطين تجريبية.</p>
                )}
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-xs">
                ملاحظة: سيتم إنشاء نسخة احتياطية بصيغة JSON تلقائياً قبل تنفيذ عملية الحذف لتتمكن من استرجاع البيانات في أي وقت عند الحاجة.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsReviewDemoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                إغلاق ومعاينة لاحقة
              </button>
              <button
                onClick={() => {
                  setIsReviewDemoModalOpen(false);
                  handleRemoveDemoTestData();
                }}
                disabled={demoLearners.length === 0 && demoAnimators.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md"
              >
                تأكيد حذف البيانات التجريبية المرصودة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Helpful Explanatory Box */}
      <div className="bg-slate-100 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">
            تعليمات الحذف الآمن للبيانات التجريبية
          </p>
          <p className="leading-relaxed">
            تضمن لك هذه الأداة حذف السجلات التجريبية بدقة عالية دون المساس بأي بيانات حقيقية تم إدخالها من طرف الإدارة، مع الاحتفاظ بجميع إعدادات المؤسسة، العطل، الأقسام والشعب والتوقيت الرسمي سالمة تماماً.
          </p>
        </div>
      </div>
    </div>
  );
};
