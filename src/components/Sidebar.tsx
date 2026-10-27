import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  ClipboardCheck, 
  History, 
  Settings, 
  Moon, 
  Sun, 
  Calendar, 
  ShieldAlert,
  FileText,
  LogOut,
  KeyRound,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { TabType, AppSettings, AdminUser } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: AppSettings;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentUser?: AdminUser | null;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  darkMode,
  setDarkMode,
  currentUser,
  onLogout,
  onChangePassword,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'students', label: 'إدارة المتعلمين', icon: <Users className="w-5 h-5" /> },
    { id: 'schedule', label: 'التخطيط الأسبوعي', icon: <Calendar className="w-5 h-5" /> },
    { id: 'attendance', label: 'ورقة النداء اليومية', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'tracking', label: 'تدبير الغيابات', icon: <History className="w-5 h-5" /> },
    { id: 'violations', label: 'المخالفات', icon: <ShieldAlert className="w-5 h-5" /> },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ];

  const isSuper = currentUser?.role === 'super_admin';

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed right-0 top-0 no-print z-20">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-sm font-black text-white leading-tight">
          {settings.schoolName}
        </h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">
          نظام تدبير المتعلمين
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-xs ${
                isActive 
                  ? 'bg-[var(--brand-blue)] text-white shadow-lg shadow-[var(--brand-blue)]/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Info & Logout */}
      {currentUser && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
              isSuper 
                ? 'bg-purple-900 text-purple-200 border border-purple-700' 
                : 'bg-blue-900 text-blue-200 border border-blue-700'
            }`}>
              {currentUser.fullName.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                {isSuper ? <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" /> : <Shield className="w-3 h-3 text-blue-400 shrink-0" />}
                <span className="truncate">{currentUser.title || (isSuper ? 'مدير النظام' : 'مستخدم إداري')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800/80 text-[11px]">
            {onChangePassword && (
              <button
                onClick={onChangePassword}
                title="تغيير كلمة المرور الشخصية"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-semibold"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>تغيير السر</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                title="تسجيل الخروج من الحساب"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-all font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            <span>{darkMode ? 'المظهر الفاتح' : 'المظهر الداكن'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
