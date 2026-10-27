export type LearnerStatus = 'نشط' | 'منقطع' | 'مغادر';
export type Gender = 'ذكر' | 'أنثى';
export type AttendanceStatus = 'حاضر' | 'غائب' | 'متأخر' | 'غياب مبرر';
export type SessionTime = '09:00–13:00' | '09:00–11:00' | '11:00–13:00' | '14:00–16:00' | string;
export type SessionType = 'التأهيل التربوي' | 'التأهيل المهني';

export type PersonalProjectPath = 'الإدماج المدرسي' | 'التكوين المهني' | 'سوق الشغل' | 'غير محدد';

export interface Learner {
  id: string;
  registrationNumber: string; // e.g. "ZR-0001"
  arabicName: string;
  frenchName: string;
  masarCode: string;
  gender: Gender;
  className: string;
  stream: string;
  previousLevel: string;
  parentPhone: string;
  whatsapp: string;
  address: string;
  status: LearnerStatus;
  createdAt: string;
  birthDate?: string;
  birthPlace?: string;
  notes?: string;
  personalProject?: PersonalProjectPath;
}

export interface AttendanceRecord {
  id: string;
  learnerId: string;
  date: string; // YYYY-MM-DD
  session: SessionTime;
  status: AttendanceStatus;
  reason?: string;
  entrySlipWhatsappSent?: boolean;
  entrySlipSentDate?: string;
  animatorWhatsappSent?: boolean;
  animatorSentDate?: string;
  returnDate?: string;
  updatedAt: string;
}

export type AnimatorStatus = 'نشط' | 'غير نشط' | 'متوقف عن العمل';

export interface Animator {
  id: string;
  registrationNumber: string; // e.g. "ANM-001"
  arabicName: string;
  frenchName?: string;
  phone: string;
  email?: string;
  specialty: string; // مجال التكوين أو التخصص
  activityType: SessionType; // 'التأهيل التربوي' | 'التأهيل المهني'
  assignedClasses: string[];
  assignedStreams: string[];
  startDate: string; // YYYY-MM-DD
  status: AnimatorStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduledSession {
  id: string;
  dayOfWeek: 'الاثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس' | 'الجمعة' | string;
  timeSlot: SessionTime;
  sessionType: SessionType;
  subject: string; // المادة أو النشاط
  animator: string; // المنشط / المؤطر
  animatorId?: string; // معرف المنشط المرتبط
  classes: string[]; // الأقسام المرتبطة
  streams: string[]; // الشعب المرتبطة
  isRecurring: boolean;
  specificDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: 'مدرسية' | 'وطنية' | 'دينية';
}

export type ViolationStatus = 'جديدة' | 'قيد المعالجة' | 'تمت المعالجة' | 'أُغلقت';

export interface ViolationActionLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string;
  notes?: string;
  recordedBy?: string;
}

export interface Violation {
  id: string;
  violationNumber: string; // e.g. "MKH-2026-0001"
  learnerId: string;
  learnerName: string;
  registrationNumber: string;
  className: string;
  stream: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: string;
  description: string;
  location?: string;
  actionTaken: string;
  status: ViolationStatus;
  recordedBy?: string;
  notes?: string;
  actionDate?: string; // تاريخ اتخاذ الإجراء
  lastFollowUpDate?: string; // تاريخ آخر متابعة
  actionHistory?: ViolationActionLog[];
  createdAt: string;
  updatedAt?: string;
}

export type CommitmentStatus = 'محرر' | 'قيد المتابعة' | 'تمت المتابعة' | 'مغلق';

export interface CommitmentRecord {
  id: string;
  commitmentNumber: string; // e.g. "ILTZ-2026-0001"
  learnerId: string;
  learnerName: string;
  registrationNumber: string;
  className: string;
  stream: string;
  date: string; // YYYY-MM-DD تاريخ تحرير الالتزام
  violationId?: string; // رقم المخالفة المرتبطة إن وجد
  violationNumber?: string;
  text: string; // نص الالتزام القابل للتعديل
  notes?: string; // ملاحظات المتابعة
  status: CommitmentStatus;
  guardianName?: string;
  guardianPhone?: string;
  guardianCin?: string;
  guardianRelation?: string;
  masarCode?: string;
  recordedBy?: string;
  exportDate?: string;
  lastFollowUpDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  schoolName: string;
  schoolNameFull: string;
  schoolYear: string;
  alertThreshold: number; // threshold for unexcused absences
  classes: string[];
  streams: string[];
  sessions: SessionTime[];
  violationTypes?: string[];
  schoolLogoDataURL: string | null;
  ministryLogoDataURL: string | null;
  associationLogoDataURL: string | null;
}

export interface BackupData {
  version: string;
  exportDate: string;
  settings: AppSettings;
  learners: Learner[];
  attendance: AttendanceRecord[];
  schedule?: ScheduledSession[];
  holidays?: Holiday[];
  violations?: Violation[];
  commitments?: CommitmentRecord[];
  exitPapers?: ExitPaper[];
  infirmaryVisits?: InfirmaryVisit[];
  animators?: Animator[];
}

export interface ExitPaper {
  id: string;
  exitNumber: string; // Unique generated number
  learnerId: string;
  learnerName: string;
  registrationNumber: string;
  className: string;
  stream: string;
  date: string; // YYYY-MM-DD
  timeOut: string; // HH:mm
  timeInActual?: string; // HH:mm
  timeInExpected?: string; // HH:mm
  reason: string;
  type: 'مؤقت' | 'لبقية اليوم';
  destination?: string;
  companion?: string;
  durationMinutes?: number;
  status: 'غادر' | 'عاد إلى المركز' | 'ملغاة';
  administrativeApproval: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface InfirmaryVisit {
  id: string;
  visitNumber: string; // Unique generated number
  learnerId: string;
  learnerName: string;
  registrationNumber: string;
  className: string;
  stream: string;
  date: string; // YYYY-MM-DD
  timeOut: string; // HH:mm
  timeInActual?: string; // HH:mm
  complaint: string; // الشكاية
  treatment?: string; // العلاج المقدم
  companion?: string;
  institution?: string; // المستوصف أو المؤسسة الصحية
  status: 'في انتظار المغادرة' | 'غادر المركز' | 'الزيارة جارية' | 'انتهت الزيارة' | 'عاد إلى المركز' | 'لم تكتمل الزيارة' | 'ملغاة';
  notes?: string;
  exitPaperId?: string; // Linked exit paper if any
  createdAt: string;
}

export type TabType = 'dashboard' | 'students' | 'animators' | 'schedule' | 'attendance' | 'tracking' | 'violations' | 'reports' | 'backup' | 'data_correction' | 'settings';

