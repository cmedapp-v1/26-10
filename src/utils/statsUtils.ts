import { Learner, AttendanceRecord, Violation, ScheduledSession, ExitPaper, InfirmaryVisit } from '../types';

export interface ReportStats {
  totalLearners: number;
  activeLearners: number;
  droppedLearners: number;
  graduatedLearners: number;
  attendanceRate: number;
  totalAbsences: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
  totalViolations: number;
  totalExitPapers: number;
  totalInfirmaryVisits: number;
  dropoutRate: number;
  monthlyAttendance: { month: string; rate: number }[];
  distributionByClass: { name: string; count: number }[];
  distributionByGender: { name: string; count: number }[];
}

export const calculateReportStats = (
  learners: Learner[],
  attendance: AttendanceRecord[],
  violations: Violation[],
  exitPapers: ExitPaper[] = [],
  infirmaryVisits: InfirmaryVisit[] = [],
  dateRange?: { start: string; end: string },
  filters?: { className?: string; stream?: string }
): ReportStats => {
  // Apply filters
  let filteredLearners = [...learners];
  let filteredAttendance = [...attendance];
  let filteredViolations = [...violations];
  let filteredExitPapers = [...exitPapers];
  let filteredInfirmaryVisits = [...infirmaryVisits];

  if (filters?.className) {
    filteredLearners = filteredLearners.filter(l => l.className === filters.className);
    filteredAttendance = filteredAttendance.filter(a => {
      const learner = learners.find(l => l.id === a.learnerId);
      return learner?.className === filters.className;
    });
    filteredViolations = filteredViolations.filter(v => v.className === filters.className);
    filteredExitPapers = filteredExitPapers.filter(e => e.className === filters.className);
    filteredInfirmaryVisits = filteredInfirmaryVisits.filter(i => i.className === filters.className);
  }

  if (filters?.stream) {
    filteredLearners = filteredLearners.filter(l => l.stream === filters.stream);
    filteredAttendance = filteredAttendance.filter(a => {
      const learner = learners.find(l => l.id === a.learnerId);
      return learner?.stream === filters.stream;
    });
    filteredViolations = filteredViolations.filter(v => v.stream === filters.stream);
    filteredExitPapers = filteredExitPapers.filter(e => e.stream === filters.stream);
    filteredInfirmaryVisits = filteredInfirmaryVisits.filter(i => i.stream === filters.stream);
  }

  if (dateRange) {
    filteredAttendance = filteredAttendance.filter(a => a.date >= dateRange.start && a.date <= dateRange.end);
    filteredViolations = filteredViolations.filter(v => v.date >= dateRange.start && v.date <= dateRange.end);
    filteredExitPapers = filteredExitPapers.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
    filteredInfirmaryVisits = filteredInfirmaryVisits.filter(i => i.date >= dateRange.start && i.date <= dateRange.end);
  }

  const active = filteredLearners.filter(l => l.status === 'نشط').length;
  const dropped = filteredLearners.filter(l => l.status === 'منقطع').length;
  const graduated = filteredLearners.filter(l => l.status === 'مغادر').length;
  
  const totalAbsences = filteredAttendance.filter(a => a.status === 'غائب').length;
  const excusedAbsences = filteredAttendance.filter(a => a.status === 'غياب مبرر').length;
  const unexcusedAbsences = filteredAttendance.filter(a => a.status === 'غائب').length;
  const lates = filteredAttendance.filter(a => a.status === 'متأخر').length;
  
  const totalRecords = filteredAttendance.length;
  const attendanceRate = totalRecords > 0 
    ? Math.round(((totalRecords - totalAbsences - lates) / totalRecords) * 100) 
    : 100;

  const totalLearners = filteredLearners.length;
  const dropoutRate = totalLearners > 0 
    ? Math.round((dropped / totalLearners) * 100) 
    : 0;

  // Monthly stats
  const monthlyData: Record<string, { present: number; total: number }> = {};
  filteredAttendance.forEach(a => {
    const month = a.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = { present: 0, total: 0 };
    monthlyData[month].total++;
    if (a.status === 'حاضر') monthlyData[month].present++;
  });

  const monthlyAttendance = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      rate: Math.round((data.present / data.total) * 100)
    }));

  // Distribution
  const classDist: Record<string, number> = {};
  filteredLearners.forEach(l => {
    classDist[l.className] = (classDist[l.className] || 0) + 1;
  });

  const genderDist: Record<string, number> = { 'ذكر': 0, 'أنثى': 0 };
  filteredLearners.forEach(l => {
    genderDist[l.gender] = (genderDist[l.gender] || 0) + 1;
  });

  return {
    totalLearners,
    activeLearners: active,
    droppedLearners: dropped,
    graduatedLearners: graduated,
    attendanceRate,
    totalAbsences,
    excusedAbsences,
    unexcusedAbsences,
    totalViolations: filteredViolations.length,
    totalExitPapers: filteredExitPapers.length,
    totalInfirmaryVisits: filteredInfirmaryVisits.length,
    dropoutRate,
    monthlyAttendance,
    distributionByClass: Object.entries(classDist).map(([name, count]) => ({ name, count })),
    distributionByGender: Object.entries(genderDist).map(([name, count]) => ({ name, count }))
  };
};
export interface BranchMonthlyStats {
  stream: string;
  learnerCount: number;
  presentCount: number;
  absentCount: number; // Unexcused
  excusedCount: number; // Excused
  lateCount: number;
  totalSessions: number; // Denominator: present + absent + excused + late
  attendanceRate: number;
  absenceRate: number;
}

export const calculateBranchMonthlyStats = (
  learners: Learner[],
  attendance: AttendanceRecord[],
  month: string, // YYYY-MM
  className?: string
): BranchMonthlyStats[] => {
  const filteredAttendance = attendance.filter(a => a.date.startsWith(month));
  
  // Group by stream
  const streamStats: Record<string, { 
    learnerIds: Set<string>;
    present: number;
    absent: number;
    excused: number;
    late: number;
  }> = {};

  filteredAttendance.forEach(a => {
    const learner = learners.find(l => l.id === a.learnerId);
    if (!learner) return;
    if (className && learner.className !== className) return;

    const stream = learner.stream || 'بدون شعبة';
    if (!streamStats[stream]) {
      streamStats[stream] = {
        learnerIds: new Set(),
        present: 0,
        absent: 0,
        excused: 0,
        late: 0
      };
    }

    streamStats[stream].learnerIds.add(a.learnerId);
    
    if (a.status === 'حاضر') streamStats[stream].present++;
    else if (a.status === 'غائب') streamStats[stream].absent++;
    else if (a.status === 'غياب مبرر') streamStats[stream].excused++;
    else if (a.status === 'متأخر') streamStats[stream].late++;
  });

  return Object.entries(streamStats).map(([stream, data]) => {
    const totalAbsence = data.absent + data.excused;
    const denominator = data.present + totalAbsence + data.late;
    
    return {
      stream,
      learnerCount: data.learnerIds.size,
      presentCount: data.present,
      absentCount: data.absent,
      excusedCount: data.excused,
      lateCount: data.late,
      totalSessions: denominator,
      attendanceRate: denominator > 0 ? Math.round((data.present / denominator) * 100) : 0,
      absenceRate: denominator > 0 ? Math.round((totalAbsence / denominator) * 100) : 0
    };
  }).sort((a, b) => b.attendanceRate - a.attendanceRate);
};
