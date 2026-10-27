import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Save, Check, Briefcase, GraduationCap } from 'lucide-react';
import { Animator, AppSettings, SessionType, AnimatorStatus } from '../types';
import { generateNextAnimatorNumber } from '../utils/storage';

interface AnimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (animator: Animator) => void;
  animatorToEdit?: Animator | null;
  existingAnimators: Animator[];
  settings: AppSettings;
}

const COMMON_SPECIALTIES = [
  'المعلوماتيات والرقمنة',
  'الكهرباء والميكانيك',
  'الفصالة والخياطة',
  'الحلاقة والتجميل',
  'الفلاحة المستدامة والري',
  'اللغة العربية والتربية المدنية',
  'الرياضيات والعلوم التطبيقية',
  'اللغة الفرنسية والتواصل المهني',
  'التوجيه وبناء المشروع الشخصي',
  'المهارات الحياتية والمقاولة',
  'التربية البدنية والأنشطة الموازية'
];

export const AnimatorModal: React.FC<AnimatorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  animatorToEdit,
  existingAnimators,
  settings,
}) => {
  const isEditing = Boolean(animatorToEdit);

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [frenchName, setFrenchName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [activityType, setActivityType] = useState<SessionType>('التأهيل التربوي');
  const [specialty, setSpecialty] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedStreams, setAssignedStreams] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<AnimatorStatus>('نشط');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (animatorToEdit) {
        setRegistrationNumber(animatorToEdit.registrationNumber || '');
        setArabicName(animatorToEdit.arabicName || '');
        setFrenchName(animatorToEdit.frenchName || '');
        setPhone(animatorToEdit.phone || '');
        setEmail(animatorToEdit.email || '');
        setActivityType(animatorToEdit.activityType || 'التأهيل التربوي');
        setSpecialty(animatorToEdit.specialty || '');
        setAssignedClasses(animatorToEdit.assignedClasses || []);
        setAssignedStreams(animatorToEdit.assignedStreams || []);
        setStartDate(animatorToEdit.startDate || new Date().toISOString().split('T')[0]);
        setStatus(animatorToEdit.status || 'نشط');
        setNotes(animatorToEdit.notes || '');
      } else {
        const nextNumber = generateNextAnimatorNumber(existingAnimators);
        setRegistrationNumber(nextNumber);
        setArabicName('');
        setFrenchName('');
        setPhone('');
        setEmail('');
        setActivityType('التأهيل المهني');
        setSpecialty('');
        setAssignedClasses(settings.classes.length > 0 ? [settings.classes[0]] : []);
        setAssignedStreams(settings.streams.length > 0 ? [settings.streams[0]] : []);
        setStartDate(new Date().toISOString().split('T')[0]);
        setStatus('نشط');
        setNotes('');
      }
    }
  }, [isOpen, animatorToEdit, existingAnimators, settings]);

  if (!isOpen) return null;

  const handleClassToggle = (cls: string) => {
    setAssignedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleStreamToggle = (stm: string) => {
    setAssignedStreams((prev) =>
      prev.includes(stm) ? prev.filter((s) => s !== stm) : [...prev, stm]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanArabicName = arabicName.trim();
    if (!cleanArabicName) {
      setError('يرجى إدخال الاسم الكامل بالعربية (إلزامي).');
      return;
    }

    const cleanRegNumber = registrationNumber.trim();
    if (!cleanRegNumber) {
      setError('يرجى تحديد الرقم التعريفي الداخلي للمنشط.');
      return;
    }

    // Check duplicate registration number
    const dupReg = existingAnimators.find(
      (a) =>
        (!isEditing || a.id !== animatorToEdit?.id) &&
        a.registrationNumber.trim().toUpperCase() === cleanRegNumber.toUpperCase()
    );
    if (dupReg) {
      setError(`الرقم التعريفي «${cleanRegNumber}» مسجل مسبقاً للمنشط (${dupReg.arabicName}). يرجى اختيار رقم فريد.`);
      return;
    }

    // Check duplicate name
    const dupName = existingAnimators.find(
      (a) =>
        (!isEditing || a.id !== animatorToEdit?.id) &&
        a.arabicName.trim() === cleanArabicName
    );
    if (dupName) {
      setError(`الاسم «${cleanArabicName}» مسجل بالفعل في لائحة المنشطين.`);
      return;
    }

    if (!phone.trim()) {
      setError('يرجى إدخال رقم الهاتف للتواصل.');
      return;
    }

    if (!specialty.trim()) {
      setError('يرجى إدخال أو اختيار التخصص / مجال التكوين.');
      return;
    }

    if (assignedClasses.length === 0) {
      setError('يرجى تحديد قسم واحد على الأقل مسند إلى المنشط.');
      return;
    }

    const updatedAnimator: Animator = {
      id: animatorToEdit ? animatorToEdit.id : `anm_${Date.now()}`,
      registrationNumber: cleanRegNumber,
      arabicName: cleanArabicName,
      frenchName: frenchName.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      specialty: specialty.trim(),
      activityType,
      assignedClasses,
      assignedStreams,
      startDate: startDate || new Date().toISOString().split('T')[0],
      status,
      notes: notes.trim() || undefined,
      createdAt: animatorToEdit ? animatorToEdit.createdAt : new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedAnimator);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'تعديل بيانات المنشط' : 'إضافة منشط / مؤطر جديد'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مركز الفرصة الثانية الجيل الجديد زرارة — بطاقة المنشط المهنية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Code + Status + Activity Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الرقم التعريفي الداخلي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="ANM-001"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع النشاط <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActivityType('التأهيل التربوي')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition ${
                    activityType === 'التأهيل التربوي'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>تأهيل تربوي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('التأهيل المهني')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition ${
                    activityType === 'التأهيل المهني'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>تأهيل مهني</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الوضعية المهنية <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AnimatorStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="نشط">نشط (Actif)</option>
                <option value="غير نشط">غير نشط (Inactif)</option>
                <option value="متوقف عن العمل">متوقف عن العمل (Suspendu)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Arabic Name & French Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الاسم الكامل بالعربية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
                placeholder="مثال: ذ. عبد الرحيم العثماني"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الاسم الكامل بالفرنسية (Nom & Prénom)
              </label>
              <input
                type="text"
                value={frenchName}
                onChange={(e) => setFrenchName(e.target.value)}
                placeholder="Ex: Abdelrahim El Othmani"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>
          </div>

          {/* Row 3: Phone & Email & Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الهاتف (الواتساب) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06XXXXXXXX"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني (عند الحاجة)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="animateur@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ بداية العمل بالمركز <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Specialty + Quick Suggestions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              التخصص أو مجال التكوين <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="مثال: المعلوماتيات والرقمنة، الفصالة والخياطة، الكهرباء..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">اقتراحات سريعة:</span>
              {COMMON_SPECIALTIES.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setSpecialty(item)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition ${
                    specialty === item
                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 font-bold'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Assigned Classes & Streams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                الأقسام المسندة للمنشط <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {settings.classes.map((cls) => {
                  const isChecked = assignedClasses.includes(cls);
                  return (
                    <label
                      key={cls}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border transition ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleClassToggle(cls)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>{cls}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                الشعب / الحرف المسندة للمنشط
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {settings.streams.map((stm) => {
                  const isChecked = assignedStreams.includes(stm);
                  return (
                    <label
                      key={stm}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border transition ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleStreamToggle(stm)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>{stm}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 6: Administrative Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات إدارية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي معطيات إدارية إضافية، طبيعة العقد، المهام التنسيقية، أو ظروف خاصة..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'حفظ التعديلات' : 'إضافة المنشط'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
