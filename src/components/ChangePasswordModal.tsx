import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '../types';
import { verifyPassword, hashPassword, recordAuditLog } from '../utils/authUtils';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser;
  adminUsers: AdminUser[];
  setAdminUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  setCurrentUser: (user: AdminUser) => void;
  isForcedFirstLogin?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  adminUsers,
  setAdminUsers,
  setCurrentUser,
  isForcedFirstLogin = false,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isForcedFirstLogin && !currentPassword) {
      setErrorMsg('يرجى إدخال كلمة المرور الحالية.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('كلمة المرور الجديدة يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isForcedFirstLogin) {
        const isCurrentValid = await verifyPassword(currentPassword, currentUser.passwordHash, currentUser.salt);
        if (!isCurrentValid) {
          setErrorMsg('كلمة المرور الحالية غير صحيحة.');
          setIsSubmitting(false);
          return;
        }
      }

      const { hash, salt } = await hashPassword(newPassword);

      const updatedUser: AdminUser = {
        ...currentUser,
        passwordHash: hash,
        salt,
        mustChangePasswordOnFirstLogin: false,
      };

      const updatedList = adminUsers.map(u => u.id === currentUser.id ? updatedUser : u);

      setAdminUsers(updatedList);
      setCurrentUser(updatedUser);

      recordAuditLog(
        { username: currentUser.username, fullName: currentUser.fullName },
        'تغيير كلمة المرور الشخصية',
        currentUser.username,
        isForcedFirstLogin ? 'تغيير كلمة المرور الأولية عند أول تسجيل دخول' : 'تعديل كلمة المرور الشخصية'
      );

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء تحديث كلمة المرور.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 text-right">
        
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isForcedFirstLogin ? 'تغيير كلمة المرور الأولية (مطلوب)' : 'تغيير كلمة المرور الشخصية'}
            </h3>
            <p className="text-xs text-slate-500">
              {isForcedFirstLogin 
                ? 'يتوجب عليك تعيين كلمة مرور جديدة آمنة لإكمال الدخول للنظام' 
                : 'تحديث كلمة المرور لحسابك الإداري'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!isForcedFirstLogin && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الحالية *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="6 أحرف أو أرقام على الأقل"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور الجديدة"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-500 hover:text-slate-700 text-[11px] font-bold flex items-center gap-1"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            {!isForcedFirstLogin && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 rounded-xl"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[var(--brand-blue)] hover:opacity-90 rounded-xl shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
