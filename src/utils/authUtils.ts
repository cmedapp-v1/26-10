import { 
  AdminUser, 
  UserPermissions, 
  SectionPermissionKey, 
  ActionPermissionKey, 
  AdminAuditLog,
  UserRole
} from '../types';

const ADMIN_USERS_KEY = 'e2s_zirara_admin_users';
const CURRENT_USER_SESSION_KEY = 'e2s_zirara_current_user_session';
const ADMIN_AUDIT_LOGS_KEY = 'e2s_zirara_admin_audit_logs';
const FAILED_LOGIN_ATTEMPTS_KEY = 'e2s_zirara_failed_login_attempts';

export const SECTION_LABELS: Record<SectionPermissionKey, string> = {
  dashboard: 'لوحة القيادة',
  students: 'إدارة المتعلمين',
  schedule: 'التخطيط الأسبوعي',
  attendance: 'ورقة النداء اليومية',
  tracking: 'تدبير الغيابات',
  violations: 'المخالفات',
  reports: 'التقارير والإحصائيات',
  animators: 'تدبير المنشطين والمؤطرين',
  settings: 'الإعدادات',
};

export const ACTION_LABELS: Record<ActionPermissionKey, string> = {
  view: 'عرض',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  export: 'تصدير',
  print: 'طباعة',
};

// Generate Full Permissions (All true)
export function getFullPermissions(): UserPermissions {
  const sections: SectionPermissionKey[] = [
    'dashboard', 'students', 'schedule', 'attendance', 'tracking', 'violations', 'reports', 'animators', 'settings'
  ];
  const actions: ActionPermissionKey[] = ['view', 'add', 'edit', 'delete', 'export', 'print'];

  const permissions: Partial<UserPermissions> = {};
  sections.forEach(section => {
    permissions[section] = {
      view: true,
      add: true,
      edit: true,
      delete: true,
      export: true,
      print: true,
    };
  });

  return permissions as UserPermissions;
}

// Generate Default Restricted Permissions for regular admin user
export function getDefaultAdminPermissions(): UserPermissions {
  const sections: SectionPermissionKey[] = [
    'dashboard', 'students', 'schedule', 'attendance', 'tracking', 'violations', 'reports', 'animators', 'settings'
  ];

  const permissions: Partial<UserPermissions> = {};
  sections.forEach(section => {
    if (section === 'settings') {
      permissions[section] = { view: true, add: false, edit: false, delete: false, export: false, print: false };
    } else {
      permissions[section] = { view: true, add: true, edit: true, delete: false, export: true, print: true };
    }
  });

  return permissions as UserPermissions;
}

// Hash password with SHA-256 + Salt
export async function hashPassword(password: string, customSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = customSalt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, salt };
}

// Verify password
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

// Sync fallback hash generator for static default users
export function syncHashSimple(password: string, salt: string): string {
  let hash = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'sh_' + Math.abs(hash).toString(16) + '_e2szirara';
}

// Default Super Admin account
export const DEFAULT_SUPER_ADMIN: AdminUser = {
  id: 'usr_super_admin',
  userNumber: 'USR-001',
  fullName: 'مدير المركز الإداري',
  username: 'admin',
  passwordHash: 'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd4', // Hash for "admin123"
  salt: 'e2s_zirara_salt_2026',
  role: 'super_admin',
  title: 'مدير مدرسة الفرصة الثانية',
  phone: '0661234567',
  status: 'نشط',
  mustChangePasswordOnFirstLogin: false,
  permissions: getFullPermissions(),
  createdAt: '2025-09-01',
  lastLoginAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
  notes: 'الحساب الرئيسي لمنظومة الإدارة والمراقبة بالمركز',
};

// LocalStorage Admin Users Getters/Setters
export function getStoredAdminUsers(): AdminUser[] {
  try {
    const data = localStorage.getItem(ADMIN_USERS_KEY);
    if (!data) {
      const initial = [DEFAULT_SUPER_ADMIN];
      localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed: AdminUser[] = JSON.parse(data);
    if (parsed.length === 0) {
      localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify([DEFAULT_SUPER_ADMIN]));
      return [DEFAULT_SUPER_ADMIN];
    }
    return parsed;
  } catch {
    return [DEFAULT_SUPER_ADMIN];
  }
}

export function saveStoredAdminUsers(users: AdminUser[]): void {
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
}

// Generate Next User Number (USR-001, USR-002...)
export function generateNextUserNumber(existingUsers: AdminUser[]): string {
  let maxNum = 0;
  existingUsers.forEach(u => {
    if (u.userNumber) {
      const match = u.userNumber.match(/USR-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  });
  return `USR-${String(maxNum + 1).padStart(3, '0')}`;
}

// Current Active Session
export function getStoredCurrentSession(): AdminUser | null {
  try {
    const data = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (!data) return DEFAULT_SUPER_ADMIN; // Default auto session on initial load
    return JSON.parse(data);
  } catch {
    return DEFAULT_SUPER_ADMIN;
  }
}

export function saveStoredCurrentSession(user: AdminUser | null): void {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_SESSION_KEY);
  } else {
    localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(user));
  }
}

// Audit Logs
export function getStoredAuditLogs(): AdminAuditLog[] {
  try {
    const data = localStorage.getItem(ADMIN_AUDIT_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStoredAuditLogs(logs: AdminAuditLog[]): void {
  localStorage.setItem(ADMIN_AUDIT_LOGS_KEY, JSON.stringify(logs));
}

export function recordAuditLog(actor: { username: string; fullName: string }, action: string, targetUsername?: string, details?: string): void {
  const logs = getStoredAuditLogs();
  const now = new Date();
  const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

  const newLog: AdminAuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp,
    actorUsername: actor.username,
    actorName: actor.fullName,
    action,
    targetUsername,
    details,
  };

  const updated = [newLog, ...logs].slice(0, 200); // keep last 200 logs
  saveStoredAuditLogs(updated);
}

// Failed Attempts & Lockout Tracker
export function getFailedAttempts(username: string): { count: number; lockedUntil?: number } {
  try {
    const data = localStorage.getItem(FAILED_LOGIN_ATTEMPTS_KEY);
    const map: Record<string, { count: number; lockedUntil?: number }> = data ? JSON.parse(data) : {};
    return map[username.toLowerCase()] || { count: 0 };
  } catch {
    return { count: 0 };
  }
}

export function recordFailedAttempt(username: string): { count: number; isLocked: boolean; remainingSeconds?: number } {
  try {
    const data = localStorage.getItem(FAILED_LOGIN_ATTEMPTS_KEY);
    const map: Record<string, { count: number; lockedUntil?: number }> = data ? JSON.parse(data) : {};
    const key = username.toLowerCase();
    const current = map[key] || { count: 0 };

    const newCount = current.count + 1;
    let lockedUntil: number | undefined = undefined;

    if (newCount >= 5) {
      // Lock for 5 minutes (300 seconds)
      lockedUntil = Date.now() + 5 * 60 * 1000;
    }

    map[key] = { count: newCount, lockedUntil };
    localStorage.setItem(FAILED_LOGIN_ATTEMPTS_KEY, JSON.stringify(map));

    return {
      count: newCount,
      isLocked: newCount >= 5,
      remainingSeconds: lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : undefined,
    };
  } catch {
    return { count: 1, isLocked: false };
  }
}

export function clearFailedAttempts(username: string): void {
  try {
    const data = localStorage.getItem(FAILED_LOGIN_ATTEMPTS_KEY);
    if (!data) return;
    const map: Record<string, { count: number; lockedUntil?: number }> = JSON.parse(data);
    delete map[username.toLowerCase()];
    localStorage.setItem(FAILED_LOGIN_ATTEMPTS_KEY, JSON.stringify(map));
  } catch {}
}

// Permission Checking Guard Function
export function checkPermission(
  user: AdminUser | null, 
  section: SectionPermissionKey, 
  action: ActionPermissionKey = 'view'
): boolean {
  if (!user) return false;
  if (user.status === 'غير نشط') return false;
  if (user.role === 'super_admin') return true;

  return !!user.permissions?.[section]?.[action];
}
