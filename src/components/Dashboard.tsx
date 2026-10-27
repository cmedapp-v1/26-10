import React, { useMemo } from 'react';
import { 
  Users, 
  UserX, 
  Clock, 
  CheckCircle2, 
  Percent, 
  AlertTriangle, 
  Plus, 
  ClipboardList, 
  TrendingUp,
  ArrowRight,
  Send,
  Calendar,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { Learner, AttendanceRecord, AppSettings, TabType, Animator } from '../types';

interface DashboardProps {
  learners: Learner[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  animators?: Animator[];
  setActiveTab: (tab: TabType) => void;
  onSelectLearnerForTracking?: (learnerId: string) => void;
  onOpenAnimators?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  learners,
  attendance,
  settings,
  animators = [],
  setActiveTab,
  onSelectLearnerForTracking,
  onOpenAnimators,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Active learners count
  const activeLearners = useMemo(() => learners.filter((l) => l.status === 'نشط'), [learners]);
  const activeLearnerIds = useMemo(() => new Set(activeLearners.map((l) => l.id)), [activeLearners]);

  // Today's attendance records
  const todayRecords = useMemo(() => {
    return attendance.filter((a) => a.date === todayStr && activeLearnerIds.has(a.learnerId));
  }, [attendance, todayStr, activeLearnerIds]);

  const todayAbsents = useMemo(() => todayRecords.filter((r) => r.status === 'غائب').length, [todayRecords]);
  const todayLates = useMemo(() => todayRecords.filter((r) => r.status === 'متأخر').length, [todayRecords]);
  const todayExcused = useMemo(() => todayRecords.filter((r) => r.status === 'غياب مبرر').length, [todayRecords]);
  const todayPresents = useMemo(() => todayRecords.filter((r) => r.status === 'حاضر').length, [todayRecords]);

  // 2. Monthly attendance rate calculation (Last 30 days)
  const monthlyStats = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const monthRecords = attendance.filter(
      (a) => a.date >= thirtyDaysAgoStr && activeLearnerIds.has(a.learnerId)
    );

    if (monthRecords.length === 0) return { rate: 100, total: 0, presents: 0 };

    const presentsAndLates = monthRecords.filter((r) => r.status === 'حاضر' || r.status === 'متأخر').length;
    const rate = Math.round((presentsAndLates / monthRecords.length) * 100);

    return { rate, total: monthRecords.length, presents: presentsAndLates };
  }, [attendance, activeLearnerIds]);

  // 3. Unexcused absence count per learner to detect threshold alerts
  const learnersWithAlerts = useMemo(() => {
    const unexcusedCounts: Record<string, number> = {};

    attendance.forEach((rec) => {
      if (rec.status === 'غائب' && activeLearnerIds.has(rec.learnerId)) {
        unexcusedCounts[rec.learnerId] = (unexcusedCounts[rec.learnerId] || 0) + 1;
      }
    });

    const alertList: { learner: Learner; count: number }[] = [];

    activeLearners.forEach((learner) => {
      const count = unexcusedCounts[learner.id] || 0;
      if (count >= settings.alertThreshold) {
        alertList.push({ learner, count });
      }
    });

    return alertList.sort((a, b) => b.count - a.count);
  }, [attendance, activeLearners, activeLearnerIds, settings.alertThreshold]);

  // 4. Breakdown by Session (09:00-11:00, 11:00-13:00, 14:00-16:00)
  const sessionStats = useMemo(() => {
    const stats: Record<string, { present: number; absent: number; late: number; excused: number }> = {};

    settings.sessions.forEach((sess) => {
      stats[sess] = { present: 0, absent: 0, late: 0, excused: 0 };
    });

    todayRecords.forEach((rec) => {
      if (!stats[rec.session]) {
        stats[rec.session] = { present: 0, absent: 0, late: 0, excused: 0 };
      }
      if (rec.status === 'حاضر') stats[rec.session].present++;
      else if (rec.status === 'غائب') stats[rec.session].absent++;
      else if (rec.status === 'متأخر') stats[rec.session].late++;
      else if (rec.status === 'غياب مبرر') stats[rec.session].excused++;
    });

    return stats;
  }, [todayRecords, settings.sessions]);

  // 5. Breakdown by Gender
  const genderStats = useMemo(() => {
    const maleLearners = activeLearners.filter((l) => l.gender === 'ذكر');
    const femaleLearners = activeLearners.filter((l) => l.gender === 'أنثى');

    const maleIds = new Set(maleLearners.map((l) => l.id));
    const femaleIds = new Set(femaleLearners.map((l) => l.id));

    const maleRecords = todayRecords.filter((r) => maleIds.has(r.learnerId));
    const femaleRecords = todayRecords.filter((r) => femaleIds.has(r.learnerId));

    const getAbsenceCount = (recs: AttendanceRecord[]) => recs.filter((r) => r.status === 'غائب').length;
    const getPresentCount = (recs: AttendanceRecord[]) => recs.filter((r) => r.status === 'حاضر' || r.status === 'متأخر').length;

    return {
      male: {
        total: maleLearners.length,
        todayPresent: getPresentCount(maleRecords),
        todayAbsent: getAbsenceCount(maleRecords),
      },
      female: {
        total: femaleLearners.length,
        todayPresent: getPresentCount(femaleRecords),
        todayAbsent: getAbsenceCount(femaleRecords),
      },
    };
  }, [activeLearners, todayRecords]);

  // 6. Breakdown by Stream
  const streamStats = useMemo(() => {
    const map: Record<string, { total: number; absents: number }> = {};

    settings.streams.forEach((st) => {
      map[st] = { total: 0, absents: 0 };
    });

    activeLearners.forEach((l) => {
      if (!map[l.stream]) map[l.stream] = { total: 0, absents: 0 };
      map[l.stream].total++;
    });

    todayRecords.forEach((rec) => {
      if (rec.status === 'غائب') {
        const learner = learners.find((l) => l.id === rec.learnerId);
        if (learner && map[learner.stream]) {
          map[learner.stream].absents++;
        }
      }
    });

    return map;
  }, [activeLearners, todayRecords, settings.streams, learners]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-100 dark:border-emerald-900">
            <Calendar className="w-3.5 h-3.5" />
            <span>اليوم: {new Date().toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            لوحة القيادة | تدبير المتعلمين
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            تتبع ورصد الحضور والغياب والتأخرات والتنبيهات المبكرة بمؤسسة {settings.schoolNameFull}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('attendance')}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 hover:scale-[1.02]"
          >
            <ClipboardList className="w-4 h-4" />
            <span>تسجيل حضور اليوم</span>
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-700 transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>المخالفات</span>
          </button>
          <button
            onClick={() => onOpenAnimators ? onOpenAnimators() : setActiveTab('settings')}
            className="flex items-center gap-2 px-5 py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-2xl font-bold text-sm border border-blue-200 dark:border-blue-800 transition-all"
          >
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>المنشطون ({animators.filter(a => a.status === 'نشط').length} نشط)</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Active Learners */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المتعلمون النشطون</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums">
              {activeLearners.length}
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
              من أصل {learners.length} مسجل
            </p>
          </div>
        </div>

        {/* Today Absentees */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الغائبون اليوم</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {todayAbsents}
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
              {todayRecords.length > 0 ? `${todayRecords.length} حصة مسجلة` : 'لم تسجل حصص'}
            </p>
          </div>
        </div>

        {/* Today Lates */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المتأخرون اليوم</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {todayLates}
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
              تأخرات مسجلة اليوم
            </p>
          </div>
        </div>

        {/* Today Excused */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الغيابات المبررة</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
              {todayExcused}
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
              غيابات بعذر مبرر
            </p>
          </div>
        </div>

        {/* Monthly Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نسبة الحضور</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {monthlyStats.rate}%
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${monthlyStats.rate}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Threshold Alert Warnings Section */}
      <div className={`p-5 rounded-xl border transition-all ${
        learnersWithAlerts.length > 0 
          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {learnersWithAlerts.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
            <h3 className={`text-base font-bold ${
              learnersWithAlerts.length > 0 ? 'text-rose-900 dark:text-rose-200' : 'text-emerald-900 dark:text-emerald-200'
            }`}>
              تنبيهات تجاوز عتبة الغيابات غير المبررة (العتبة: {settings.alertThreshold} حصص)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            {learnersWithAlerts.length} متعلم مهدد
          </span>
        </div>

        {learnersWithAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {learnersWithAlerts.map(({ learner, count }) => (
              <div
                key={learner.id}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-rose-200 dark:border-rose-800/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {learner.arabicName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {learner.className} · {learner.stream}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    رقم مسار: <span className="font-mono">{learner.masarCode}</span>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 tabular-nums">
                    {count} غيابات
                  </span>
                  
                  {learner.whatsapp && (
                    <a
                      href={`https://wa.me/212${learner.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
                        `السلام عليكم، نود التواصل معكم من مدرسة الفرصة الثانية - الجيل الجديد زيرارة بخصوص تكرار غياب المتعلم(ة): ${learner.arabicName}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                    >
                      <span>تواصل واتساب</span>
                      <Send className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            ممتاز! لا يوجد أي متعلم تجاوز عتبة الغيابات غير المبررة المحددة حتى الآن.
          </p>
        )}
      </div>

      {/* Statistics Section Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance by Session */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>إحصائيات الحضور حسب الحصة الزمنية (اليوم)</span>
            </h3>
          </div>

          <div className="space-y-3">
            {settings.sessions.map((session) => {
              const data = sessionStats[session] || { present: 0, absent: 0, late: 0, excused: 0 };
              const total = data.present + data.absent + data.late + data.excused;

              return (
                <div key={session} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      الحصة: {session}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      إجمالي المسجلين: {total}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                    <div className="bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 py-1 rounded">
                      حاضر: {data.present}
                    </div>
                    <div className="bg-rose-100/70 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 py-1 rounded">
                      غائب: {data.absent}
                    </div>
                    <div className="bg-amber-100/70 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 py-1 rounded">
                      متأخر: {data.late}
                    </div>
                    <div className="bg-indigo-100/70 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 py-1 rounded">
                      مبرر: {data.excused}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance by Gender */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>إحصائيات المتعلمين حسب الجنس</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Male learners */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الذكور</span>
                  <span className="text-xs text-slate-500">إجمالي: {genderStats.male.total}</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
                  {genderStats.male.total} متعلم
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">حاضرون: {genderStats.male.todayPresent}</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">غائبون: {genderStats.male.todayAbsent}</span>
              </div>
            </div>

            {/* Female learners */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الإناث</span>
                  <span className="text-xs text-slate-500">إجمالي: {genderStats.female.total}</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
                  {genderStats.female.total} متعلمة
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">حاضرات: {genderStats.female.todayPresent}</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">غائبات: {genderStats.female.todayAbsent}</span>
              </div>
            </div>

          </div>

          {/* Breakdown by Stream */}
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              توزيع المتعلمين والغيابات حسب الشعب المهن
            </h4>
            <div className="space-y-2">
              {Object.entries(streamStats).map(([streamName, st]) => (
                <div key={streamName} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/30">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{streamName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">إجمالي: {st.total}</span>
                    <span className={`font-bold ${st.absents > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      غياب اليوم: {st.absents}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
