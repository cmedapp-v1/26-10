import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStoredSettings, 
  saveStoredSettings, 
  getStoredLearners, 
  saveStoredLearners, 
  getStoredAttendance, 
  saveStoredAttendance,
  getStoredSchedule,
  saveStoredSchedule,
  getStoredHolidays,
  saveStoredHolidays,
  getStoredViolations,
  saveStoredViolations,
  getStoredCommitments,
  saveStoredCommitments,
  getStoredExitPapers,
  saveStoredExitPapers,
  getStoredInfirmaryVisits,
  saveStoredInfirmaryVisits,
  getStoredAnimators,
  saveStoredAnimators,
  exportFullBackup
} from './utils/storage';
import { TabType, AppSettings, Learner, AttendanceRecord, ScheduledSession, Holiday, SessionTime, Violation, CommitmentRecord, ExitPaper, InfirmaryVisit, Animator } from './types';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LearnerManagement } from './components/LearnerManagement';
import { AnimatorManagement } from './components/AnimatorManagement';
import { AttendanceRecording } from './components/AttendanceRecording';
import { WeeklySchedule } from './components/WeeklySchedule';
import { AbsenceTracking } from './components/AbsenceTracking';
import { ViolationsManagement } from './components/ViolationsManagement';
import { Reports } from './components/Reports';
import { Backup } from './components/Backup';
import { Settings, SettingsSubTab } from './components/Settings';
import { OfficialHeader } from './components/OfficialHeader';
import { DataCorrection } from './components/DataCorrection';

export default function App() {
  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Application Data States
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings);
  const [learners, setLearners] = useState<Learner[]>(getStoredLearners);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(getStoredAttendance);
  const [schedule, setSchedule] = useState<ScheduledSession[]>(getStoredSchedule);
  const [holidays, setHolidays] = useState<Holiday[]>(getStoredHolidays);
  const [violations, setViolations] = useState<Violation[]>(getStoredViolations);
  const [commitments, setCommitments] = useState<CommitmentRecord[]>(getStoredCommitments);
  const [exitPapers, setExitPapers] = useState<ExitPaper[]>(getStoredExitPapers);
  const [infirmaryVisits, setInfirmaryVisits] = useState<InfirmaryVisit[]>(getStoredInfirmaryVisits);
  const [animators, setAnimators] = useState<Animator[]>(getStoredAnimators);

  // Active settings subtab for direct routing
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');

  // Quick jump state for schedule filtered by a specific animator
  const [scheduleAnimatorFilter, setScheduleAnimatorFilter] = useState<string | null>(null);

  // Direct jump to Settings -> Animators
  const handleOpenAnimatorsSettings = () => {
    setSettingsSubTab('animators');
    setActiveTab('settings');
  };

  // Quick jump state for violations filtered on a single learner
  const [selectedLearnerForViolations, setSelectedLearnerForViolations] = useState<string | null>(null);
  // Quick jump state for creating a commitment for a specific learner
  const [initialCommitmentLearnerId, setInitialCommitmentLearnerId] = useState<string | null>(null);

  // Quick attendance jump state from schedule
  const [attendancePrefill, setAttendancePrefill] = useState<{
    date: string;
    sessionTime: SessionTime;
    className: string;
    subject?: string;
  } | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredLearners(learners);
  }, [learners]);

  useEffect(() => {
    saveStoredAnimators(animators);
  }, [animators]);

  useEffect(() => {
    saveStoredAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    saveStoredSchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    saveStoredHolidays(holidays);
  }, [holidays]);

  useEffect(() => {
    saveStoredViolations(violations);
  }, [violations]);

  useEffect(() => {
    saveStoredCommitments(commitments);
  }, [commitments]);

  useEffect(() => {
    saveStoredExitPapers(exitPapers);
  }, [exitPapers]);

  useEffect(() => {
    saveStoredInfirmaryVisits(infirmaryVisits);
  }, [infirmaryVisits]);

  // Handler to navigate to schedule pre-filtered by animator
  const handleNavigateToScheduleForAnimator = (animatorName?: string) => {
    setScheduleAnimatorFilter(animatorName || null);
    setActiveTab('schedule');
  };

  // Handler to jump to learner violations
  const handleViewLearnerViolations = (learnerId: string) => {
    setSelectedLearnerForViolations(learnerId);
    setActiveTab('violations');
  };

  // Handler to open commitment generation for a learner directly
  const handleCreateCommitmentForLearner = (learnerId: string) => {
    setInitialCommitmentLearnerId(learnerId);
    setActiveTab('violations');
  };

  // Helper to open attendance recording prefilled from a schedule session
  const handleOpenAttendanceForSession = (session: ScheduledSession, dateStr: string) => {
    setAttendancePrefill({
      date: dateStr,
      sessionTime: session.timeSlot,
      className: session.classes[0] || settings.classes[0],
      subject: session.subject,
    });
    setActiveTab('attendance');
  };

  // Unexcused absence threshold alert calculation for badge count
  const alertCount = useMemo(() => {
    const activeLearnerIds = new Set(
      learners.filter((l) => l.status === 'نشط').map((l) => l.id)
    );

    const unexcusedCounts: Record<string, number> = {};
    attendance.forEach((rec) => {
      if (rec.status === 'غائب' && activeLearnerIds.has(rec.learnerId)) {
        unexcusedCounts[rec.learnerId] = (unexcusedCounts[rec.learnerId] || 0) + 1;
      }
    });

    let count = 0;
    Object.values(unexcusedCounts).forEach((c) => {
      if (c >= settings.alertThreshold) {
        count++;
      }
    });

    return count;
  }, [learners, attendance, settings.alertThreshold]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 mr-64 p-8">
        <OfficialHeader settings={settings} className="no-print" />
        
        {activeTab === 'dashboard' && (
          <Dashboard
            learners={learners}
            attendance={attendance}
            settings={settings}
            animators={animators}
            setActiveTab={setActiveTab}
            onOpenAnimators={handleOpenAnimatorsSettings}
          />
        )}

        {activeTab === 'students' && (
          <LearnerManagement
            learners={learners}
            setLearners={setLearners}
            attendance={attendance}
            settings={settings}
            setSettings={setSettings}
            violations={violations}
            onViewLearnerViolations={handleViewLearnerViolations}
            onAddNewViolationForLearner={handleViewLearnerViolations}
            onCreateCommitmentForLearner={handleCreateCommitmentForLearner}
          />
        )}

        {activeTab === 'animators' && (
          <AnimatorManagement
            animators={animators}
            setAnimators={setAnimators}
            schedule={schedule}
            setSchedule={setSchedule}
            settings={settings}
            onNavigateToSchedule={handleNavigateToScheduleForAnimator}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceRecording
            learners={learners}
            attendance={attendance}
            setAttendance={setAttendance}
            settings={settings}
            schedule={schedule}
            holidays={holidays}
            initialPrefill={attendancePrefill}
          />
        )}

        {activeTab === 'schedule' && (
          <WeeklySchedule
            schedule={schedule}
            setSchedule={setSchedule}
            holidays={holidays}
            setHolidays={setHolidays}
            settings={settings}
            animators={animators}
            initialAnimatorFilter={scheduleAnimatorFilter || undefined}
            onOpenAttendanceForSession={handleOpenAttendanceForSession}
          />
        )}

        {activeTab === 'tracking' && (
          <AbsenceTracking
            learners={learners}
            attendance={attendance}
            setAttendance={setAttendance}
            schedule={schedule}
            settings={settings}
            exitPapers={exitPapers}
            setExitPapers={setExitPapers}
            infirmaryVisits={infirmaryVisits}
            setInfirmaryVisits={setInfirmaryVisits}
            onOpenViolations={() => setActiveTab('violations')}
            violationsCount={violations.length}
          />
        )}

        {activeTab === 'violations' && (
          <ViolationsManagement
            learners={learners}
            violations={violations}
            setViolations={setViolations}
            commitments={commitments}
            setCommitments={setCommitments}
            settings={settings}
            initialLearnerId={selectedLearnerForViolations}
            onClearInitialLearner={() => setSelectedLearnerForViolations(null)}
            initialCommitmentLearnerId={initialCommitmentLearnerId}
            onClearInitialCommitmentLearner={() => setInitialCommitmentLearnerId(null)}
          />
        )}

        {activeTab === 'reports' && (
          <Reports 
            learners={learners}
            attendance={attendance}
            violations={violations}
            schedule={schedule}
            exitPapers={exitPapers}
            infirmaryVisits={infirmaryVisits}
            settings={settings}
            animators={animators}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            learners={learners}
            setLearners={setLearners}
            attendance={attendance}
            setAttendance={setAttendance}
            schedule={schedule}
            setSchedule={setSchedule}
            holidays={holidays}
            setHolidays={setHolidays}
            violations={violations}
            setViolations={setViolations}
            commitments={commitments}
            setCommitments={setCommitments}
            exitPapers={exitPapers}
            setExitPapers={setExitPapers}
            infirmaryVisits={infirmaryVisits}
            setInfirmaryVisits={setInfirmaryVisits}
            animators={animators}
            setAnimators={setAnimators}
            initialSubTab={settingsSubTab}
            onNavigateToSchedule={handleNavigateToScheduleForAnimator}
          />
        )}
        
        {/* Footer */}
        <footer className="no-print mt-12 border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>تطبيق «تدبير المتعلمين» · {settings.schoolName} · السنة الدراسية {settings.schoolYear}</p>
          <p className="mt-1">البيانات محفوظة محلياً على جهازك · يوصى بتنزيل نسخ احتياطية بانتظام</p>
        </footer>
      </main>
    </div>
  );
}
