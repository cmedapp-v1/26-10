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
  FileText
} from 'lucide-react';
import { TabType, AppSettings } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: AppSettings;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  darkMode,
  setDarkMode,
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

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed right-0 top-0 no-print">
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
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
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

      {/* Theme Toggle */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          <span>{darkMode ? 'المظهر الفاتح' : 'المظهر الداكن'}</span>
        </button>
      </div>
    </div>
  );
};
