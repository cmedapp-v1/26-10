import { Learner, AttendanceRecord, AppSettings, ScheduledSession, Holiday, BackupData, Violation, CommitmentRecord, ExitPaper, InfirmaryVisit, Animator } from '../types';
import { DEFAULT_SETTINGS, SAMPLE_LEARNERS, generateSampleAttendanceRecords, SAMPLE_SCHEDULE, SAMPLE_HOLIDAYS, SAMPLE_VIOLATIONS, SAMPLE_COMMITMENTS, SAMPLE_ANIMATORS } from './initialData';

const SETTINGS_KEY = 'e2s_zirara_settings';
const LEARNERS_KEY = 'e2s_zirara_learners';
const ATTENDANCE_KEY = 'e2s_zirara_attendance';
const SCHEDULE_KEY = 'e2s_zirara_schedule';
const HOLIDAYS_KEY = 'e2s_zirara_holidays';
const VIOLATIONS_KEY = 'e2s_zirara_violations';
const COMMITMENTS_KEY = 'e2s_zirara_commitments';
const EXIT_PAPERS_KEY = 'e2s_zirara_exit_papers';
const INFIRMARY_VISITS_KEY = 'e2s_zirara_infirmary_visits';
const ANIMATORS_KEY = 'e2s_zirara_animators';

// ... existing getters ...

export const getStoredExitPapers = (): ExitPaper[] => {
  try {
    const data = localStorage.getItem(EXIT_PAPERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStoredExitPapers = (papers: ExitPaper[]): void => {
  localStorage.setItem(EXIT_PAPERS_KEY, JSON.stringify(papers));
};

export const getStoredInfirmaryVisits = (): InfirmaryVisit[] => {
  try {
    const data = localStorage.getItem(INFIRMARY_VISITS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStoredInfirmaryVisits = (visits: InfirmaryVisit[]): void => {
  localStorage.setItem(INFIRMARY_VISITS_KEY, JSON.stringify(visits));
};

export const getStoredAnimators = (): Animator[] => {
  try {
    const data = localStorage.getItem(ANIMATORS_KEY);
    if (!data) {
      const initial = SAMPLE_ANIMATORS;
      localStorage.setItem(ANIMATORS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch {
    return SAMPLE_ANIMATORS;
  }
};

export const saveStoredAnimators = (animators: Animator[]): void => {
  localStorage.setItem(ANIMATORS_KEY, JSON.stringify(animators));
};

export const generateNextAnimatorNumber = (existingAnimators: Animator[]): string => {
  let maxNum = 0;
  existingAnimators.forEach((a) => {
    if (a.registrationNumber) {
      const match = a.registrationNumber.match(/ANM-(\d+)/i);
      if (match) {
        const numPart = parseInt(match[1], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  });
  const nextNum = maxNum + 1;
  return `ANM-${nextNum.toString().padStart(3, '0')}`;
};

// ... existing exportFullBackup and restoreFullBackup ...

export const getStoredSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveStoredSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getStoredLearners = (): Learner[] => {
  try {
    const data = localStorage.getItem(LEARNERS_KEY);
    if (!data) {
      const initial = SAMPLE_LEARNERS;
      localStorage.setItem(LEARNERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch {
    return SAMPLE_LEARNERS;
  }
};

export const saveStoredLearners = (learners: Learner[]): void => {
  localStorage.setItem(LEARNERS_KEY, JSON.stringify(learners));
};

export const getStoredAttendance = (): AttendanceRecord[] => {
  try {
    const data = localStorage.getItem(ATTENDANCE_KEY);
    if (!data) {
      const initialLearners = getStoredLearners();
      const initialAttendance = generateSampleAttendanceRecords(initialLearners);
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(initialAttendance));
      return initialAttendance;
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveStoredAttendance = (records: AttendanceRecord[]): void => {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
};

export const getStoredSchedule = (): ScheduledSession[] => {
  try {
    const data = localStorage.getItem(SCHEDULE_KEY);
    if (!data) {
      const initial = SAMPLE_SCHEDULE;
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch {
    return SAMPLE_SCHEDULE;
  }
};

export const saveStoredSchedule = (schedule: ScheduledSession[]): void => {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
};

export const getStoredHolidays = (): Holiday[] => {
  try {
    const data = localStorage.getItem(HOLIDAYS_KEY);
    if (!data) {
      const initial = SAMPLE_HOLIDAYS;
      localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch {
    return SAMPLE_HOLIDAYS;
  }
};

export const saveStoredHolidays = (holidays: Holiday[]): void => {
  localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
};

export const getStoredViolations = (): Violation[] => {
  try {
    const data = localStorage.getItem(VIOLATIONS_KEY);
    if (!data) {
      const initial = SAMPLE_VIOLATIONS;
      localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch {
    return SAMPLE_VIOLATIONS;
  }
};

export const saveStoredViolations = (violations: Violation[]): void => {
  localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(violations));
};

export const getStoredCommitments = (): CommitmentRecord[] => {
  try {
    const data = localStorage.getItem(COMMITMENTS_KEY);
    if (!data) {
      const initial = SAMPLE_COMMITMENTS;
      localStorage.setItem(COMMITMENTS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch {
    return SAMPLE_COMMITMENTS;
  }
};

export const saveStoredCommitments = (commitments: CommitmentRecord[]): void => {
  localStorage.setItem(COMMITMENTS_KEY, JSON.stringify(commitments));
};

export const generateNextRegistrationNumber = (learners: Learner[]): string => {
  let maxNum = 0;
  learners.forEach((l) => {
    if (l.registrationNumber && l.registrationNumber.startsWith('ZR-')) {
      const numPart = parseInt(l.registrationNumber.replace('ZR-', ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `ZR-${nextNum.toString().padStart(4, '0')}`;
};

export const generateNextViolationNumber = (violations: Violation[], year?: string): string => {
  const currentYear = year || new Date().getFullYear().toString();
  let maxNum = 0;
  violations.forEach((v) => {
    if (v.violationNumber) {
      // Matches formats like "MKH-2026-0001" or "MKH-0001"
      const match = v.violationNumber.match(/MKH-(?:(\d{4})-)?(\d+)/);
      if (match) {
        const numPart = parseInt(match[2], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  });
  const nextNum = maxNum + 1;
  return `MKH-${currentYear}-${nextNum.toString().padStart(4, '0')}`;
};

export const generateNextCommitmentNumber = (commitments: CommitmentRecord[], year?: string): string => {
  const currentYear = year || new Date().getFullYear().toString();
  let maxNum = 0;
  commitments.forEach((c) => {
    if (c.commitmentNumber) {
      // Matches formats like "ILTZ-2026-0001" or "ILTZ-0001"
      const match = c.commitmentNumber.match(/ILTZ-(?:(\d{4})-)?(\d+)/);
      if (match) {
        const numPart = parseInt(match[2], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  });
  const nextNum = maxNum + 1;
  return `ILTZ-${currentYear}-${nextNum.toString().padStart(4, '0')}`;
};

export const generateNextExitPaperNumber = (papers: ExitPaper[], year?: string): string => {
  const currentYear = year || new Date().getFullYear().toString();
  let maxNum = 0;
  papers.forEach((p) => {
    if (p.exitNumber) {
      const match = p.exitNumber.match(/EXT-(?:(\d{4})-)?(\d+)/);
      if (match) {
        const numPart = parseInt(match[2], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  });
  const nextNum = maxNum + 1;
  return `EXT-${currentYear}-${nextNum.toString().padStart(4, '0')}`;
};

export const generateNextInfirmaryVisitNumber = (visits: InfirmaryVisit[], year?: string): string => {
  const currentYear = year || new Date().getFullYear().toString();
  let maxNum = 0;
  visits.forEach((v) => {
    if (v.visitNumber) {
      const match = v.visitNumber.match(/INF-(?:(\d{4})-)?(\d+)/);
      if (match) {
        const numPart = parseInt(match[2], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  });
  const nextNum = maxNum + 1;
  return `INF-${currentYear}-${nextNum.toString().padStart(4, '0')}`;
};

export const exportFullBackup = (data?: BackupData): void => {
  const backupData: BackupData = data || {
    version: '1.6',
    exportDate: new Date().toISOString(),
    settings: getStoredSettings(),
    learners: getStoredLearners(),
    attendance: getStoredAttendance(),
    schedule: getStoredSchedule(),
    holidays: getStoredHolidays(),
    violations: getStoredViolations(),
    commitments: getStoredCommitments(),
    exitPapers: getStoredExitPapers(),
    infirmaryVisits: getStoredInfirmaryVisits(),
    animators: getStoredAnimators(),
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const filename = `Sauvegarde_Zirara_${dateStr}_${timeStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const restoreFullBackup = (
  jsonContent: string
): { 
  success: boolean; 
  message: string; 
  data?: { 
    settings: AppSettings; 
    learners: Learner[]; 
    attendance: AttendanceRecord[]; 
    schedule: ScheduledSession[]; 
    holidays: Holiday[];
    violations: Violation[];
    commitments: CommitmentRecord[];
    exitPapers: ExitPaper[];
    infirmaryVisits: InfirmaryVisit[];
    animators: Animator[];
  } 
} => {
  try {
    const parsed = JSON.parse(jsonContent) as BackupData;

    if (!parsed.learners || !Array.isArray(parsed.learners)) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير صالح: قائمة المتعلمين مفقودة' };
    }

    const settings = parsed.settings || DEFAULT_SETTINGS;
    const learners = parsed.learners || [];
    const attendance = parsed.attendance || [];
    const schedule = parsed.schedule || SAMPLE_SCHEDULE;
    const holidays = parsed.holidays || SAMPLE_HOLIDAYS;
    const violations = parsed.violations || SAMPLE_VIOLATIONS;
    const commitments = parsed.commitments || SAMPLE_COMMITMENTS;
    const exitPapers = parsed.exitPapers || [];
    const infirmaryVisits = parsed.infirmaryVisits || [];
    const animators = parsed.animators || SAMPLE_ANIMATORS;

    saveStoredSettings(settings);
    saveStoredLearners(learners);
    saveStoredAttendance(attendance);
    saveStoredSchedule(schedule);
    saveStoredHolidays(holidays);
    saveStoredViolations(violations);
    saveStoredCommitments(commitments);
    saveStoredExitPapers(exitPapers);
    saveStoredInfirmaryVisits(infirmaryVisits);
    saveStoredAnimators(animators);

    return {
      success: true,
      message: 'تمت استعادة البيانات بنجاح!',
      data: { settings, learners, attendance, schedule, holidays, violations, commitments, exitPapers, infirmaryVisits, animators },
    };
  } catch {
    return {
      success: false,
      message: 'تعذر قراءة ملف JSON: يرجى التأكد من التنسيق الصحيح للملف',
    };
  }
};

export const resetToDemoData = (): { 
  settings: AppSettings; 
  learners: Learner[]; 
  attendance: AttendanceRecord[];
  schedule: ScheduledSession[];
  holidays: Holiday[];
  violations: Violation[];
  commitments: CommitmentRecord[];
  exitPapers: ExitPaper[];
  infirmaryVisits: InfirmaryVisit[];
  animators: Animator[];
} => {
  const settings = DEFAULT_SETTINGS;
  const learners = SAMPLE_LEARNERS;
  const attendance = generateSampleAttendanceRecords(learners);
  const schedule = SAMPLE_SCHEDULE;
  const holidays = SAMPLE_HOLIDAYS;
  const violations = SAMPLE_VIOLATIONS;
  const commitments = SAMPLE_COMMITMENTS;
  const exitPapers: ExitPaper[] = [];
  const infirmaryVisits: InfirmaryVisit[] = [];
  const animators = SAMPLE_ANIMATORS;

  saveStoredSettings(settings);
  saveStoredLearners(learners);
  saveStoredAttendance(attendance);
  saveStoredSchedule(schedule);
  saveStoredHolidays(holidays);
  saveStoredViolations(violations);
  saveStoredCommitments(commitments);
  saveStoredExitPapers(exitPapers);
  saveStoredInfirmaryVisits(infirmaryVisits);
  saveStoredAnimators(animators);

  return { settings, learners, attendance, schedule, holidays, violations, commitments, exitPapers, infirmaryVisits, animators };
};

