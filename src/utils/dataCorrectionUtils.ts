import { Learner, AttendanceRecord, Violation, ExitPaper, InfirmaryVisit, ScheduledSession, Animator } from '../types';
import { SAMPLE_LEARNERS, SAMPLE_ANIMATORS } from './initialData';

export interface DataIssue {
  id: string;
  type: 
    | 'duplicate_attendance'
    | 'duplicate_masar' 
    | 'duplicate_reg' 
    | 'orphaned_attendance' 
    | 'orphaned_violation' 
    | 'orphaned_exit' 
    | 'orphaned_infirmary' 
    | 'orphaned_schedule_animator'
    | 'duplicate_animator_reg'
    | 'demo_test_data';
  severity: 'low' | 'medium' | 'high';
  message: string;
  itemIds: string[];
  suggestedAction: string;
  canAutoFix: boolean;
}

const SAMPLE_LEARNER_IDS = new Set(SAMPLE_LEARNERS.map(l => l.id));
const SAMPLE_ANIMATOR_IDS = new Set(SAMPLE_ANIMATORS.map(a => a.id));

export const identifyDemoTestData = (
  learners: Learner[],
  animators: Animator[]
) => {
  const demoLearners = learners.filter(l => 
    SAMPLE_LEARNER_IDS.has(l.id) || 
    (l.registrationNumber && /^ZR-00[0-1]\d$/.test(l.registrationNumber))
  );

  const demoAnimators = animators.filter(a => 
    SAMPLE_ANIMATOR_IDS.has(a.id) || 
    (a.registrationNumber && /^ANM-00[1-5]$/.test(a.registrationNumber))
  );

  return {
    demoLearnerIds: new Set(demoLearners.map(l => l.id)),
    demoAnimatorIds: new Set(demoAnimators.map(a => a.id)),
    demoLearners,
    demoAnimators,
  };
};

export const auditDataIntegrity = (
  learners: Learner[],
  attendance: AttendanceRecord[],
  violations: Violation[],
  exitPapers: ExitPaper[],
  infirmaryVisits: InfirmaryVisit[],
  schedule: ScheduledSession[] = [],
  animators: Animator[] = []
): DataIssue[] => {
  const issues: DataIssue[] = [];
  const learnerIds = new Set(learners.map(l => l.id));
  const masarMap: Record<string, string[]> = {};
  const regMap: Record<string, string[]> = {};

  const { demoLearnerIds, demoAnimatorIds, demoLearners } = identifyDemoTestData(learners, animators);

  if (demoLearners.length > 0) {
    issues.push({
      id: 'demo_test_data_present',
      type: 'demo_test_data',
      severity: 'low',
      message: `تم رصد ${demoLearners.length} متعلم تجريبي و ${animators.filter(a => demoAnimatorIds.has(a.id)).length} منشط تجريبي في النظام.`,
      itemIds: demoLearners.map(l => l.id),
      suggestedAction: 'يمكنك استخدام خيار "حذف البيانات التجريبية" لحذفها مع الاحتفاظ بالبيانات الحقيقية للمركز.',
      canAutoFix: true
    });
  }

  // 1. Check for duplicate registration and masar in learners
  learners.forEach(l => {
    if (l.masarCode && l.masarCode.trim()) {
      const masar = l.masarCode.toUpperCase().trim();
      if (!masarMap[masar]) masarMap[masar] = [];
      masarMap[masar].push(l.id);
    }
    const reg = (l.registrationNumber || '').toUpperCase().trim();
    if (reg) {
      if (!regMap[reg]) regMap[reg] = [];
      regMap[reg].push(l.id);
    }
  });

  Object.entries(masarMap).forEach(([masar, ids]) => {
    if (ids.length > 1) {
      issues.push({
        id: `dup_masar_${masar}`,
        type: 'duplicate_masar',
        severity: 'medium',
        message: `تم العثور على نفس رقم مسار (${masar}) مكرر لـ ${ids.length} متعلمين.`,
        itemIds: ids,
        suggestedAction: 'تعديل أو دمج أرقام مسار المكررة.',
        canAutoFix: true
      });
    }
  });

  Object.entries(regMap).forEach(([reg, ids]) => {
    if (ids.length > 1) {
      issues.push({
        id: `dup_reg_${reg}`,
        type: 'duplicate_reg',
        severity: 'high',
        message: `تم العثور على نفس رقم التسجيل (${reg}) مكرر لـ ${ids.length} متعلمين.`,
        itemIds: ids,
        suggestedAction: 'إعادة ترقيم أرقام التسجيل لضمان فرادتها تلقائياً.',
        canAutoFix: true
      });
    }
  });

  // 2. Check for duplicate attendance records (same learnerId + date + session)
  const attendanceKeyMap: Record<string, string[]> = {};
  attendance.forEach(a => {
    const key = `${a.learnerId}_${a.date}_${a.session}`;
    if (!attendanceKeyMap[key]) attendanceKeyMap[key] = [];
    attendanceKeyMap[key].push(a.id);
  });

  const duplicateAttendanceIds: string[] = [];
  Object.values(attendanceKeyMap).forEach(ids => {
    if (ids.length > 1) {
      duplicateAttendanceIds.push(...ids.slice(0, ids.length - 1));
    }
  });

  if (duplicateAttendanceIds.length > 0) {
    issues.push({
      id: 'duplicate_attendance',
      type: 'duplicate_attendance',
      severity: 'high',
      message: `تم العثور على ${duplicateAttendanceIds.length} سجل حضور مكرر لنفس المتعلم في نفس الحصة والتاريخ.`,
      itemIds: duplicateAttendanceIds,
      suggestedAction: 'حذف التكرارات والاحتفاظ بآخر تسجيل معتمد.',
      canAutoFix: true
    });
  }

  // 3. Check for orphaned records
  const orphanedAttendance = attendance.filter(a => !learnerIds.has(a.learnerId));
  if (orphanedAttendance.length > 0) {
    issues.push({
      id: 'orphaned_attendance',
      type: 'orphaned_attendance',
      severity: 'high',
      message: `تم العثور على ${orphanedAttendance.length} سجل حضور لمتعلمين غير مسجلين في القاعدة.`,
      itemIds: orphanedAttendance.map(a => a.id),
      suggestedAction: 'حذف سجلات الحضور اليتيمة لتنظيف القاعدة.',
      canAutoFix: true
    });
  }

  const orphanedViolations = violations.filter(v => !learnerIds.has(v.learnerId));
  if (orphanedViolations.length > 0) {
    issues.push({
      id: 'orphaned_violation',
      type: 'orphaned_violation',
      severity: 'medium',
      message: `تم العثور على ${orphanedViolations.length} مخالفة مسجلة لمتعلمين غير موجودين.`,
      itemIds: orphanedViolations.map(v => v.id),
      suggestedAction: 'حذف المخالفات اليتيمة.',
      canAutoFix: true
    });
  }

  const orphanedExits = exitPapers.filter(e => !learnerIds.has(e.learnerId));
  if (orphanedExits.length > 0) {
    issues.push({
      id: 'orphaned_exit',
      type: 'orphaned_exit',
      severity: 'low',
      message: `تم العثور على ${orphanedExits.length} ورقة خروج لمتعلمين غير موجودين.`,
      itemIds: orphanedExits.map(e => e.id),
      suggestedAction: 'تنظيف سجل أوراق الخروج.',
      canAutoFix: true
    });
  }

  const orphanedInfirmary = infirmaryVisits.filter(i => !learnerIds.has(i.learnerId));
  if (orphanedInfirmary.length > 0) {
    issues.push({
      id: 'orphaned_infirmary',
      type: 'orphaned_infirmary',
      severity: 'low',
      message: `تم العثور على ${orphanedInfirmary.length} زيارة مستوصف لمتعلمين غير موجودين.`,
      itemIds: orphanedInfirmary.map(i => i.id),
      suggestedAction: 'تنظيف سجل زيارات المستوصف.',
      canAutoFix: true
    });
  }

  // 4. Check for schedule sessions referencing deleted animators
  if (animators.length > 0 && schedule.length > 0) {
    const animatorIds = new Set(animators.map(a => a.id));
    const orphanedSessions = schedule.filter(s => s.animatorId && !animatorIds.has(s.animatorId));
    if (orphanedSessions.length > 0) {
      issues.push({
        id: 'orphaned_schedule_animator',
        type: 'orphaned_schedule_animator',
        severity: 'medium',
        message: `تم العثور على ${orphanedSessions.length} حصة في التخطيط الأسبوعي مسندة لمنشط تم حذفه.`,
        itemIds: orphanedSessions.map(s => s.id),
        suggestedAction: 'فك ارتباط المنشط المحذوف من هذه الحصص.',
        canAutoFix: true
      });
    }
  }

  return issues;
};

// --- Atomic Fix Functions ---

export const removeDemoTestDataClean = (
  learners: Learner[],
  animators: Animator[],
  attendance: AttendanceRecord[],
  violations: Violation[],
  exitPapers: ExitPaper[],
  infirmaryVisits: InfirmaryVisit[],
  schedule: ScheduledSession[]
) => {
  const { demoLearnerIds, demoAnimatorIds } = identifyDemoTestData(learners, animators);

  const realLearners = learners.filter(l => !demoLearnerIds.has(l.id));
  const realAnimators = animators.filter(a => !demoAnimatorIds.has(a.id));
  const realAttendance = attendance.filter(a => !demoLearnerIds.has(a.learnerId));
  const realViolations = violations.filter(v => !demoLearnerIds.has(v.learnerId));
  const realExits = exitPapers.filter(e => !demoLearnerIds.has(e.learnerId));
  const realInfirmary = infirmaryVisits.filter(i => !demoLearnerIds.has(i.learnerId));
  
  // For schedule, remove animator reference if animator was demo
  const cleanSchedule = schedule.map(s => {
    if (s.animatorId && demoAnimatorIds.has(s.animatorId)) {
      return { ...s, animatorId: undefined, animatorName: undefined };
    }
    return s;
  });

  return {
    learners: realLearners,
    animators: realAnimators,
    attendance: realAttendance,
    violations: realViolations,
    exitPapers: realExits,
    infirmaryVisits: realInfirmary,
    schedule: cleanSchedule,
    removedCounts: {
      learners: demoLearnerIds.size,
      animators: demoAnimatorIds.size,
    }
  };
};

export const fixDuplicateAttendance = (attendance: AttendanceRecord[]): AttendanceRecord[] => {
  const seen = new Set<string>();
  const reversed = [...attendance].reverse();
  const uniqueReversed: AttendanceRecord[] = [];

  for (const record of reversed) {
    const key = `${record.learnerId}_${record.date}_${record.session}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueReversed.push(record);
    }
  }

  return uniqueReversed.reverse();
};

export const fixOrphanedAttendance = (attendance: AttendanceRecord[], learnerIds: Set<string>): AttendanceRecord[] => {
  return attendance.filter(a => learnerIds.has(a.learnerId));
};

export const fixOrphanedViolations = (violations: Violation[], learnerIds: Set<string>): Violation[] => {
  return violations.filter(v => learnerIds.has(v.learnerId));
};

export const fixOrphanedExits = (exits: ExitPaper[], learnerIds: Set<string>): ExitPaper[] => {
  return exits.filter(e => learnerIds.has(e.learnerId));
};

export const fixOrphanedInfirmary = (visits: InfirmaryVisit[], learnerIds: Set<string>): InfirmaryVisit[] => {
  return visits.filter(i => learnerIds.has(i.learnerId));
};

export const fixDuplicateLearners = (learners: Learner[]): Learner[] => {
  const seenReg = new Set<string>();
  let nextCounter = 1;

  return learners.map((l) => {
    let reg = (l.registrationNumber || '').trim();
    if (!reg || seenReg.has(reg.toUpperCase())) {
      while (seenReg.has(`ZR-${String(nextCounter).padStart(4, '0')}`)) {
        nextCounter++;
      }
      reg = `ZR-${String(nextCounter).padStart(4, '0')}`;
      nextCounter++;
    }
    seenReg.add(reg.toUpperCase());
    return { ...l, registrationNumber: reg };
  });
};

export const fixOrphanedSchedule = (schedule: ScheduledSession[], animators: Animator[]): ScheduledSession[] => {
  const validIds = new Set(animators.map(a => a.id));
  return schedule.map(session => {
    if (session.animatorId && !validIds.has(session.animatorId)) {
      return { ...session, animatorId: undefined, animatorName: undefined };
    }
    return session;
  });
};

export const fixDuplicateAnimators = (animators: Animator[]): Animator[] => {
  const seenReg = new Set<string>();
  let counter = 1;

  return animators.map(a => {
    let reg = (a.registrationNumber || '').trim();
    if (!reg || seenReg.has(reg.toUpperCase())) {
      while (seenReg.has(`ANM-${String(counter).padStart(3, '0')}`)) {
        counter++;
      }
      reg = `ANM-${String(counter).padStart(3, '0')}`;
      counter++;
    }
    seenReg.add(reg.toUpperCase());
    return { ...a, registrationNumber: reg };
  });
};
