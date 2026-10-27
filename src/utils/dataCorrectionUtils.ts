import { Learner, AttendanceRecord, Violation, ExitPaper, InfirmaryVisit } from '../types';

export interface DataIssue {
  id: string;
  type: 'duplicate_masar' | 'duplicate_reg' | 'orphaned_attendance' | 'orphaned_violation' | 'orphaned_exit' | 'orphaned_infirmary' | 'inactive_learner_with_attendance';
  severity: 'low' | 'medium' | 'high';
  message: string;
  itemIds: string[];
  suggestedAction: string;
}

export const auditDataIntegrity = (
  learners: Learner[],
  attendance: AttendanceRecord[],
  violations: Violation[],
  exitPapers: ExitPaper[],
  infirmaryVisits: InfirmaryVisit[]
): DataIssue[] => {
  const issues: DataIssue[] = [];
  const learnerIds = new Set(learners.map(l => l.id));
  const masarMap: Record<string, string[]> = {};
  const regMap: Record<string, string[]> = {};

  // Check for duplicates in learners
  learners.forEach(l => {
    if (l.masarCode) {
      const masar = l.masarCode.toUpperCase().trim();
      if (!masarMap[masar]) masarMap[masar] = [];
      masarMap[masar].push(l.id);
    }
    const reg = l.registrationNumber.toUpperCase().trim();
    if (!regMap[reg]) regMap[reg] = [];
    regMap[reg].push(l.id);
  });

  Object.entries(masarMap).forEach(([masar, ids]) => {
    if (ids.length > 1) {
      issues.push({
        id: `dup_masar_${masar}`,
        type: 'duplicate_masar',
        severity: 'medium',
        message: `تم العثور على نفس رقم مسار (${masar}) مكرر لـ ${ids.length} متعلمين.`,
        itemIds: ids,
        suggestedAction: 'دمج المتعلمين أو تصحيح رقم مسار.'
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
        suggestedAction: 'تعديل أرقام التسجيل لضمان فرادتها.'
      });
    }
  });

  // Check for orphaned records
  const orphanedAttendance = attendance.filter(a => !learnerIds.has(a.learnerId));
  if (orphanedAttendance.length > 0) {
    issues.push({
      id: 'orphaned_attendance',
      type: 'orphaned_attendance',
      severity: 'high',
      message: `تم العثور على ${orphanedAttendance.length} سجل حضور لمتعلمين غير موجودين في القاعدة.`,
      itemIds: orphanedAttendance.map(a => a.id),
      suggestedAction: 'حذف سجلات الحضور اليتيمة.'
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
      suggestedAction: 'حذف المخالفات اليتيمة.'
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
      suggestedAction: 'تنظيف سجل أوراق الخروج.'
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
      suggestedAction: 'تنظيف سجل زيارات المستوصف.'
    });
  }

  return issues;
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
