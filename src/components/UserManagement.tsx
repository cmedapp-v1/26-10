import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  Lock, 
  UserCheck, 
  UserX, 
  Phone, 
  Clock, 
  History, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  Shield,
  Layers,
  FileText
} from 'lucide-react';
import { 
  AdminUser, 
  UserRole, 
  UserPermissions, 
  SectionPermissionKey, 
  ActionPermissionKey, 
  AdminAuditLog,
  UserAccountStatus 
} from '../types';
import { 
  SECTION_LABELS, 
  ACTION_LABELS, 
  getFullPermissions, 
  getDefaultAdminPermissions, 
  generateNextUserNumber,
  hashPassword,
  recordAuditLog 
} from '../utils/authUtils';
import { ConfirmDialog } from './ConfirmDialog';

interface UserManagementProps {
  adminUsers: AdminUser[];
  setAdminUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  currentUser: AdminUser | null;
  auditLogs?: AdminAuditLog[];
}

export const UserManagement: React.FC<UserManagementProps> = ({
  adminUsers,
  setAdminUsers,
  currentUser,
  auditLogs = [],
}) => {
  // Tabs: 'users' or 'audit'
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserAccountStatus>('all');

  // Toast Notice State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Form Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [formFields, setFormFields] = useState<{
    fullName: string;
    username: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    title: string;
    phone: string;
    status: UserAccountStatus;
    mustChangePasswordOnFirstLogin: boolean;
    notes: string;
  }>({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'admin_user',
    title: 'مساعد إداري',
    phone: '',
    status: 'نشط',
    mustChangePasswordOnFirstLogin: true,
    notes: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Permissions Modal State
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<AdminUser | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions>(getDefaultAdminPermissions());

  // Reset Password Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userForPasswordReset, setUserForPasswordReset] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetMustChange, setResetMustChange] = useState(true);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Confirm Dialog State
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
    type: 'info',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return adminUsers.filter(u => {
      const matchSearch = 
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.title && u.title.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }, [adminUsers, searchTerm, filterRole, filterStatus]);

  // Statistics Counts
  const stats = useMemo(() => {
    const total = adminUsers.length;
    const active = adminUsers.filter(u => u.status === 'نشط').length;
    const superAdmins = adminUsers.filter(u => u.role === 'super_admin').length;
    const adminUsersCount = adminUsers.filter(u => u.role === 'admin_user').length;
    return { total, active, superAdmins, adminUsersCount };
  }, [adminUsers]);

  // Open Add User Modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormFields({
      fullName: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'admin_user',
      title: 'مساعد إداري',
      phone: '',
      status: 'نشط',
      mustChangePasswordOnFirstLogin: true,
      notes: '',
    });
    setFormError(null);
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormFields({
      fullName: user.fullName,
      username: user.username,
      password: '',
      confirmPassword: '',
      role: user.role,
      title: user.title || 'مستخدم إداري',
      phone: user.phone || '',
      status: user.status,
      mustChangePasswordOnFirstLogin: !!user.mustChangePasswordOnFirstLogin,
      notes: user.notes || '',
    });
    setFormError(null);
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = formFields.username.trim().toLowerCase();
    const cleanFullName = formFields.fullName.trim();

    if (!cleanFullName) {
      setFormError('يرجى إدخال الاسم الكامل للمستخدم الإداري.');
      return;
    }

    if (!cleanUsername) {
      setFormError('يرجى إدخال اسم المستخدم (Login).');
      return;
    }

    // Check unique username
    const exists = adminUsers.some(
      u => u.username.toLowerCase() === cleanUsername && (!editingUser || u.id !== editingUser.id)
    );
    if (exists) {
      setFormError(`اسم المستخدم (${cleanUsername}) مستعمل سابقاً، يرجى اختيار اسم مستخدم آخر.`);
      return;
    }

    // Check if regular admin tries to set super_admin role
    if (currentUser?.role !== 'super_admin' && formFields.role === 'super_admin') {
      setFormError('عذراً، ليس لديك صلاحية إسناد دور مدير النظام (Super Admin).');
      return;
    }

    if (editingUser) {
      // Edit Existing User
      let updatedPasswordHash = editingUser.passwordHash;
      let updatedSalt = editingUser.salt;

      if (formFields.password) {
        if (formFields.password.length < 6) {
          setFormError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
          return;
        }
        if (formFields.password !== formFields.confirmPassword) {
          setFormError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
          return;
        }
        const hashed = await hashPassword(formFields.password);
        updatedPasswordHash = hashed.hash;
        updatedSalt = hashed.salt;
      }

      const updatedUsers = adminUsers.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            fullName: cleanFullName,
            username: cleanUsername,
            role: formFields.role,
            title: formFields.title.trim() || 'مستخدم إداري',
            phone: formFields.phone.trim(),
            status: formFields.status,
            mustChangePasswordOnFirstLogin: formFields.mustChangePasswordOnFirstLogin,
            notes: formFields.notes.trim(),
            passwordHash: updatedPasswordHash,
            salt: updatedSalt,
            permissions: formFields.role === 'super_admin' ? getFullPermissions() : u.permissions,
          };
        }
        return u;
      });

      setAdminUsers(updatedUsers);
      setIsUserModalOpen(false);
      showToast('تم تحديث بيانات الحساب الإداري بنجاح!');

      if (currentUser) {
        recordAuditLog(
          { username: currentUser.username, fullName: currentUser.fullName },
          'تعديل بيانات حساب إداري',
          cleanUsername,
          `تعديل الصفة (${formFields.title}) والدور (${formFields.role}) والحالة (${formFields.status})`
        );
      }
    } else {
      // Create New User
      if (!formFields.password) {
        setFormError('يرجى تعيين كلمة مرور للحساب الجديد.');
        return;
      }
      if (formFields.password.length < 6) {
        setFormError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
        return;
      }
      if (formFields.password !== formFields.confirmPassword) {
        setFormError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
        return;
      }

      const { hash, salt } = await hashPassword(formFields.password);
      const newNum = generateNextUserNumber(adminUsers);

      const newUser: AdminUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userNumber: newNum,
        fullName: cleanFullName,
        username: cleanUsername,
        passwordHash: hash,
        salt,
        role: formFields.role,
        title: formFields.title.trim() || 'مساعد إداري',
        phone: formFields.phone.trim(),
        status: formFields.status,
        mustChangePasswordOnFirstLogin: formFields.mustChangePasswordOnFirstLogin,
        permissions: formFields.role === 'super_admin' ? getFullPermissions() : getDefaultAdminPermissions(),
        createdAt: new Date().toISOString().split('T')[0],
        notes: formFields.notes.trim(),
      };

      setAdminUsers([newUser, ...adminUsers]);
      setIsUserModalOpen(false);
      showToast(`تم إنشاء الحساب الإداري (${cleanUsername}) بنجاح!`);

      if (currentUser) {
        recordAuditLog(
          { username: currentUser.username, fullName: currentUser.fullName },
          'إضافة حساب إداري جديد',
          cleanUsername,
          `إنشاء حساب ${formFields.title} برقم ${newNum}`
        );
      }
    }
  };

  // Toggle User Status Active / Inactive
  const handleToggleUserStatus = (user: AdminUser) => {
    const isDeactivating = user.status === 'نشط';

    // Prevent deactivating the last active super admin
    if (isDeactivating && user.role === 'super_admin') {
      const activeSuperAdmins = adminUsers.filter(u => u.role === 'super_admin' && u.status === 'نشط');
      if (activeSuperAdmins.length <= 1) {
        openConfirm(
          'تعذر تعطيل الحساب',
          'لا يمكن تعطيل حساب مدير النظام الأخير في المؤسسة. يجب أن يظل حساب مدير نشط واحد على الأقل للوصول للنظام.',
          () => {},
          'warning'
        );
        return;
      }
    }

    const newStatus: UserAccountStatus = isDeactivating ? 'غير نشط' : 'نشط';
    const actionName = isDeactivating ? 'تعطيل' : 'تفعيل';

    openConfirm(
      `تأكيد ${actionName} الحساب`,
      `هل أنت متأكد من ${actionName} حساب (${user.fullName} - ${user.username})؟ ${isDeactivating ? 'سيتعذر على المستخدم تسجيل الدخول للنظام فوراً.' : 'سيتمكن المستخدم من تسجيل الدخول والعمل مجدداً.'}`,
      () => {
        const updated = adminUsers.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
        setAdminUsers(updated);
        showToast(`تم ${actionName} حساب (${user.username}) بنجاح.`);

        if (currentUser) {
          recordAuditLog(
            { username: currentUser.username, fullName: currentUser.fullName },
            `${actionName} حساب إداري`,
            user.username,
            `تغيير الحالة إلى ${newStatus}`
          );
        }
      },
      isDeactivating ? 'danger' : 'info'
    );
  };

  // Open Permissions Matrix Modal
  const handleOpenPermissionsModal = (user: AdminUser) => {
    setSelectedUserForPermissions(user);
    setTempPermissions(JSON.parse(JSON.stringify(user.permissions || getDefaultAdminPermissions())));
    setIsPermissionsModalOpen(true);
  };

  // Toggle single action permission
  const handleTogglePermission = (section: SectionPermissionKey, action: ActionPermissionKey) => {
    setTempPermissions(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [action]: !prev[section]?.[action],
      },
    }));
  };

  // Toggle all permissions for a section
  const handleToggleSectionAll = (section: SectionPermissionKey, enable: boolean) => {
    setTempPermissions(prev => ({
      ...prev,
      [section]: {
        view: enable,
        add: enable,
        edit: enable,
        delete: enable,
        export: enable,
        print: enable,
      },
    }));
  };

  // Save Permissions Matrix
  const handleSavePermissions = () => {
    if (!selectedUserForPermissions) return;

    const updated = adminUsers.map(u => {
      if (u.id === selectedUserForPermissions.id) {
        return { ...u, permissions: tempPermissions };
      }
      return u;
    });

    setAdminUsers(updated);
    setIsPermissionsModalOpen(false);
    showToast(`تم إسناد وتحديث صلاحيات الحساب (${selectedUserForPermissions.username}) بنجاح!`);

    if (currentUser) {
      recordAuditLog(
        { username: currentUser.username, fullName: currentUser.fullName },
        'تعديل صلاحيات الوصول (RBAC)',
        selectedUserForPermissions.username,
        'تحديد مصفوفة الصلاحيات حسب الأقسام والعمليات'
      );
    }
  };

  // Open Password Reset Modal
  const handleOpenPasswordResetModal = (user: AdminUser) => {
    setUserForPasswordReset(user);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetMustChange(true);
    setResetPasswordError(null);
    setIsResetPasswordModalOpen(true);
  };

  // Save Password Reset
  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError(null);

    if (!userForPasswordReset) return;

    if (!newPassword || newPassword.length < 6) {
      setResetPasswordError('كلمة المرور الجديدة يجب أن تتكون من 6 أحرف على الأقل.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetPasswordError('كلمتا المرور غير متطابقتين.');
      return;
    }

    const { hash, salt } = await hashPassword(newPassword);

    const updated = adminUsers.map(u => {
      if (u.id === userForPasswordReset.id) {
        return {
          ...u,
          passwordHash: hash,
          salt,
          mustChangePasswordOnFirstLogin: resetMustChange,
        };
      }
      return u;
    });

    setAdminUsers(updated);
    setIsResetPasswordModalOpen(false);
    showToast(`تمت إعادة تعيين كلمة المرور لحساب (${userForPasswordReset.username}) بنجاح!`);

    if (currentUser) {
      recordAuditLog(
        { username: currentUser.username, fullName: currentUser.fullName },
        'إعادة تعيين كلمة المرور',
        userForPasswordReset.username,
        `تعيين كلمة مرور جديدة (فرض التغيير عند الدخول: ${resetMustChange ? 'نعم' : 'لا'})`
      );
    }
  };

  // Delete User
  const handleDeleteUser = (user: AdminUser) => {
    if (user.role === 'super_admin') {
      const activeSuperAdmins = adminUsers.filter(u => u.role === 'super_admin');
      if (activeSuperAdmins.length <= 1) {
        openConfirm(
          'تعذر حذف الحساب',
          'لا يمكن حذف حساب مدير النظام الوحيد المسجل بالنظام.',
          () => {},
          'warning'
        );
        return;
      }
    }

    openConfirm(
      'تأكيد حذف الحساب الإداري نهائياً',
      `هل أنت متأكد من حذف حساب المستخدم الإداري (${user.fullName} - ${user.username})؟ لن تتمكن من التراجع عن هذه العملية.`,
      () => {
        const updated = adminUsers.filter(u => u.id !== user.id);
        setAdminUsers(updated);
        showToast(`تم حذف حساب (${user.username}) بنجاح.`);

        if (currentUser) {
          recordAuditLog(
            { username: currentUser.username, fullName: currentUser.fullName },
            'حذف حساب إداري',
            user.username,
            `حذف نهائي للحساب رقم ${user.userNumber}`
          );
        }
      },
      'danger'
    );
  };

  const sectionsList: SectionPermissionKey[] = [
    'dashboard', 'students', 'schedule', 'attendance', 'tracking', 'violations', 'reports', 'animators', 'settings'
  ];
  const actionsList: ActionPermissionKey[] = ['view', 'add', 'edit', 'delete', 'export', 'print'];

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      
      {/* Reusable Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmLabel="نعم، تأكيد الإجراء"
        cancelLabel="إلغاء"
      />

      {/* Toast Notice Banner */}
      {toastMessage && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white hover:opacity-80 font-bold px-2">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-[var(--brand-blue)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تدبير المستخدمين الإداريين (Gestion des utilisateurs)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                حماية وصلاحيات RBAC
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              إدارة حسابات الدخول، تعيين الصلاحيات الدقيقة بالعمليات والأقسام، وتتبع سجل الأنشطة الإدارية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'users' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الحسابات الإدارية ({adminUsers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'audit' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل العمليات ({auditLogs.length})</span>
            </button>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-blue)] hover:opacity-90 text-white rounded-xl font-bold text-xs shadow-md shadow-[var(--brand-blue)]/20 transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم إداري</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الحسابات الإدارية</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{stats.total}</div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الحسابات النشطة</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{stats.active}</div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مديرو النظام (Super Admin)</span>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">{stats.superAdmins}</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المستخدمون الإداريون</span>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">{stats.adminUsersCount}</div>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="البحث بالاسم الكامل، اسم المستخدم (Login)، أو الصفة الإدارية..."
                className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">جميع الصلاحيات</option>
                <option value="super_admin">مدير النظام (Super Admin)</option>
                <option value="admin_user">مستخدم إداري (Admin User)</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="نشط">نشط فقط</option>
                <option value="غير نشط">غير نشط فقط</option>
              </select>
            </div>
          </div>

          {/* Admin Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                    <th className="p-4">رقم الحساب</th>
                    <th className="p-4">المستخدم والاسم الكامل</th>
                    <th className="p-4">اسم الدخول (Login)</th>
                    <th className="p-4">الصفة الإدارية</th>
                    <th className="p-4">المستوى والصلاحيات</th>
                    <th className="p-4">حالة الحساب</th>
                    <th className="p-4">تاريخ الإنشاء / آخر دخول</th>
                    <th className="p-4 text-center">العمليات الإدارية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => {
                      const isSuper = user.role === 'super_admin';
                      const isActive = user.status === 'نشط';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-500">
                            {user.userNumber}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                                isSuper 
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' 
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {user.fullName.substring(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm">
                                  {user.fullName}
                                </div>
                                {user.phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                                    <Phone className="w-3 h-3" />
                                    <span>{user.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                              @{user.username}
                            </span>
                          </td>

                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                            {user.title || 'مستخدم إداري'}
                          </td>

                          <td className="p-4">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isSuper 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}>
                                {isSuper ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                <span>{isSuper ? 'مدير النظام (Super Admin)' : 'مستخدم إداري (Admin User)'}</span>
                              </span>

                              {!isSuper && (
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  صلاحيات مخصصة بحسب الأقسام
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                              isActive 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              <span>{user.status}</span>
                            </span>
                          </td>

                          <td className="p-4 text-slate-500 dark:text-slate-400">
                            <div className="font-mono text-[11px]">{user.createdAt}</div>
                            {user.lastLoginAt ? (
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>آخر دخول: {user.lastLoginAt}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-500 mt-0.5 italic">لم يسجل الدخول بعد</div>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit Profile */}
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                title="تعديل البيانات الشخصية والمهنية"
                                className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Manage Permissions */}
                              {user.role === 'admin_user' && (
                                <button
                                  onClick={() => handleOpenPermissionsModal(user)}
                                  title="تخصيص وإدارة صلاحيات الأقسام (RBAC)"
                                  className="p-1.5 text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                onClick={() => handleOpenPasswordResetModal(user)}
                                title="إعادة تعيين كلمة المرور"
                                className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Toggle Active Status */}
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isActive 
                                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50' 
                                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                }`}
                              >
                                {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>

                              {/* Delete Account */}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                title="حذف الحساب نهائياً"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        لا توجد حسابات إدارية تطابق خيارات البحث الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audit Trail Log View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                سجل الأنشطة والعمليات الإدارية (Audit Trail Logs)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              إجمالي السجلات: {auditLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">التاريخ والتوقيت</th>
                  <th className="p-3">المنفذ (المستخدم)</th>
                  <th className="p-3">نوع العملية الإدارية</th>
                  <th className="p-3">الحساب المستهدف</th>
                  <th className="p-3">تفاصيل الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.length > 0 ? (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {log.timestamp}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {log.actorName} (@{log.actorUsername})
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {log.targetUsername ? `@${log.targetUsername}` : '—'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      لا توجد سجلات عمليات مسجلة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-fadeIn space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                  {editingUser ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingUser ? `تعديل حساب المستخدم (${editingUser.username})` : 'إضافة مستخدم إداري جديد'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser ? 'تحديث البيانات الشخصية والدور الإداري' : 'إنشاء حساب جديد وتحديد كلمة المرور والصلاحيات'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-right text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={formFields.fullName}
                  onChange={e => setFormFields({ ...formFields, fullName: e.target.value })}
                  placeholder="مثال: عبد الرحيم المنصوري"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-blue)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المستخدم (Login) *</label>
                  <input
                    type="text"
                    required
                    value={formFields.username}
                    onChange={e => setFormFields({ ...formFields, username: e.target.value })}
                    placeholder="مثال: a_mansouri"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-blue)]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formFields.phone}
                    onChange={e => setFormFields({ ...formFields, phone: e.target.value })}
                    placeholder="0661234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الصفة / المهمة الإدارية *</label>
                  <input
                    type="text"
                    required
                    value={formFields.title}
                    onChange={e => setFormFields({ ...formFields, title: e.target.value })}
                    placeholder="مثال: حارس عام، مقتصد، كاتب إداري..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مستوى الصلاحية (Role) *</label>
                  <select
                    value={formFields.role}
                    onChange={e => setFormFields({ ...formFields, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="admin_user">مستخدم إداري (محدد الصلاحيات)</option>
                    {currentUser?.role === 'super_admin' && (
                      <option value="super_admin">مدير النظام (Super Admin - وصول كامل)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Password Fields */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {editingUser ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور والأمان *'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-700 text-[11px] flex items-center gap-1 font-bold"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'إخفاء' : 'إظهار'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={formFields.password}
                      onChange={e => setFormFields({ ...formFields, password: e.target.value })}
                      placeholder={editingUser ? 'اتركه فارغاً لإبقاء القديمة' : 'كلمة المرور (6+ أحرف)'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser && !!formFields.password}
                      value={formFields.confirmPassword}
                      onChange={e => setFormFields({ ...formFields, confirmPassword: e.target.value })}
                      placeholder="تأكيد كلمة المرور"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formFields.mustChangePasswordOnFirstLogin}
                    onChange={e => setFormFields({ ...formFields, mustChangePasswordOnFirstLogin: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--brand-blue)]"
                  />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    فرض تغيير كلمة المرور عند أول تسجيل دخول للحساب
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">حالة الحساب *</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="status"
                      value="نشط"
                      checked={formFields.status === 'نشط'}
                      onChange={() => setFormFields({ ...formFields, status: 'نشط' })}
                      className="text-emerald-600"
                    />
                    <span className="text-emerald-700 dark:text-emerald-400">نشط (مسموح بالدخول)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="status"
                      value="غير نشط"
                      checked={formFields.status === 'غير نشط'}
                      onChange={() => setFormFields({ ...formFields, status: 'غير نشط' })}
                      className="text-rose-600"
                    />
                    <span className="text-rose-700 dark:text-rose-400">غير نشط (معطل)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إدارية</label>
                <textarea
                  rows={2}
                  value={formFields.notes}
                  onChange={e => setFormFields({ ...formFields, notes: e.target.value })}
                  placeholder="ملاحظات حول المهام أو صلاحيات المستخدم..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 rounded-xl"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-[var(--brand-blue)] hover:opacity-90 rounded-xl shadow-md"
                >
                  {editingUser ? 'حفظ التغييرات' : 'إنشاء الحساب الآن'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: PERMISSIONS MATRIX (RBAC) */}
      {isPermissionsModalOpen && selectedUserForPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 animate-fadeIn space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    إدارة صلاحيات الوصول (RBAC) — @{selectedUserForPermissions.username}
                  </h3>
                  <p className="text-xs text-slate-500">
                    تخصيص إمكانية الوصول والعمليات لكل قسم من أقسام المنظومة
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPermissionsModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">إجراءات سريعة لتخصيص الصلاحيات:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempPermissions(getFullPermissions())}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold"
                  >
                    منح جميع الصلاحيات
                  </button>
                  <button
                    onClick={() => setTempPermissions(getDefaultAdminPermissions())}
                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold"
                  >
                    استعادة الافتراضي
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3">القسم / الوظيفة</th>
                      {actionsList.map(action => (
                        <th key={action} className="p-3 text-center">
                          {ACTION_LABELS[action]}
                        </th>
                      ))}
                      <th className="p-3 text-center">تحديد الكل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sectionsList.map(section => {
                      const secPerms = tempPermissions[section] || { view: false, add: false, edit: false, delete: false, export: false, print: false };
                      const allChecked = actionsList.every(a => secPerms[a]);

                      return (
                        <tr key={section} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {SECTION_LABELS[section]}
                          </td>

                          {actionsList.map(action => (
                            <td key={action} className="p-3 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={!!secPerms[action]}
                                  onChange={() => handleTogglePermission(section, action)}
                                  className="w-4 h-4 rounded text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
                                />
                              </label>
                            </td>
                          ))}

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSectionAll(section, !allChecked)}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                allChecked 
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {allChecked ? 'إلغاء الكل' : 'تحديد الكل'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setIsPermissionsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-6 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md"
              >
                حفظ وإسناد الصلاحيات
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {isResetPasswordModalOpen && userForPasswordReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-fadeIn space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    إعادة تعيين كلمة المرور
                  </h3>
                  <p className="text-xs text-slate-500">
                    للمستخدم: @{userForPasswordReset.username} ({userForPasswordReset.fullName})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>

            {resetPasswordError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resetPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleSavePasswordReset} className="space-y-4 text-right text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="6 أحرف أو أرقام على الأقل"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة *</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور للتحقق"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={resetMustChange}
                  onChange={e => setResetMustChange(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--brand-blue)]"
                />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  فرض تغيير كلمة المرور عند أول تسجيل دخول قادم
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
                >
                  تأكيد وحفظ كلمة المرور
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
