import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  School, 
  Plus, 
  Trash2,
  Database,
  Info,
  ShieldCheck,
  AppWindow,
  UserCheck,
  UserCog
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  AppSettings, 
  Learner, 
  AttendanceRecord, 
  ScheduledSession, 
  Holiday, 
  Violation, 
  CommitmentRecord, 
  ExitPaper, 
  InfirmaryVisit,
  Animator,
  AdminUser,
  AdminAuditLog
} from '../types';
import { exportFullBackup, restoreFullBackup, resetToDemoData } from '../utils/storage';
import { DEFAULT_VIOLATION_TYPES } from '../utils/initialData';
import { Backup } from './Backup';
import { DataCorrection } from './DataCorrection';
import { AnimatorManagement } from './AnimatorManagement';
import { UserManagement } from './UserManagement';

export type SettingsSubTab = 'general' | 'users' | 'animators' | 'backup' | 'correction';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  schedule: ScheduledSession[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduledSession[]>>;
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  violations: Violation[];
  setViolations: React.Dispatch<React.SetStateAction<Violation[]>>;
  commitments: CommitmentRecord[];
  setCommitments: React.Dispatch<React.SetStateAction<CommitmentRecord[]>>;
  exitPapers: ExitPaper[];
  setExitPapers: React.Dispatch<React.SetStateAction<ExitPaper[]>>;
  infirmaryVisits: InfirmaryVisit[];
  setInfirmaryVisits: React.Dispatch<React.SetStateAction<InfirmaryVisit[]>>;
  animators?: Animator[];
  setAnimators?: React.Dispatch<React.SetStateAction<Animator[]>>;
  adminUsers?: AdminUser[];
  setAdminUsers?: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  currentUser?: AdminUser | null;
  auditLogs?: AdminAuditLog[];
  initialSubTab?: SettingsSubTab;
  onNavigateToSchedule?: (animatorName?: string) => void;
}

type SubTab = SettingsSubTab;

export const Settings: React.FC<SettingsProps> = ({
  settings,
  setSettings,
  learners,
  setLearners,
  attendance,
  setAttendance,
  schedule,
  setSchedule,
  holidays,
  setHolidays,
  violations,
  setViolations,
  commitments,
  setCommitments,
  exitPapers,
  setExitPapers,
  infirmaryVisits,
  setInfirmaryVisits,
  animators,
  setAnimators,
  adminUsers,
  setAdminUsers,
  currentUser,
  auditLogs = [],
  initialSubTab,
  onNavigateToSchedule,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab || 'general');

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Local state for settings form
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    violationTypes: settings.violationTypes || DEFAULT_VIOLATION_TYPES,
  });
  const [newClass, setNewClass] = useState('');
  const [newStream, setNewStream] = useState('');
  const [newViolationType, setNewViolationType] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Demo Reset Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

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

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    openConfirm(
      'تأكيد حفظ الإعدادات',
      'هل أنت متأكد من أنك تريد حفظ التغييرات التي أجريتها على إعدادات المؤسسة والنظام؟',
      () => {
        setSettings(formData);
        setSaveToast('تم حفظ الإعدادات بنجاح!');
        setTimeout(() => setSaveToast(null), 3000);
      },
      'warning'
    );
  };

  // Logo Uploads
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'school' | 'ministry' | 'association') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFormData((prev) => {
          if (type === 'school') return { ...prev, schoolLogoDataURL: dataUrl };
          if (type === 'ministry') return { ...prev, ministryLogoDataURL: dataUrl };
          return { ...prev, associationLogoDataURL: dataUrl };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Class
  const handleAddClass = () => {
    if (!newClass.trim()) return;
    if (formData.classes.includes(newClass.trim())) return;
    setFormData((prev) => ({ ...prev, classes: [...prev.classes, newClass.trim()] }));
    setNewClass('');
  };

  // Remove Class
  const handleRemoveClass = (cls: string) => {
    openConfirm(
      'تأكيد حذف القسم',
      `هل أنت متأكد من أنك تريد حذف القسم (${cls})؟ قد يؤثر هذا على عرض المتعلمين المنتمين لهذا القسم.`,
      () => setFormData((prev) => ({ ...prev, classes: prev.classes.filter((c) => c !== cls) })),
      'danger'
    );
  };

  // Add Stream
  const handleAddStream = () => {
    if (!newStream.trim()) return;
    if (formData.streams.includes(newStream.trim())) return;
    setFormData((prev) => ({ ...prev, streams: [...prev.streams, newStream.trim()] }));
    setNewStream('');
  };

  // Remove Stream
  const handleRemoveStream = (st: string) => {
    openConfirm(
      'تأكيد حذف الشعبة',
      `هل أنت متأكد من أنك تريد حذف الشعبة (${st})؟`,
      () => setFormData((prev) => ({ ...prev, streams: prev.streams.filter((s) => s !== st) })),
      'danger'
    );
  };

  // Add Violation Type
  const handleAddViolationType = () => {
    if (!newViolationType.trim()) return;
    const currentTypes = formData.violationTypes || DEFAULT_VIOLATION_TYPES;
    if (currentTypes.includes(newViolationType.trim())) return;
    setFormData((prev) => ({
      ...prev,
      violationTypes: [...(prev.violationTypes || DEFAULT_VIOLATION_TYPES), newViolationType.trim()],
    }));
    setNewViolationType('');
  };

  // Remove Violation Type
  const handleRemoveViolationType = (vt: string) => {
    openConfirm(
      'تأكيد حذف نوع المخالفة',
      `هل أنت متأكد من أنك تريد حذف نوع المخالفة (${vt})؟`,
      () => {
        const currentTypes = formData.violationTypes || DEFAULT_VIOLATION_TYPES;
        setFormData((prev) => ({
          ...prev,
          violationTypes: currentTypes.filter((t) => t !== vt),
        }));
      },
      'danger'
    );
  };

  // Reset Violation Types to Defaults
  const handleResetViolationTypes = () => {
    setFormData((prev) => ({
      ...prev,
      violationTypes: [...DEFAULT_VIOLATION_TYPES],
    }));
  };

  // Handle Restore JSON File
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setRestoreError(null);
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = restoreFullBackup(content);

      if (res.success && res.data) {
        setSettings(res.data.settings);
        setLearners(res.data.learners);
        setAttendance(res.data.attendance);
        if (res.data.schedule) setSchedule(res.data.schedule);
        if (res.data.holidays) setHolidays(res.data.holidays);
        if (res.data.violations) setViolations(res.data.violations);
        if (res.data.commitments) setCommitments(res.data.commitments);
        if (res.data.exitPapers) setExitPapers(res.data.exitPapers);
        if (res.data.infirmaryVisits) setInfirmaryVisits(res.data.infirmaryVisits);
        if (res.data.animators && setAnimators) setAnimators(res.data.animators);
        
        setIsRestoreModalOpen(false);
        setRestoreFile(null);
        setSaveToast('تمت استعادة النسخة الاحتياطية بنجاح!');
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        setRestoreError(res.message);
      }
    };
    reader.readAsText(restoreFile);
  };

  // Handle Load Demo Data
  const handleConfirmDemoReset = () => {
    const demo = resetToDemoData();
    setSettings(demo.settings);
    setLearners(demo.learners);
    setAttendance(demo.attendance);
    setSchedule(demo.schedule);
    setHolidays(demo.holidays);
    if (demo.violations) setViolations(demo.violations);
    if (demo.commitments) setCommitments(demo.commitments);
    if (demo.exitPapers) setExitPapers(demo.exitPapers);
    if (demo.infirmaryVisits) setInfirmaryVisits(demo.infirmaryVisits);
    if (demo.animators && setAnimators) setAnimators(demo.animators);
    
    setIsDemoModalOpen(false);
    setSaveToast('تم تحميل البيانات التجريبية بنجاح!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const tabs = [
    { id: 'general', label: 'إعدادات عامة', icon: <AppWindow className="w-4 h-4" /> },
    { id: 'users', label: 'تدبير المستخدمين الإداريين', icon: <UserCog className="w-4 h-4" /> },
    { id: 'animators', label: 'تدبير المنشطين والمؤطرين', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: <Database className="w-4 h-4" /> },
    { id: 'correction', label: 'تصحيح البيانات', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

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
      
      {/* Save Success Toast */}
      {saveToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-white hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-800/50 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as SubTab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === tab.id 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <>
          {/* Local Storage Notice Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold block text-sm mb-0.5">ملاحظة هامة بشأن حفظ البيانات المحلية:</span>
              يتم حفظ جميع البيانات المتعلقة بالمتعلمين وسجلات الحضور والغياب بشكل آلي ومستمر في المتصفح المحالي لهذا الجهاز (<span className="font-mono font-bold">localStorage</span>).
              لحماية بيانات المؤسسة من الضياع عند مسح ذاكرة المتصفح، نوصي شديد التوصية بتنزيل نسخ احتياطية بانتظام وحفظها في مجلد آمن.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Settings Form */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-emerald-600" />
                  <span>إعدادات النظام والمؤسسة</span>
                </h2>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* School Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم المؤسسة
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  {/* Ministry Logo Upload */}
                  <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      شعار الوزارة / المديرية (الجهة اليمنى)
                    </label>
                    <div className="flex items-center gap-4">
                      {formData.ministryLogoDataURL && (
                        <img src={formData.ministryLogoDataURL} alt="شعار الوزارة" className="h-16 w-auto rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-1" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'ministry')}
                        className="text-[11px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 hover:file:opacity-80"
                      />
                      {formData.ministryLogoDataURL && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, ministryLogoDataURL: null }))}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Association Logo Upload */}
                  <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      شعار الهيئة / الجمعية (الجهة اليسرى)
                    </label>
                    <div className="flex items-center gap-4">
                      {formData.associationLogoDataURL && (
                        <img src={formData.associationLogoDataURL} alt="شعار الهيئة" className="h-16 w-auto rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-1" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'association')}
                        className="text-[11px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 hover:file:opacity-80"
                      />
                      {formData.associationLogoDataURL && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, associationLogoDataURL: null }))}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>

                  {/* School Logo Upload */}
                  <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      شعار المدرسة الرسمي (بجانب الاسم)
                    </label>
                    <div className="flex items-center gap-4">
                      {formData.schoolLogoDataURL && (
                        <img src={formData.schoolLogoDataURL} alt="شعار المدرسة" className="h-16 w-auto rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-1" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'school')}
                        className="text-[11px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 hover:file:opacity-80"
                      />
                      {formData.schoolLogoDataURL && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, schoolLogoDataURL: null }))}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>

                  {/* School Year */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      السنة الدراسية
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 2025/2026"
                      value={formData.schoolYear}
                      onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  {/* Alert Threshold */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عتبة التنبيه للغيابات غير المبررة (عدد الحصص)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={formData.alertThreshold}
                      onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value, 10) || 3 })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                </div>

                {/* Classes List Management */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    قائمة الأقسام والمجموعات
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="أضف قسم جديد..."
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddClass}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.classes.map((cls) => (
                      <span
                        key={cls}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                      >
                        <span>{cls}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(cls)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Streams List Management */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    قائمة الشعب والمهن المتاحة
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="أضف شعبة جديدة..."
                      value={newStream}
                      onChange={(e) => setNewStream(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddStream}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.streams.map((st) => (
                      <span
                        key={st}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                      >
                        <span>{st}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStream(st)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Violation Types Management */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      قائمة أنواع المخالفات التأديبية
                    </label>
                    <button
                      type="button"
                      onClick={handleResetViolationTypes}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      استعادة الأنواع الافتراضية
                    </button>
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="أضف نوع مخالفة جديد..."
                      value={newViolationType}
                      onChange={(e) => setNewViolationType(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddViolationType}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(formData.violationTypes || DEFAULT_VIOLATION_TYPES).map((vt) => (
                      <span
                        key={vt}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900"
                      >
                        <span>{vt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveViolationType(vt)}
                          className="text-rose-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ التغييرات الإعدادية</span>
                  </button>
                </div>

              </form>

            </div>

            {/* Quick Actions Side Panel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-5 h-5 text-emerald-600" />
                  <span>إجراءات سريعة</span>
                </h3>

                <div className="mt-4 space-y-4">
                  
                  {/* Demo Sample Data Reset */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      بيانات تجريبية للنظام
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      تحميل بيانات نموذجية لتقييم جميع وظائف التطبيق بمركز زرارة.
                    </p>
                    <button
                      onClick={() => setIsDemoModalOpen(true)}
                      className="w-full mt-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>تحميل بيانات تجريبية</span>
                    </button>
                  </div>

                  {/* Desktop App / EXE Guide */}
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      تشغيل التطبيق كبرنامج مستقيل
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      يمكن تشغيل تطبيق «تدبير المتعلمين» بدون إنترنت كبرنامج مدمج على حاسوب المركز عن طريق:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1 mt-1 font-medium">
                      <li>تثبيت التطبيق مباشرة كـ PWA عبر شريط المتصفح.</li>
                    </ul>
                  </div>

                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
                تطبيق «تدبير المتعلمين» · مركز الفرصة الثانية – الجيل الجديد زرارة v1.0
              </div>
            </div>

          </div>
        </>
      )}

      {activeSubTab === 'users' && adminUsers && setAdminUsers && (
        <UserManagement
          adminUsers={adminUsers}
          setAdminUsers={setAdminUsers}
          currentUser={currentUser || null}
          auditLogs={auditLogs}
        />
      )}

      {activeSubTab === 'animators' && animators && setAnimators && (
        <AnimatorManagement
          animators={animators}
          setAnimators={setAnimators}
          schedule={schedule}
          setSchedule={setSchedule}
          settings={settings}
          onNavigateToSchedule={onNavigateToSchedule}
        />
      )}

      {activeSubTab === 'backup' && (
        <Backup 
          settings={settings}
          learners={learners}
          attendance={attendance}
          schedule={schedule}
          holidays={holidays}
          violations={violations}
          commitments={commitments}
          exitPapers={exitPapers}
          infirmaryVisits={infirmaryVisits}
          setSettings={setSettings}
          setLearners={setLearners}
          setAttendance={setAttendance}
          setSchedule={setSchedule}
          setHolidays={setHolidays}
          setViolations={setViolations}
          setCommitments={setCommitments}
          setExitPapers={setExitPapers}
          setInfirmaryVisits={setInfirmaryVisits}
        />
      )}

      {activeSubTab === 'correction' && (
        <DataCorrection 
          learners={learners}
          setLearners={setLearners}
          attendance={attendance}
          setAttendance={setAttendance}
          violations={violations}
          setViolations={setViolations}
          exitPapers={exitPapers}
          setExitPapers={setExitPapers}
          infirmaryVisits={infirmaryVisits}
          setInfirmaryVisits={setInfirmaryVisits}
          settings={settings}
          schedule={schedule}
          setSchedule={setSchedule}
          animators={animators}
          setAnimators={setAnimators}
        />
      )}

      {/* Restore JSON Modal */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn">
            
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد استعادة النسخة الاحتياطية
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              تنبيه: استعادة ملف البيانات سيحل محل جميع سجلات المتعلمين الحالية. يرجى اختيار ملف النسخة الاحتياطية بصيغة JSON.
            </p>

            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFileSelect}
              className="mt-4 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
            />

            {restoreError && (
              <p className="mt-3 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded">
                {restoreError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                إلغاء
              </button>
              <button
                disabled={!restoreFile}
                onClick={handleConfirmRestore}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                تأكيد واستبدال البيانات
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Demo Reset Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn">
            
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <RefreshCw className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تحميل البيانات النموذجية
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              سيتم إعادة ضبط النظام واستبدال البيانات الحالية ببيانات تجريبية لمدرسة الفرصة الثانية زيرارة لتجربة جميع ميزات التتبع والإحصائيات.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDemoReset}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              >
                تأكيد تحميل البيانات التجريبية
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
