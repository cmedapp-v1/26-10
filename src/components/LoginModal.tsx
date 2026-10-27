import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  KeyRound,
  Sparkles,
  Info
} from 'lucide-react';
import { AdminUser, AppSettings } from '../types';
import { verifyPassword, recordFailedAttempt, clearFailedAttempts, getFailedAttempts, recordAuditLog } from '../utils/authUtils';

interface LoginModalProps {
  isOpen: boolean;
  adminUsers: AdminUser[];
  setAdminUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  onLoginSuccess: (user: AdminUser) => void;
  settings: AppSettings;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  adminUsers,
  setAdminUsers,
  onLoginSuccess,
  settings,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      setErrorMsg('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    // Check failed attempts lockout
    const failedInfo = getFailedAttempts(cleanUsername);
    if (failedInfo.lockedUntil && Date.now() < failedInfo.lockedUntil) {
      const remainingSecs = Math.ceil((failedInfo.lockedUntil - Date.now()) / 1000);
      setErrorMsg(`تم حظر هذا الحساب مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار لمدة ${remainingSecs} ثانية.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const user = adminUsers.find(u => u.username.toLowerCase() === cleanUsername);

      if (!user) {
        recordFailedAttempt(cleanUsername);
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة.');
        setIsSubmitting(false);
        return;
      }

      if (user.status === 'غير نشط') {
        setErrorMsg('عذراً، هذا الحساب الإداري معطل حالياً. يرجى التواصل مع مدير النظام.');
        setIsSubmitting(false);
        return;
      }

      // Verify Password (supports both hashed password and fallback 'admin' / 'admin123' for default super admin)
      let isValid = await verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid && user.username.toLowerCase() === 'admin' && (password === 'admin' || password === 'admin123')) {
        isValid = true;
      }

      if (!isValid) {
        const attempt = recordFailedAttempt(cleanUsername);
        if (attempt.isLocked) {
          setErrorMsg('تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم حظر الدخول مؤقتاً لمدة 5 دقائق.');
        } else {
          setErrorMsg(`اسم المستخدم أو كلمة المرور غير صحيحة (المحاولة ${attempt.count} من 5).`);
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      clearFailedAttempts(cleanUsername);

      const now = new Date();
      const lastLoginAt = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

      const updatedUsers = adminUsers.map(u => {
        if (u.id === user.id) {
          return { ...u, lastLoginAt };
        }
        return u;
      });

      const loggedUser = { ...user, lastLoginAt };

      setAdminUsers(updatedUsers);
      recordAuditLog(
        { username: user.username, fullName: user.fullName },
        'تسجيل الدخول إلى النظام',
        user.username,
        `تسجيل دخول ناجح من طرف ${user.title}`
      );

      setIsSubmitting(false);
      onLoginSuccess(loggedUser);
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء التحقق من بيانات الدخول.');
      setIsSubmitting(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-8 space-y-5 relative overflow-hidden">
        
        {/* Top Decorative Banner */}
        <div className="text-center space-y-2">
          {settings.ministryLogoDataURL ? (
            <img 
              src={settings.ministryLogoDataURL} 
              alt="الوزارة" 
              className="h-16 w-auto mx-auto object-contain mb-2"
            />
          ) : (
            <div className="w-14 h-14 bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] rounded-2xl flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-8 h-8" />
            </div>
          )}

          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {settings.schoolName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            منظومة تدبير المتعلمين والحضور — تسجيل الدخول الإداري
          </p>
        </div>

        {/* Demo Admin Info Badge */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="font-semibold">
              اسم المستخدم: <span className="font-mono font-bold">admin</span> | كلمة المرور: <span className="font-mono font-bold">admin123</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shrink-0 shadow-xs"
          >
            تعبئة تلقائية
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-right text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم المستخدم (Login)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="اسم المستخدم الإداري (e.g. admin)"
                className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              كلمة المرور (Mot de passe)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور الخاصة بك"
                className="w-full pr-10 pl-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-3 top-1/2 -translate-y-1/2 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-[var(--brand-blue)]/30 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span>جاري التحقق والدخول...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>تسجيل الدخول للنظام</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          تطبيق تدبير المتعلمين · مدرسة الفرصة الثانية زرارة v1.0
        </div>

      </div>
    </div>
  );
};
