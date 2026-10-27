import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  History, 
  Settings, 
  Moon, 
  Sun, 
  School,
  AlertTriangle,
  Download,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { TabType, AppSettings } from '../types';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: AppSettings;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  alertCount: number;
  onExportBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  darkMode,
  setDarkMode,
  alertCount,
  onExportBackup,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'لوحة القيادة',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'students',
      label: 'تدبير المتعلمين',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'attendance',
      label: 'تسجيل الحضور',
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      id: 'schedule',
      label: 'استعمال الزمن',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'tracking',
      label: 'تتبع الغيابات',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'violations',
      label: 'المخالفات',
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'الإعدادات والنسخ',
      icon: <Settings className="w-4 h-4" />,
    },
  ];


  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Institution Info */}
          <div className="flex items-center gap-3 shrink-0">
            <img 
              src={settings.schoolLogoDataURL || "/public/assets/aistudio/cmedmaroc.org_-440x131_8fa2c039.jpeg"} 
              alt="شعار المركز" 
              className="w-10 h-10 rounded-xl object-contain bg-white p-1"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  تدبير المتعلمين
                </h1>
                <span className="hidden sm:inline text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  تطبيق رسمي
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{settings.schoolName}</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  السنة الدراسية {settings.schoolYear}
                </span>
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const hasAlert = item.id === 'dashboard' && alertCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {hasAlert && (
                    <span className="flex items-center justify-center w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Alert shortcut button if threshold exceeded */}
            {alertCount > 0 && (
              <button
                onClick={() => setActiveTab('dashboard')}
                title="تنبيهات تجاوز عتبة الغيابات"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-bounce" />
                <span className="hidden sm:inline">{alertCount} تنبيهات</span>
              </button>
            )}

            {/* Quick Export JSON Backup */}
            <button
              onClick={onExportBackup}
              title="تنزيل نسخة احتياطية سريعة"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>نسخة احتياطية</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden flex items-center justify-between border-t border-slate-200 dark:border-slate-800 py-2 overflow-x-auto gap-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
