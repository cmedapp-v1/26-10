import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  X, 
  User, 
  Calendar, 
  MapPin, 
  UserCheck, 
  FileSpreadsheet, 
  History, 
  ChevronDown,
  Info,
  Award,
  FileCheck,
  Check,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { 
  Learner, 
  AppSettings, 
  Violation, 
  ViolationStatus, 
  ViolationActionLog,
  CommitmentRecord,
  CommitmentStatus
} from '../types';
import { DEFAULT_VIOLATION_TYPES, STANDARD_VIOLATION_ACTIONS, DEFAULT_COMMITMENT_TEXT } from '../utils/initialData';
import { ConfirmDialog } from './ConfirmDialog';
import { PrintPreviewModal } from './PrintPreviewModal';
import { generateNextViolationNumber, generateNextCommitmentNumber } from '../utils/storage';
import { 
  exportViolationsToExcel, 
  exportViolationsToCsv,
  exportCommitmentsToExcel,
  exportCommitmentsToCsv
} from '../utils/excelImportExport';

interface ViolationsManagementProps {
  learners: Learner[];
  violations: Violation[];
  setViolations: React.Dispatch<React.SetStateAction<Violation[]>>;
  commitments?: CommitmentRecord[];
  setCommitments?: React.Dispatch<React.SetStateAction<CommitmentRecord[]>>;
  settings: AppSettings;
  initialLearnerId?: string | null;
  onClearInitialLearner?: () => void;
  initialCommitmentLearnerId?: string | null;
  onClearInitialCommitmentLearner?: () => void;
}

export const ViolationsManagement: React.FC<ViolationsManagementProps> = ({
  learners,
  violations,
  setViolations,
  commitments = [],
  setCommitments,
  settings,
  initialLearnerId,
  onClearInitialLearner,
  initialCommitmentLearnerId,
  onClearInitialCommitmentLearner,
}) => {
  // Learners Map for fast lookup
  const learnersMap = useMemo(() => {
    const map = new Map<string, Learner>();
    learners.forEach((l) => map.set(l.id, l));
    return map;
  }, [learners]);

  // Active Violation Types
  const violationTypes = useMemo(() => {
    return settings.violationTypes && settings.violationTypes.length > 0 
      ? settings.violationTypes 
      : DEFAULT_VIOLATION_TYPES;
  }, [settings.violationTypes]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLearnerFilter, setSelectedLearnerFilter] = useState<string>(initialLearnerId || 'all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [viewingViolation, setViewingViolation] = useState<Violation | null>(null);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [printNoticeViolation, setPrintNoticeViolation] = useState<Violation | null>(null);
  const [deletingViolation, setDeletingViolation] = useState<Violation | null>(null);

  // Print preview modal state
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('سجل المخالفات');
  const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewFileName, setPreviewFileName] = useState('سجل_المخالفات');

  // Active Sub-Tab: 'violations' or 'commitments'
  const [activeSubTab, setActiveSubTab] = useState<'violations' | 'commitments'>('violations');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Commitments Filters State
  const [commitmentSearchTerm, setCommitmentSearchTerm] = useState('');
  const [commitmentStatusFilter, setCommitmentStatusFilter] = useState<string>('all');
  const [commitmentClassFilter, setCommitmentClassFilter] = useState<string>('all');
  const [commitmentStreamFilter, setCommitmentStreamFilter] = useState<string>('all');
  const [commitmentStartDate, setCommitmentStartDate] = useState<string>('');
  const [commitmentEndDate, setCommitmentEndDate] = useState<string>('');

  // Commitments Modals State
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState<boolean>(false);
  const [viewingCommitmentForPrint, setViewingCommitmentForPrint] = useState<CommitmentRecord | null>(null);
  const [editingCommitmentRecord, setEditingCommitmentRecord] = useState<CommitmentRecord | null>(null);
  const [deletingCommitmentRecord, setDeletingCommitmentRecord] = useState<CommitmentRecord | null>(null);

  // Confirmation Modals State
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
    type: 'info'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  // Commitment Form Data
  const [commitmentFormData, setCommitmentFormData] = useState<{
    id?: string;
    commitmentNumber: string;
    learnerId: string;
    date: string;
    violationId: string;
    text: string;
    notes: string;
    status: CommitmentStatus;
    guardianName: string;
    guardianPhone: string;
    guardianCin: string;
    guardianRelation: string;
    recordedBy: string;
  }>({
    commitmentNumber: '',
    learnerId: '',
    date: new Date().toISOString().split('T')[0],
    violationId: '',
    text: DEFAULT_COMMITMENT_TEXT,
    notes: '',
    status: 'محرر',
    guardianName: '',
    guardianPhone: '',
    guardianCin: '',
    guardianRelation: 'الولي الشرعي',
    recordedBy: 'إدارة المركز',
  });

  // Watch for initialCommitmentLearnerId
  useEffect(() => {
    if (initialCommitmentLearnerId) {
      setActiveSubTab('commitments');
      handleOpenCreateCommitmentModal(initialCommitmentLearnerId);
      if (onClearInitialCommitmentLearner) {
        onClearInitialCommitmentLearner();
      }
    }
  }, [initialCommitmentLearnerId]);

  // Form State for Add / Edit Violation
  const [formData, setFormData] = useState<{
    violationNumber: string;
    learnerId: string;
    date: string;
    time: string;
    type: string;
    otherType: string;
    description: string;
    location: string;
    actionTaken: string;
    otherAction: string;
    actionDate: string;
    lastFollowUpDate: string;
    status: ViolationStatus;
    recordedBy: string;
    notes: string;
  }>({
    violationNumber: '',
    learnerId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false }),
    type: violationTypes[0] || 'عدم احترام النظام الداخلي',
    otherType: '',
    description: '',
    location: 'قاعة التكوين الأساسي',
    actionTaken: STANDARD_VIOLATION_ACTIONS[0] || 'تنبيه شفهي',
    otherAction: '',
    actionDate: new Date().toISOString().split('T')[0],
    lastFollowUpDate: '',
    status: 'جديدة',
    recordedBy: '',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Action Log Form State (inside Viewing / Updating Modal)
  const [newActionText, setNewActionText] = useState('');
  const [newActionNotes, setNewActionNotes] = useState('');
  const [newActionRecordedBy, setNewActionRecordedBy] = useState('');
  const [newActionDate, setNewActionDate] = useState(new Date().toISOString().split('T')[0]);

  // Open Create Commitment Modal
  const handleOpenCreateCommitmentModal = (preselectedLearnerId?: string, preselectedViolationId?: string) => {
    const nextNum = generateNextCommitmentNumber(commitments, settings.schoolYear.split('/')[0] || '2026');
    const targetLearnerId = preselectedLearnerId || (learners.length > 0 ? learners[0].id : '');
    const targetLearner = targetLearnerId ? learnersMap.get(targetLearnerId) : null;
    
    setCommitmentFormData({
      commitmentNumber: nextNum,
      learnerId: targetLearnerId,
      date: new Date().toISOString().split('T')[0],
      violationId: preselectedViolationId || '',
      text: DEFAULT_COMMITMENT_TEXT,
      notes: '',
      status: 'محرر',
      guardianName: targetLearner ? `ولي أمر ${targetLearner.arabicName}` : '',
      guardianPhone: targetLearner ? targetLearner.parentPhone || '' : '',
      guardianCin: '',
      guardianRelation: 'الولي الشرعي',
      recordedBy: 'إدارة المركز',
    });
    setFormError(null);
    setIsCommitmentModalOpen(true);
  };

  // Open Edit Existing Commitment
  const handleOpenEditCommitmentModal = (record: CommitmentRecord) => {
    setEditingCommitmentRecord(record);
    setCommitmentFormData({
      id: record.id,
      commitmentNumber: record.commitmentNumber,
      learnerId: record.learnerId,
      date: record.date,
      violationId: record.violationId || '',
      text: record.text,
      notes: record.notes || '',
      status: record.status,
      guardianName: record.guardianName || '',
      guardianPhone: record.guardianPhone || '',
      guardianCin: record.guardianCin || '',
      guardianRelation: record.guardianRelation || 'الولي الشرعي',
      recordedBy: record.recordedBy || 'إدارة المركز',
    });
    setFormError(null);
  };

  // Auto-fill form with next number when opening Add Violation Modal
  const handleOpenAddModal = (preselectedLearnerId?: string) => {
    const nextNum = generateNextViolationNumber(violations, settings.schoolYear.split('/')[0] || '2026');
    const targetLearnerId = preselectedLearnerId || (learners.length > 0 ? learners[0].id : '');
    
    setFormData({
      violationNumber: nextNum,
      learnerId: targetLearnerId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type: violationTypes[0] || 'عدم احترام النظام الداخلي',
      otherType: '',
      description: '',
      location: 'قاعة التكوين الأساسي',
      actionTaken: STANDARD_VIOLATION_ACTIONS[0] || 'تنبيه شفهي',
      otherAction: '',
      actionDate: new Date().toISOString().split('T')[0],
      lastFollowUpDate: '',
      status: 'جديدة',
      recordedBy: '',
      notes: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (v: Violation) => {
    const isOtherType = !violationTypes.includes(v.type);
    setEditingViolation(v);
    setFormData({
      violationNumber: v.violationNumber,
      learnerId: v.learnerId,
      date: v.date,
      time: v.time || '',
      type: isOtherType ? 'مخالفة أخرى' : v.type,
      otherType: isOtherType ? v.type : '',
      description: v.description,
      location: v.location || '',
      actionTaken: v.actionTaken,
      otherAction: '',
      actionDate: v.actionDate || v.date,
      lastFollowUpDate: v.lastFollowUpDate || '',
      status: v.status,
      recordedBy: v.recordedBy || '',
      notes: v.notes || '',
    });
    setFormError(null);
  };

  // Save New Violation
  const handleSaveNewViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.learnerId) {
      setFormError('يرجى اختيار المتعلم المعني بالمخالفة.');
      return;
    }
    const learner = learnersMap.get(formData.learnerId);
    if (!learner) {
      setFormError('المتعلم المحدد غير موجود في قاعدة البيانات.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('يرجى كتابة تفاصيل ووصف المخالفة.');
      return;
    }

    const finalType = formData.type === 'مخالفة أخرى' && formData.otherType.trim() 
      ? formData.otherType.trim() 
      : formData.type;

    const finalAction = formData.actionTaken === 'أخرى' && formData.otherAction.trim()
      ? formData.otherAction.trim()
      : formData.actionTaken;

    const newViolation: Violation = {
      id: `vio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      violationNumber: formData.violationNumber.trim() || generateNextViolationNumber(violations),
      learnerId: learner.id,
      learnerName: learner.arabicName,
      registrationNumber: learner.registrationNumber,
      className: learner.className,
      stream: learner.stream,
      date: formData.date,
      time: formData.time.trim() || undefined,
      type: finalType,
      description: formData.description.trim(),
      location: formData.location.trim() || undefined,
      actionTaken: finalAction,
      status: formData.status,
      recordedBy: formData.recordedBy.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      actionHistory: [
        {
          id: `act_${Date.now()}`,
          date: formData.date,
          action: `تسجيل المخالفة: ${finalAction}`,
          notes: formData.notes.trim() || undefined,
          recordedBy: formData.recordedBy.trim() || 'الإدارة',
        }
      ]
    };

    setViolations((prev) => [newViolation, ...prev]);
    setIsAddModalOpen(false);
    setToastMessage(`تم تسجيل المخالفة بنجاح برقم (${newViolation.violationNumber}) للمتعلم: ${learner.arabicName}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Update Existing Violation
  const handleUpdateViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingViolation) return;
    
    openConfirm(
      'تأكيد حفظ التعديلات',
      'هل أنت متأكد من أنك تريد حفظ التعديلات التي أجريتها على سجل هذه المخالفة؟',
      () => executeUpdateViolation(),
      'warning'
    );
  };

  const executeUpdateViolation = () => {
    if (!editingViolation) return;
    const learner = learnersMap.get(formData.learnerId);
    if (!learner) return;

    const finalType = formData.type === 'مخالفة أخرى' && formData.otherType.trim() 
      ? formData.otherType.trim() 
      : formData.type;

    const finalAction = formData.actionTaken === 'أخرى' && formData.otherAction.trim()
      ? formData.otherAction.trim()
      : formData.actionTaken;

    setViolations((prev) =>
      prev.map((v) => {
        if (v.id === editingViolation.id) {
          return {
            ...v,
            learnerId: learner.id,
            learnerName: learner.arabicName,
            registrationNumber: learner.registrationNumber,
            className: learner.className,
            stream: learner.stream,
            date: formData.date,
            time: formData.time.trim() || undefined,
            type: finalType,
            description: formData.description.trim(),
            location: formData.location.trim() || undefined,
            actionTaken: finalAction,
            status: formData.status,
            recordedBy: formData.recordedBy.trim() || undefined,
            notes: formData.notes.trim() || undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return v;
      })
    );

    setEditingViolation(null);
    setToastMessage(`تم تحديث بيانات المخالفة (${editingViolation.violationNumber}) بنجاح.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quick Status Change from View Modal or Actions
  const handleUpdateStatus = (violationId: string, newStatus: ViolationStatus) => {
    setViolations((prev) =>
      prev.map((v) => {
        if (v.id === violationId) {
          const updatedLogs = [
            ...(v.actionHistory || []),
            {
              id: `act_${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              action: `تغيير الحالة إلى: ${newStatus}`,
              notes: 'تحديث حالة المعالجة الإدارية',
              recordedBy: 'إدارة المركز',
            }
          ];
          const updated = {
            ...v,
            status: newStatus,
            actionHistory: updatedLogs,
            updatedAt: new Date().toISOString(),
          };
          if (viewingViolation && viewingViolation.id === violationId) {
            setViewingViolation(updated);
          }
          return updated;
        }
        return v;
      })
    );
    setToastMessage(`تم تغيير حالة المخالفة إلى «${newStatus}»`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Action Log to Timeline
  const handleAddActionLog = (violationId: string) => {
    if (!newActionText.trim()) return;

    const newLog: ViolationActionLog = {
      id: `act_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      action: newActionText.trim(),
      notes: newActionNotes.trim() || undefined,
      recordedBy: newActionRecordedBy.trim() || 'الإدارة',
    };

    setViolations((prev) =>
      prev.map((v) => {
        if (v.id === violationId) {
          const updatedHistory = [...(v.actionHistory || []), newLog];
          const updated = {
            ...v,
            actionHistory: updatedHistory,
            updatedAt: new Date().toISOString(),
          };
          if (viewingViolation && viewingViolation.id === violationId) {
            setViewingViolation(updated);
          }
          return updated;
        }
        return v;
      })
    );

    setNewActionText('');
    setNewActionNotes('');
    setNewActionRecordedBy('');
    setToastMessage('تمت إضافة الإجراء الإداري الجديد إلى سجل المتابعة.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete Violation
  const handleConfirmDelete = () => {
    if (!deletingViolation) return;
    openConfirm(
      'تأكيد حذف المخالفة',
      `هل أنت متأكد من أنك تريد حذف المخالفة رقم (${deletingViolation.violationNumber}) نهائياً؟ لا يمكن التراجع عن هذا الحذف.`,
      () => executeDeleteViolation(),
      'danger'
    );
  };

  const executeDeleteViolation = () => {
    if (!deletingViolation) return;
    setViolations((prev) => prev.filter((v) => v.id !== deletingViolation.id));
    setToastMessage(`تم حذف المخالفة (${deletingViolation.violationNumber}) نهائياً.`);
    setDeletingViolation(null);
    if (viewingViolation?.id === deletingViolation.id) {
      setViewingViolation(null);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save Commitment (New)
  const handleSaveCommitment = (andPrint = false, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commitmentFormData.learnerId) {
      setFormError('يرجى اختيار المتعلم المعني بالالتزام.');
      return;
    }
    const learner = learnersMap.get(commitmentFormData.learnerId);
    if (!learner) {
      setFormError('المتعلم المحدد غير موجود في قاعدة البيانات.');
      return;
    }
    if (!commitmentFormData.text.trim()) {
      setFormError('يرجى كتابة أو التأكد من نص الالتزام.');
      return;
    }

    const linkedVio = commitmentFormData.violationId
      ? violations.find((v) => v.id === commitmentFormData.violationId)
      : undefined;

    const newCommitment: CommitmentRecord = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      commitmentNumber: commitmentFormData.commitmentNumber || generateNextCommitmentNumber(commitments),
      learnerId: learner.id,
      learnerName: learner.arabicName,
      registrationNumber: learner.registrationNumber,
      masarCode: learner.masarCode,
      className: learner.className,
      stream: learner.stream,
      date: commitmentFormData.date,
      violationId: commitmentFormData.violationId || undefined,
      violationNumber: linkedVio?.violationNumber || undefined,
      text: commitmentFormData.text.trim(),
      notes: commitmentFormData.notes.trim() || undefined,
      status: commitmentFormData.status,
      guardianName: commitmentFormData.guardianName.trim() || undefined,
      guardianPhone: commitmentFormData.guardianPhone.trim() || undefined,
      guardianCin: commitmentFormData.guardianCin.trim() || undefined,
      guardianRelation: commitmentFormData.guardianRelation || 'الولي الشرعي',
      recordedBy: commitmentFormData.recordedBy.trim() || 'إدارة المركز',
      exportDate: andPrint ? new Date().toISOString().split('T')[0] : undefined,
      createdAt: new Date().toISOString(),
    };

    if (setCommitments) {
      setCommitments((prev) => [newCommitment, ...prev]);
    }

    // Automatically update violation action history if linked
    if (linkedVio) {
      setViolations((prev) =>
        prev.map((v) => {
          if (v.id === linkedVio.id) {
            const newLog: ViolationActionLog = {
              id: `act_${Date.now()}`,
              date: commitmentFormData.date,
              action: `تحرير التزام باحترام النظام الداخلي (وثيقة رقم: ${newCommitment.commitmentNumber})`,
              notes: commitmentFormData.notes || 'تم إنشاء وتوثيق التزام احترام النظام الداخلي',
              recordedBy: commitmentFormData.recordedBy || 'إدارة المركز',
            };
            return {
              ...v,
              actionTaken: v.actionTaken.includes('التزام')
                ? v.actionTaken
                : 'تحرير التزام باحترام النظام الداخلي',
              status: v.status === 'جديدة' ? 'قيد المعالجة' : v.status,
              actionHistory: [newLog, ...(v.actionHistory || [])],
              lastFollowUpDate: commitmentFormData.date,
              updatedAt: new Date().toISOString(),
            };
          }
          return v;
        })
      );
    }

    setIsCommitmentModalOpen(false);
    setToastMessage(`تم إنشاء وثيقة الالتزام برقم (${newCommitment.commitmentNumber}) بنجاح للمتعلم: ${learner.arabicName}`);
    setTimeout(() => setToastMessage(null), 4000);

    if (andPrint) {
      setViewingCommitmentForPrint(newCommitment);
    }
  };

  // Update Existing Commitment (follow-up notes & status)
  const handleUpdateCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommitmentRecord || !setCommitments) return;

    setCommitments((prev) =>
      prev.map((c) => {
        if (c.id === editingCommitmentRecord.id) {
          return {
            ...c,
            status: commitmentFormData.status,
            notes: commitmentFormData.notes.trim() || undefined,
            text: commitmentFormData.text.trim() || c.text,
            guardianName: commitmentFormData.guardianName.trim() || c.guardianName,
            guardianPhone: commitmentFormData.guardianPhone.trim() || c.guardianPhone,
            guardianCin: commitmentFormData.guardianCin.trim() || c.guardianCin,
            lastFollowUpDate: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );

    setEditingCommitmentRecord(null);
    setToastMessage(`تم تحديث بيانات ومتابعة الالتزام (${editingCommitmentRecord.commitmentNumber}) بنجاح.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Delete Commitment
  const handleConfirmDeleteCommitment = () => {
    if (!deletingCommitmentRecord) return;
    openConfirm(
      'تأكيد حذف الالتزام',
      `هل أنت متأكد من أنك تريد حذف وثيقة الالتزام رقم (${deletingCommitmentRecord.commitmentNumber}) نهائياً؟`,
      () => executeDeleteCommitment(),
      'danger'
    );
  };

  const executeDeleteCommitment = () => {
    if (!deletingCommitmentRecord || !setCommitments) return;
    setCommitments((prev) => prev.filter((c) => c.id !== deletingCommitmentRecord.id));
    setToastMessage(`تم حذف وثيقة الالتزام (${deletingCommitmentRecord.commitmentNumber}) من السجل.`);
    setDeletingCommitmentRecord(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Commitments
  const filteredCommitments = useMemo(() => {
    return commitments.filter((c) => {
      if (commitmentStatusFilter !== 'all' && c.status !== commitmentStatusFilter) return false;
      if (commitmentClassFilter !== 'all' && c.className !== commitmentClassFilter) return false;
      if (commitmentStreamFilter !== 'all' && c.stream !== commitmentStreamFilter) return false;
      if (commitmentStartDate && c.date < commitmentStartDate) return false;
      if (commitmentEndDate && c.date > commitmentEndDate) return false;
      if (commitmentSearchTerm.trim()) {
        const query = commitmentSearchTerm.trim().toLowerCase();
        const matchesDoc = c.commitmentNumber.toLowerCase().includes(query);
        const matchesName = c.learnerName.toLowerCase().includes(query);
        const matchesReg = c.registrationNumber.toLowerCase().includes(query);
        const matchesVio = c.violationNumber?.toLowerCase().includes(query);
        const matchesGuardian = c.guardianName?.toLowerCase().includes(query);
        if (!matchesDoc && !matchesName && !matchesReg && !matchesVio && !matchesGuardian) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [
    commitments,
    commitmentStatusFilter,
    commitmentClassFilter,
    commitmentStreamFilter,
    commitmentStartDate,
    commitmentEndDate,
    commitmentSearchTerm,
  ]);

  // Filtered Violations
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      // Learner filter
      if (selectedLearnerFilter !== 'all' && v.learnerId !== selectedLearnerFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && v.status !== statusFilter) {
        return false;
      }
      // Class filter
      if (classFilter !== 'all' && v.className !== classFilter) {
        return false;
      }
      // Stream filter
      if (streamFilter !== 'all' && v.stream !== streamFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && v.type !== typeFilter) {
        return false;
      }
      // Date range filter
      if (startDate && v.date < startDate) {
        return false;
      }
      if (endDate && v.date > endDate) {
        return false;
      }
      // Search term (learner name, MASAR, internal reg, violation number, description)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const learner = learnersMap.get(v.learnerId);
        const matchesName = v.learnerName.toLowerCase().includes(query);
        const matchesReg = v.registrationNumber.toLowerCase().includes(query);
        const matchesNum = v.violationNumber.toLowerCase().includes(query);
        const matchesMasar = learner?.masarCode.toLowerCase().includes(query) || false;
        const matchesDesc = v.description.toLowerCase().includes(query);
        const matchesLoc = (v.location || '').toLowerCase().includes(query);
        if (!matchesName && !matchesReg && !matchesNum && !matchesMasar && !matchesDesc && !matchesLoc) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [
    violations, 
    selectedLearnerFilter, 
    statusFilter, 
    classFilter, 
    streamFilter, 
    typeFilter, 
    startDate, 
    endDate, 
    searchTerm, 
    learnersMap
  ]);

  // Statistics KPI - Exact 7 indicators as required by user prompt
  const stats = useMemo(() => {
    const total = violations.length;
    let newCount = 0;
    let inProgressCount = 0;
    let writtenWarningsCount = 0;
    let guardianSummonsCount = 0;
    let closedCount = 0;

    violations.forEach((v) => {
      if (v.status === 'جديدة') newCount++;
      else if (v.status === 'قيد المعالجة') inProgressCount++;
      else if (v.status === 'أُغلقت') closedCount++;

      // Written warnings count
      if (
        (v.actionTaken && v.actionTaken.includes('إنذار كتابي')) ||
        v.actionHistory?.some((h) => h.action.includes('إنذار كتابي'))
      ) {
        writtenWarningsCount++;
      }

      // Guardian summons count
      if (
        (v.actionTaken && v.actionTaken.includes('استدعاء ولي الأمر')) ||
        v.actionHistory?.some((h) => h.action.includes('استدعاء ولي الأمر'))
      ) {
        guardianSummonsCount++;
      }
    });

    const commitmentsCount = commitments.length;

    return {
      total,
      newCount,
      inProgressCount,
      resolvedCount: violations.filter((v) => v.status === 'تمت المعالجة').length,
      writtenWarningsCount,
      commitmentsCount,
      guardianSummonsCount,
      closedCount,
    };
  }, [violations, commitments]);

  // Helper for Commitment Status Badge
  const getCommitmentStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case 'محرر':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>محرر</span>
          </span>
        );
      case 'قيد المتابعة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>قيد المتابعة</span>
          </span>
        );
      case 'تمت المتابعة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>تمت المتابعة</span>
          </span>
        );
      case 'مغلق':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span>مغلق</span>
          </span>
        );
    }
  };

  // Reset Filters Helper
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setClassFilter('all');
    setStreamFilter('all');
    setTypeFilter('all');
    setSelectedLearnerFilter('all');
    setStartDate('');
    setEndDate('');
    if (onClearInitialLearner) onClearInitialLearner();
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: ViolationStatus) => {
    switch (status) {
      case 'جديدة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>جديدة</span>
          </span>
        );
      case 'قيد المعالجة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>قيد المعالجة</span>
          </span>
        );
      case 'تمت المعالجة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>تمت المعالجة</span>
          </span>
        );
      case 'أُغلقت':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>أُغلقت</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmLabel="نعم، متأكد"
        cancelLabel="إلغاء"
      />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print p-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-between transition-all animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white hover:opacity-80 p-1">
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tabs Switcher */}
      <div className="no-print flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          onClick={() => setActiveSubTab('violations')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'violations'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>سجل وتدبير المخالفات</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            {violations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('commitments')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'commitments'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-500" />
          <span>سجل الالتزام باحترام النظام الداخلي</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            {commitments.length}
          </span>
        </button>
      </div>

      {/* Screen Header & Top Actions */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold border border-rose-200 dark:border-rose-900">
              {activeSubTab === 'violations' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {activeSubTab === 'violations' ? 'تدبير المخالفات والإجراءات الإدارية' : 'سجل وتتبع وثائق الالتزام باحترام النظام الداخلي'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {settings.schoolName} · {activeSubTab === 'violations' 
              ? 'تتبع السلوك والانضباط المدرسي والإجراءات الإدارية المتخذة والربط بملف كل متعلم.' 
              : 'توثيق وتصدير وثائق الالتزام ومتابعة سلوك المتعلمين والتواصل مع أولياء الأمور.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Create Commitment Button */}
          <button
            onClick={() => handleOpenCreateCommitmentModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
            title="إنشاء التزام باحترام النظام الداخلي للمركز وتصديره PDF"
          >
            <FileText className="w-4 h-4" />
            <span>إنشاء التزام باحترام النظام الداخلي</span>
          </button>

          {/* Add New Violation Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مخالفة جديدة</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={() => {
              if (activeSubTab === 'commitments') {
                exportCommitmentsToExcel(filteredCommitments);
              } else {
                exportViolationsToExcel(filteredViolations);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all"
            title="تصدير السجل المفلتر إلى ملف Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={() => {
              if (activeSubTab === 'commitments') {
                exportCommitmentsToCsv(filteredCommitments);
              } else {
                exportViolationsToCsv(filteredViolations);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all"
            title="تصدير السجل المفلتر إلى ملف CSV"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>

          {/* Print Overall Report */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
            title="طباعة اللائحة الإجمالية أو حفظها PDF"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary - 7 Indicators Required Directly From DB */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* 1. Total Violations */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي المخالفات</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{stats.total}</p>
          <div className="mt-1 text-[10px] text-slate-400">سجل المخالفات الكلي</div>
        </div>

        {/* 2. New Violations */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">مخالفات جديدة</p>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{stats.newCount}</p>
          <div className="mt-1 text-[10px] text-rose-500 font-medium">بحاجة لمعالجة</div>
        </div>

        {/* 3. In Progress */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">قيد المعالجة</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{stats.inProgressCount}</p>
          <div className="mt-1 text-[10px] text-amber-500 font-medium">قيد المتابعة</div>
        </div>

        {/* 4. Written Warnings */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-orange-200 dark:border-orange-900/60 shadow-xs">
          <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400">إنذارات كتابية</p>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 tabular-nums">{stats.writtenWarningsCount}</p>
          <div className="mt-1 text-[10px] text-orange-500 font-medium">إنذار كتابي موثق</div>
        </div>

        {/* 5. Commitments Generated */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">التزامات محررة</p>
            <Award className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">{stats.commitmentsCount}</p>
          <div className="mt-1 text-[10px] text-indigo-500 font-medium">نظام داخلي معتمد</div>
        </div>

        {/* 6. Guardian Summons */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-xs">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">استدعاءات الأولياء</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">{stats.guardianSummonsCount}</p>
          <div className="mt-1 text-[10px] text-purple-500 font-medium">جلسات مع الأولياء</div>
        </div>

        {/* 7. Closed Files */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">ملفات مغلقة</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 tabular-nums">{stats.closedCount}</p>
          <div className="mt-1 text-[10px] text-slate-400">مكتملة ومؤرشفة</div>
        </div>
      </div>

      {/* SUB-TAB 1: سجل وتدبير المخالفات */}
      {activeSubTab === 'violations' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، رقم المخالفة، مسار، أو الرقم الداخلي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">جميع الأقسام</option>
              {settings.classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Stream Filter */}
          <div>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">جميع الشعب</option>
              {settings.streams.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Violation Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">جميع أنواع المخالفات</option>
              {violationTypes.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">جميع الحالات</option>
              <option value="جديدة">جديدة</option>
              <option value="قيد المعالجة">قيد المعالجة</option>
              <option value="تمت المعالجة">تمت المعالجة</option>
              <option value="أُغلقت">أُغلقت</option>
            </select>
          </div>

        </div>

        {/* Date Range and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-400">الفترة الزمنية:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs"
              />
            </div>
            {selectedLearnerFilter !== 'all' && (
              <span className="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 font-bold">
                مفلتر حسب متعلم محدد: {learnersMap.get(selectedLearnerFilter)?.arabicName}
              </span>
            )}
          </div>

          <button
            onClick={handleResetFilters}
            className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium hover:underline flex items-center gap-1"
          >
            <span>إعادة ضبط المرشحات</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header for window.print() */}
      <div className="print-only mb-6 space-y-4">
        <div className="text-center border-b border-slate-400 pb-4">
          <p className="text-xs text-slate-600">المملكة المغربية · وزارة التربية الوطنية والتعليم الأولي والرياضة</p>
          <p className="text-xs text-slate-600">الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة · المديرية الإقليمية الصخيرات تمارة</p>
          <p className="text-base font-bold text-slate-900 mt-1">{settings.schoolName}</p>
          <h1 className="text-xl font-black mt-1">تقرير تتبع المخالفات التأديبية والإجراءات التربوية</h1>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">السنة الدراسية {settings.schoolYear}</p>
          <div className="text-xs font-medium text-slate-800 mt-2 p-1.5 bg-slate-100 rounded border border-slate-300 inline-block">
            {classFilter !== 'all' ? `القسم: ${classFilter}` : 'جميع الأقسام'} 
            {streamFilter !== 'all' ? ` · الشعبة: ${streamFilter}` : ' · جميع الشعب'}
            {typeFilter !== 'all' ? ` · النوع: ${typeFilter}` : ''}
            {statusFilter !== 'all' ? ` · الحالة: ${statusFilter}` : ''}
            {startDate ? ` · من: ${startDate}` : ''}
            {endDate ? ` · إلى: ${endDate}` : ''}
          </div>
        </div>

        {/* Printable Summary */}
        <div className="flex items-center justify-around p-2.5 bg-slate-100 border border-slate-400 rounded-lg text-xs font-bold text-slate-900">
          <span>إجمالي المخالفات المسجلة: {stats.total}</span>
          <span>جديدة: {stats.newCount}</span>
          <span>قيد المعالجة: {stats.inProgressCount}</span>
          <span>تمت المعالجة: {stats.resolvedCount}</span>
          <span>أُغلقت: {stats.closedCount}</span>
        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">رقم المخالفة</th>
                <th className="p-3">المتعلم (الاسم ورقم التسجيل)</th>
                <th className="p-3">القسم والشعبة</th>
                <th className="p-3">التاريخ والتوقيت والمكان</th>
                <th className="p-3">نوع المخالفة</th>
                <th className="p-3">الإجراء المتخذ</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 no-print text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredViolations.length > 0 ? (
                filteredViolations.map((v) => {
                  const learner = learnersMap.get(v.learnerId);

                  return (
                    <tr 
                      key={v.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Violation Number */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                          {v.violationNumber}
                        </span>
                      </td>

                      {/* Learner Info */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {v.learnerName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">{v.registrationNumber}</span>
                          {learner?.masarCode && (
                            <span>مسار: {learner.masarCode}</span>
                          )}
                        </div>
                      </td>

                      {/* Class and Stream */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {v.className}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {v.stream}
                        </div>
                      </td>

                      {/* Date, Time, Location */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">
                          {v.date}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {v.time && <span>{v.time}</span>}
                          {v.location && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="line-clamp-1 max-w-[120px]">{v.location}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Violation Type */}
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {v.type}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1" title={v.description}>
                          {v.description}
                        </p>
                      </td>

                      {/* Action Taken */}
                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {v.actionTaken}
                        </div>
                        {v.recordedBy && (
                          <div className="text-[11px] text-slate-400">
                            المسجل: {v.recordedBy}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        {getStatusBadge(v.status)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 no-print whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* View details & timeline */}
                          <button
                            onClick={() => setViewingViolation(v)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="عرض تفاصيل المخالفة والمتابعات الإدارية"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Create Linked Commitment */}
                          <button
                            onClick={() => handleOpenCreateCommitmentModal(v.learnerId, v.id)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                            title="تحرير وتصدير التزام باحترام النظام الداخلي مرتبط بهذه المخالفة"
                          >
                            <Award className="w-4 h-4" />
                          </button>

                          {/* Print individual notice */}
                          <button
                            onClick={() => setPrintNoticeViolation(v)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="طباعة إشعار رسمي بمخالفة فردية لولي الأمر والإدارة"
                          >
                            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </button>

                          {/* Edit violation */}
                          <button
                            onClick={() => handleOpenEditModal(v)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="تعديل بيانات المخالفة"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeletingViolation(v)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="حذف المخالفة"
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
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold">لا توجد مخالفات مسجلة ضمن المعايير المحددة</p>
                    <p className="text-xs mt-1">يمكنك تسجيل مخالفة جديدة بالضغط على زر «تسجيل مخالفة جديدة» أعلاه.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

        </div>
      )}

      {/* SUB-TAB 2: سجل وثائق وتتبع الالتزام باحترام النظام الداخلي */}
      {activeSubTab === 'commitments' && (
        <div className="space-y-4">
          {/* Filter Bar for Commitments */}
          <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="البحث برقم الالتزام، اسم المتعلم، رقم التسجيل، أو ولي الأمر..."
                  value={commitmentSearchTerm}
                  onChange={(e) => setCommitmentSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={commitmentStatusFilter}
                  onChange={(e) => setCommitmentStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">جميع حالات المتابعة</option>
                  <option value="محرر">محرر</option>
                  <option value="قيد المتابعة">قيد المتابعة</option>
                  <option value="تمت المتابعة">تمت المتابعة</option>
                  <option value="مغلق">مغلق</option>
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={commitmentClassFilter}
                  onChange={(e) => setCommitmentClassFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">جميع الأقسام</option>
                  {settings.classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Stream Filter */}
              <div>
                <select
                  value={commitmentStreamFilter}
                  onChange={(e) => setCommitmentStreamFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">جميع الشُعب / الحِرف</option>
                  {settings.streams.map((stm) => (
                    <option key={stm} value={stm}>{stm}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Date Range & Clear */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>الفترة من:</span>
                <input
                  type="date"
                  value={commitmentStartDate}
                  onChange={(e) => setCommitmentStartDate(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <span>إلى:</span>
                <input
                  type="date"
                  value={commitmentEndDate}
                  onChange={(e) => setCommitmentEndDate(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  الالتزامات المسجلة: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{filteredCommitments.length}</strong> وثيقة
                </span>

                {(commitmentSearchTerm || commitmentStatusFilter !== 'all' || commitmentClassFilter !== 'all' || commitmentStreamFilter !== 'all' || commitmentStartDate || commitmentEndDate) && (
                  <button
                    onClick={() => {
                      setCommitmentSearchTerm('');
                      setCommitmentStatusFilter('all');
                      setCommitmentClassFilter('all');
                      setCommitmentStreamFilter('all');
                      setCommitmentStartDate('');
                      setCommitmentEndDate('');
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>إعادة الضبط</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Commitments Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="p-3 whitespace-nowrap">رقم الوثيقة</th>
                    <th className="p-3 whitespace-nowrap">المتعلم(ة)</th>
                    <th className="p-3 whitespace-nowrap">القسم / الشعبة</th>
                    <th className="p-3 whitespace-nowrap">تاريخ التحرير</th>
                    <th className="p-3 whitespace-nowrap">المخالفة المرتبطة</th>
                    <th className="p-3 whitespace-nowrap">ولي الأمر / الهاتف</th>
                    <th className="p-3 whitespace-nowrap">حالة المتابعة</th>
                    <th className="p-3 whitespace-nowrap">ملاحظات التتبع</th>
                    <th className="p-3 no-print whitespace-nowrap text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {filteredCommitments.length > 0 ? (
                    filteredCommitments.map((c) => (
                      <tr 
                        key={c.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Doc Number */}
                        <td className="p-3 whitespace-nowrap font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{c.commitmentNumber}</span>
                          </div>
                        </td>

                        {/* Learner Info */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {c.learnerName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ر.د: {c.registrationNumber} {c.masarCode ? `· مسار: ${c.masarCode}` : ''}
                          </div>
                        </td>

                        {/* Class / Stream */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {c.className}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {c.stream}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="p-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                          {c.date}
                        </td>

                        {/* Linked Violation */}
                        <td className="p-3 whitespace-nowrap">
                          {c.violationNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <ShieldAlert className="w-3 h-3 text-rose-500" />
                              <span>{c.violationNumber}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              <span>التزام وقائي مباشر</span>
                            </span>
                          )}
                        </td>

                        {/* Guardian */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {c.guardianName || '-'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {c.guardianPhone || (c.guardianCin ? `ب.ت.و: ${c.guardianCin}` : '')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3 whitespace-nowrap">
                          {getCommitmentStatusBadge(c.status)}
                        </td>

                        {/* Notes */}
                        <td className="p-3 max-w-xs">
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate" title={c.notes}>
                            {c.notes || '-'}
                          </div>
                          {c.lastFollowUpDate && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              آخر متابعة: {c.lastFollowUpDate}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 no-print whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            
                            {/* Print / View A4 PDF */}
                            <button
                              onClick={() => setViewingCommitmentForPrint(c)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                              title="معاينة وتصدير وثيقة الالتزام بصيغة A4 PDF"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Edit / Follow-up */}
                            <button
                              onClick={() => handleOpenEditCommitmentModal(c)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="تعديل وثيقة الالتزام وتحديث حالة المتابعة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeletingCommitmentRecord(c)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="حذف وثيقة الالتزام"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-bold">لا توجد وثائق التزام مسجلة ضمن المعايير المحددة</p>
                        <p className="text-xs mt-1">يمكنك إنشاء وثيقة التزام جديدة بالضغط على زر «إنشاء التزام باحترام النظام الداخلي» أعلاه.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: تسجيل مخالفة جديدة (Add Violation Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 animate-fadeIn space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold border border-rose-200 dark:border-rose-900">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    تسجيل مخالفة انضباطية جديدة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    توثيق المخالفة والإجراء المتخذ مع حفظ السجل الإداري
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewViolation} className="space-y-4">
              
              {/* Row 1: Number & Learner Picker */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Auto Generated Violation Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم المخالفة (تلقائي فريد)
                  </label>
                  <input
                    type="text"
                    value={formData.violationNumber}
                    readOnly
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                {/* Learner Dropdown Selector */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المتعلم(ة) المعني <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.learnerId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, learnerId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-rose-500"
                    required
                  >
                    <option value="">-- اختر المتعلم من اللائحة --</option>
                    {learners.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.arabicName} ({l.registrationNumber} - {l.className} - {l.stream})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto-filled Learner Details Badge */}
              {formData.learnerId && learnersMap.get(formData.learnerId) && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">الرقم الداخلي:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {learnersMap.get(formData.learnerId)?.registrationNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">رقم مسار:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {learnersMap.get(formData.learnerId)?.masarCode || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">القسم:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {learnersMap.get(formData.learnerId)?.className}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">الشعبة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {learnersMap.get(formData.learnerId)?.stream}
                    </span>
                  </div>
                </div>
              )}

              {/* Row 2: Date, Time, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ المخالفة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وقت / توقيت الحصة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 10:30 أو حصة 09:00–11:00"
                    value={formData.time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مكان حدوث المخالفة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: قاعة المعلوميات، ساحة المؤسسة، ورشة الحلاقة..."
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Row 3: Violation Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع المخالفة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-rose-500"
                    required
                  >
                    {violationTypes.map((vt) => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>

                {formData.type === 'مخالفة أخرى' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      حدد نوع المخالفة بدقة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="اكتب نوع المخالفة..."
                      value={formData.otherType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, otherType: e.target.value }))}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Row 4: Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  حيثيات وتفاصيل المخالفة <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="وصف دقيق لما حدث أثناء الواقعة وتصرفات المتعلم..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
                  required
                />
              </div>

              {/* Row 5: Action Taken & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الإجراء الإداري / التربوي المتخذ
                  </label>
                  <select
                    value={formData.actionTaken}
                    onChange={(e) => setFormData((prev) => ({ ...prev, actionTaken: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-rose-500"
                  >
                    <option value="إنذار شفهي وتنبيه">إنذار شفهي وتنبيه</option>
                    <option value="تنبيه كتابي وتعهد بعدم التكرار">تنبيه كتابي وتعهد بعدم التكرار</option>
                    <option value="إنذار كتابي">إنذار كتابي</option>
                    <option value="استدعاء ولي الأمر للحضور للمؤسسة">استدعاء ولي الأمر للحضور للمؤسسة</option>
                    <option value="التزام كتابي مصادق عليه">التزام كتابي مصادق عليه</option>
                    <option value="توقيف مؤقت عن ورشة التكوين / الأنشطة">توقيف مؤقت عن ورشة التكوين / الأنشطة</option>
                    <option value="إحالة على مجلس الانضباط">إحالة على مجلس الانضباط</option>
                    <option value="تعويض وإصلاح الأضرار المادية">تعويض وإصلاح الأضرار المادية</option>
                    <option value="تدبير تربوي بديل (خدمة للصالح العام للمركز)">تدبير تربوي بديل (خدمة للصالح العام للمركز)</option>
                    <option value="بدون إجراء حالياً / قيد البحث والاستماع">بدون إجراء حالياً / قيد البحث والاستماع</option>
                    <option value="أخرى">إجراء آخر يُذكر...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حالة المخالفة
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ViolationStatus }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500"
                  >
                    <option value="جديدة">جديدة</option>
                    <option value="قيد المعالجة">قيد المعالجة</option>
                    <option value="تمت المعالجة">تمت المعالجة</option>
                    <option value="أُغلقت">أُغلقت</option>
                  </select>
                </div>
              </div>

              {formData.actionTaken === 'أخرى' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حدد الإجراء المتخذ بدقة
                  </label>
                  <input
                    type="text"
                    placeholder="اكتب الإجراء المتخذ..."
                    value={formData.otherAction}
                    onChange={(e) => setFormData((prev) => ({ ...prev, otherAction: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              )}

              {/* Row 6: Recorded By & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    القائم بالتسجيل / المسؤول
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ذ. عبد الرحيم، الحارس العام، المؤطر..."
                    value={formData.recordedBy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recordedBy: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات إضافية
                  </label>
                  <input
                    type="text"
                    placeholder="أي معطيات تكميلية..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ المخالفة</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: تعديل بيانات المخالفة (Edit Violation Modal) */}
      {editingViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 animate-fadeIn space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200 dark:border-emerald-900">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    تعديل بيانات المخالفة: {editingViolation.violationNumber}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تعديل الوقائع أو الإجراء المتخذ للمتعلم: {editingViolation.learnerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingViolation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateViolation} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ المخالفة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    التوقيت
                  </label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مكان المخالفة
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع المخالفة
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  {violationTypes.map((vt) => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                  <option value="مخالفة أخرى">مخالفة أخرى...</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  وصف وتفاصيل المخالفة <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الإجراء المتخذ
                  </label>
                  <input
                    type="text"
                    value={formData.actionTaken}
                    onChange={(e) => setFormData((prev) => ({ ...prev, actionTaken: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الحالة
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ViolationStatus }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="جديدة">جديدة</option>
                    <option value="قيد المعالجة">قيد المعالجة</option>
                    <option value="تمت المعالجة">تمت المعالجة</option>
                    <option value="أُغلقت">أُغلقت</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    القائم بالتسجيل / المسؤول
                  </label>
                  <input
                    type="text"
                    value={formData.recordedBy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recordedBy: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingViolation(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تحديث وحفظ التعديلات</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: تفاصيل المخالفة وسجل المتابعات (View & Action Log Modal) */}
      {viewingViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold border border-rose-200 dark:border-rose-900">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {viewingViolation.violationNumber}
                    </span>
                    {getStatusBadge(viewingViolation.status)}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    ملف متابعة المخالفة: {viewingViolation.learnerName}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setViewingViolation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar Buttons */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">تغيير حالة المعالجة:</span>
              <div className="flex items-center gap-1.5">
                {(['جديدة', 'قيد المعالجة', 'تمت المعالجة', 'أُغلقت'] as ViolationStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(viewingViolation.id, st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      viewingViolation.status === st
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Violation Facts Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">رقم التسجيل:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {viewingViolation.registrationNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">القسم والشعبة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {viewingViolation.className} · {viewingViolation.stream}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">التاريخ والتوقيت:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {viewingViolation.date} {viewingViolation.time ? `(${viewingViolation.time})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">مكان الحدوث:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingViolation.location || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">نوع المخالفة:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {viewingViolation.type}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">القائم بالتسجيل:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingViolation.recordedBy || '-'}
                </span>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">تفاصيل الحادثة:</h4>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {viewingViolation.description}
              </div>
            </div>

            {/* Current Action Taken */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">الإجراء الأولي المتخذ:</h4>
              <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-800 dark:text-rose-300">
                {viewingViolation.actionTaken}
              </div>
            </div>

            {/* Action History / Timeline */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>سجل المتابعات والإجراءات الإدارية (التسلسل الزمني):</span>
              </h4>

              <div className="space-y-2">
                {viewingViolation.actionHistory && viewingViolation.actionHistory.length > 0 ? (
                  viewingViolation.actionHistory.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{item.action}</span>
                          <span className="text-[11px] font-mono text-slate-400">{item.date}</span>
                        </div>
                        {item.notes && (
                          <p className="text-slate-600 dark:text-slate-400 text-[11px]">{item.notes}</p>
                        )}
                        {item.recordedBy && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                            المسؤول: {item.recordedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-2">لا توجد متابعات إضافية مسجلة بعد.</p>
                )}
              </div>

              {/* Add New Action Entry */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  + إضافة إجراء أو مستجد جديد في المتابعة:
                </span>
                <input
                  type="text"
                  placeholder="نص الإجراء (مثال: تم استقبال ولي الأمر وتوقيع التزام...)"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ملاحظات تفصيلية..."
                    value={newActionNotes}
                    onChange={(e) => setNewActionNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="المسؤول عن الإجراء (مثال: الحراسة العامة)"
                    value={newActionRecordedBy}
                    onChange={(e) => setNewActionRecordedBy(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleAddActionLog(viewingViolation.id)}
                    disabled={!newActionText.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                  >
                    تسجيل الإجراء الجديد
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPrintNoticeViolation(viewingViolation);
                    setViewingViolation(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الإشعار الفردي</span>
                </button>

                <button
                  onClick={() => {
                    const lId = viewingViolation.learnerId;
                    const vId = viewingViolation.id;
                    setViewingViolation(null);
                    handleOpenCreateCommitmentModal(lId, vId);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  title="إنشاء وتصدير التزام باحترام النظام الداخلي لهذا المتعلم"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>تحرير التزام بالنظام الداخلي</span>
                </button>
              </div>

              <button
                onClick={() => setViewingViolation(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: تقرير إشعار بمخالفة فردي (Printable Individual Official Report Modal) */}
      {printNoticeViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 animate-fadeIn space-y-6">
            
            {/* Action Bar (Hidden during print) */}
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm">معاينة الإشعار الفردي للطباعة على ورقة A4</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setPrintNoticeViolation(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Moroccan Institutional Header */}
            <div className="text-center space-y-1 border-b-2 border-slate-800 pb-4">
              <p className="text-xs font-bold text-slate-700">المملكة المغربية</p>
              <p className="text-xs font-bold text-slate-700">وزارة التربية الوطنية والتعليم الأولي والرياضة</p>
              <p className="text-xs text-slate-600">الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة</p>
              <p className="text-xs text-slate-600">المديرية الإقليمية الصخيرات تمارة</p>
              <h2 className="text-base font-black text-slate-900 mt-1">{settings.schoolName}</h2>
              <div className="mt-3 py-1.5 px-4 bg-slate-100 rounded-lg inline-block border border-slate-400">
                <h1 className="text-sm font-black tracking-wide">
                  إشعار وتقرير مخالفة انضباطية رقم: {printNoticeViolation.violationNumber}
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">السنة الدراسية: {settings.schoolYear}</p>
            </div>

            {/* Student & Violation Information Table */}
            <div className="border border-slate-400 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-100 p-2 font-bold border-b border-slate-400">
                أولاً: البيانات الإدارية للمتعلم(ة)
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
                <div>
                  <span className="text-slate-500 block">الاسم الكامل:</span>
                  <span className="font-bold text-slate-900">{printNoticeViolation.learnerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الرقم الداخلي:</span>
                  <span className="font-mono font-bold text-slate-900">{printNoticeViolation.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">القسم:</span>
                  <span className="font-bold text-slate-900">{printNoticeViolation.className}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الشعبة / الحرفة:</span>
                  <span className="font-bold text-slate-900">{printNoticeViolation.stream}</span>
                </div>
              </div>

              <div className="bg-slate-100 p-2 font-bold border-t border-b border-slate-400">
                ثانياً: تفاصيل وحيثيات المخالفة
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white">
                <div>
                  <span className="text-slate-500 block">تاريخ الواقعة:</span>
                  <span className="font-mono font-bold text-slate-900">{printNoticeViolation.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">التوقيت:</span>
                  <span className="font-mono font-bold text-slate-900">{printNoticeViolation.time || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">مكان الحدوث:</span>
                  <span className="font-bold text-slate-900">{printNoticeViolation.location || '-'}</span>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-slate-500 block">نوع المخالفة:</span>
                  <span className="font-bold text-rose-700">{printNoticeViolation.type}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-300">
                <span className="text-slate-600 font-bold block mb-1">وصف الحادثة بالتفصيل:</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {printNoticeViolation.description}
                </p>
              </div>

              <div className="bg-slate-100 p-2 font-bold border-t border-b border-slate-400">
                ثالثاً: الإجراء الإداري / التربوي المعتمد
              </div>
              <div className="p-3 bg-white space-y-2">
                <div className="font-bold text-slate-900">
                  {printNoticeViolation.actionTaken}
                </div>
                {printNoticeViolation.notes && (
                  <p className="text-slate-600 text-[11px]">
                    ملاحظات: {printNoticeViolation.notes}
                  </p>
                )}
                <div className="text-[11px] text-slate-500">
                  المسؤول المسجل: {printNoticeViolation.recordedBy || 'إدارة المركز'}
                </div>
              </div>
            </div>

            {/* Official Administrative Record Summary (No Signatures) */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700 mt-4">
              <div>
                <span className="font-bold text-slate-900">المسؤول المسجل: </span>
                <span>{printNoticeViolation.recordedBy || 'إدارة المركز'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">حالة الإجراء: </span>
                <span className="font-bold text-emerald-800">{printNoticeViolation.status}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">تاريخ التوثيق: </span>
                <span className="font-mono">{printNoticeViolation.date}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center text-[10px] text-slate-500 border-t border-slate-200 pt-3">
              مركز الفرصة الثانية - الجيل الجديد زرارة · وثيقة إدارية رسمية معتمدة · حرر بتاريخ {new Date().toISOString().split('T')[0]}
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: تأكيد حذف مخالفة (Delete Confirmation Modal) */}
      {deletingViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn space-y-4">
            
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد حذف المخالفة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                هل أنت متأكد من حذف المخالفة رقم ({deletingViolation.violationNumber}) للمتعلم ({deletingViolation.learnerName}) نهائياً؟
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 mt-3 text-right">
                <p>نوع المخالفة: {deletingViolation.type}</p>
                <p>التاريخ: {deletingViolation.date}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingViolation(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
              >
                نعم، احذف المخالفة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 6: إنشاء وتخصيص التزام باحترام النظام الداخلي للمركز (Create Commitment Modal) */}
      {isCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 animate-fadeIn space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-900">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    إنشاء التزام باحترام النظام الداخلي للمركز
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تحرير وتوثيق ميثاق السلوك والانضباط للمتعلم وولي أمره وتصديره إلى صيغة PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCommitmentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSaveCommitment(false, e)} className="space-y-4">
              
              {/* Row 1: Document Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الوثيقة (تلقائي فريد)
                  </label>
                  <input
                    type="text"
                    value={commitmentFormData.commitmentNumber}
                    readOnly
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ التحرير <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={commitmentFormData.date}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حالة الالتزام
                  </label>
                  <select
                    value={commitmentFormData.status}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, status: e.target.value as CommitmentStatus }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="محرر">محرر (جاهز للتوقيع والتنفيذ)</option>
                    <option value="قيد المتابعة">قيد المتابعة الإدارية والتربوية</option>
                    <option value="تمت المتابعة">تمت المتابعة وتأكيد الانضباط</option>
                    <option value="مغلق">مغلق (أُرشف)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Learner Selector & Linked Violation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Learner */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المتعلم(ة) المعني بالالتزام <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={commitmentFormData.learnerId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const l = learnersMap.get(selId);
                      setCommitmentFormData((prev) => ({
                        ...prev,
                        learnerId: selId,
                        guardianName: l ? `ولي أمر ${l.arabicName}` : prev.guardianName,
                        guardianPhone: l?.parentPhone || prev.guardianPhone,
                        guardianCin: prev.guardianCin,
                        guardianRelation: prev.guardianRelation,
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- اختر المتعلم من القائمة --</option>
                    {learners.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.arabicName} ({l.registrationNumber} - {l.className} - {l.stream})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Linked Violation Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الربط بمخالفة مسجلة (اختياري)
                  </label>
                  <select
                    value={commitmentFormData.violationId}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, violationId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">بدون ربط (التزام وقائي / عام عند التسجيل أو إعادة الإدماج)</option>
                    {violations
                      .filter((v) => !commitmentFormData.learnerId || v.learnerId === commitmentFormData.learnerId)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          مخالفة {v.violationNumber}: {v.type} ({v.date} - {v.learnerName})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Selected Learner Details Card */}
              {commitmentFormData.learnerId && (
                (() => {
                  const l = learnersMap.get(commitmentFormData.learnerId);
                  if (!l) return null;
                  return (
                    <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-indigo-950 dark:text-indigo-200">
                      <div>
                        <span className="text-indigo-700 dark:text-indigo-400 block font-semibold">الرقم الداخلي:</span>
                        <span className="font-mono font-bold">{l.registrationNumber}</span>
                      </div>
                      <div>
                        <span className="text-indigo-700 dark:text-indigo-400 block font-semibold">رقم مسار:</span>
                        <span className="font-mono font-bold">{l.masarCode || 'غير مسجل'}</span>
                      </div>
                      <div>
                        <span className="text-indigo-700 dark:text-indigo-400 block font-semibold">القسم:</span>
                        <span className="font-bold">{l.className}</span>
                      </div>
                      <div>
                        <span className="text-indigo-700 dark:text-indigo-400 block font-semibold">الشعبة / الحرفة:</span>
                        <span className="font-bold">{l.stream}</span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Row 3: Guardian Details */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>بيانات ولي الأمر / المسؤول القانوني:</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      اسم ولي الأمر
                    </label>
                    <input
                      type="text"
                      placeholder="الاسم الكامل لولي الأمر..."
                      value={commitmentFormData.guardianName}
                      onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianName: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      رقم البطاقة الوطنية (CIN)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: AB123456"
                      value={commitmentFormData.guardianCin}
                      onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianCin: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      placeholder="06XXXXXXXX"
                      value={commitmentFormData.guardianPhone}
                      onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianPhone: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      صلة القرابة
                    </label>
                    <select
                      value={commitmentFormData.guardianRelation}
                      onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianRelation: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="الأب">الأب</option>
                      <option value="الأم">الأم</option>
                      <option value="الولي الشرعي">الولي الشرعي / الكفيل</option>
                      <option value="الأخ">الأخ</option>
                      <option value="الأخت">الأخت</option>
                      <option value="العم / الخال">العم / الخال</option>
                      <option value="آخر">آخر</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Editable Commitment Text (Default Moroccan Institutional Text) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    نص ومقتضيات الالتزام باحترام النظام الداخلي للمركز <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCommitmentFormData((prev) => ({ ...prev, text: DEFAULT_COMMITMENT_TEXT }))}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                  >
                    استعادة النص النموذجي المعتمد
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={commitmentFormData.text}
                  onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, text: e.target.value }))}
                  className="w-full px-3 py-2 text-xs leading-relaxed rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-y font-mono"
                  placeholder="نص بنود الالتزام..."
                  required
                />
                <p className="text-[11px] text-slate-400">
                  يمكن تعديل نص الالتزام حسب خصوصية كل حالة أو إضافة شروط خاصة تم الاتفاق عليها مع ولي الأمر.
                </p>
              </div>

              {/* Row 5: Administrative Officer & Follow-up Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المسؤول المحرر / إدارة المركز
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مدير المركز / الحراسة العامة..."
                    value={commitmentFormData.recordedBy}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, recordedBy: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات التتبع الإداري
                  </label>
                  <input
                    type="text"
                    placeholder="ملاحظات حول استقبال ولي الأمر أو شروط المتابعة..."
                    value={commitmentFormData.notes}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCommitmentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all"
                  >
                    حفظ في السجل فقط
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveCommitment(true, e)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>حفظ وتصدير PDF مباشر</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 7: معاينة وتصدير وثيقة الالتزام باحترام النظام الداخلي للمركز بصيغة A4 PDF (Printable Official A4 Preview Modal) */}
      {viewingCommitmentForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] overflow-y-auto p-4 sm:p-8 animate-fadeIn space-y-6">
            
            {/* Top Toolbar (Hidden during print) */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-sm text-slate-900">
                    معاينة وثيقة «الالتزام باحترام النظام الداخلي للمركز» للطباعة على ورقة A4
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  اسم الملف المقترح: <span className="font-mono font-bold text-slate-700">التزام_باحترام_النظام_الداخلي_{viewingCommitmentForPrint.learnerName}_{viewingCommitmentForPrint.date}.pdf</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة / حفظ PDF</span>
                </button>
                <button
                  onClick={() => setViewingCommitmentForPrint(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document A4 Container */}
            <div className="p-4 sm:p-6 bg-white border border-slate-300 rounded-xl space-y-5 text-slate-900 font-arabic print:border-none print:p-0">
              
              {/* Official Moroccan Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-3">
                <div className="flex justify-between items-start text-[11px] leading-tight">
                  <div className="text-right space-y-0.5 font-bold text-slate-800">
                    <p className="text-xs font-black">المملكة المغربية</p>
                    <p>وزارة التربية الوطنية والتعليم الأولي والرياضة</p>
                    <p>الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة</p>
                    <p>المديرية الإقليمية الصخيرات تمارة</p>
                    <p className="font-black text-slate-900 text-xs mt-1">{settings.schoolName}</p>
                  </div>

                  <div className="text-left font-mono text-[11px] space-y-1 text-slate-700">
                    <div className="p-1 px-2.5 bg-slate-100 border border-slate-300 rounded font-bold">
                      رقم الوثيقة: {viewingCommitmentForPrint.commitmentNumber}
                    </div>
                    <p>السنة التكوينية: {settings.schoolYear}</p>
                    <p>حرر بـ: الصخيرات تمارة</p>
                    <p>التاريخ: {viewingCommitmentForPrint.date}</p>
                  </div>
                </div>

                {/* Document Main Title Banner */}
                <div className="mt-4 text-center">
                  <div className="inline-block border-2 border-slate-900 bg-slate-50 px-8 py-2 rounded-lg shadow-xs">
                    <h1 className="text-lg sm:text-xl font-black tracking-wide text-slate-900">
                      الـتـزام بـاحـتـرام الـنـظـام الـداخـلـي لـلـمـركـز
                    </h1>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                      ميثاق السلوك والانضباط المدرسي والتكويني المهني
                    </p>
                  </div>
                </div>
              </div>

              {/* Identity Cards of Learner and Guardian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Learner Card */}
                <div className="border border-slate-400 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-black border-b border-slate-400 text-slate-900 flex items-center justify-between">
                    <span>أولاً: بيانات المتعلم(ة)</span>
                    <span className="font-mono text-[11px] text-slate-600">{viewingCommitmentForPrint.registrationNumber}</span>
                  </div>
                  <div className="p-3 space-y-1.5 bg-white">
                    <div className="flex justify-between">
                      <span className="text-slate-600">الاسم الكامل:</span>
                      <strong className="text-slate-900">{viewingCommitmentForPrint.learnerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">رقم التسجيل الداخلي:</span>
                      <span className="font-mono font-bold text-slate-900">{viewingCommitmentForPrint.registrationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">الرقم الوطني (مسار):</span>
                      <span className="font-mono font-bold text-slate-900">{viewingCommitmentForPrint.masarCode || 'غير مسجل'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">القسم والشعبة:</span>
                      <span className="font-bold text-slate-900">{viewingCommitmentForPrint.className} · {viewingCommitmentForPrint.stream}</span>
                    </div>
                  </div>
                </div>

                {/* Guardian Card */}
                <div className="border border-slate-400 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-black border-b border-slate-400 text-slate-900 flex items-center justify-between">
                    <span>ثانياً: بيانات الولي / المسؤول القانوني</span>
                    <span className="text-[11px] text-slate-600">{viewingCommitmentForPrint.guardianRelation || 'الولي الشرعي'}</span>
                  </div>
                  <div className="p-3 space-y-1.5 bg-white">
                    <div className="flex justify-between">
                      <span className="text-slate-600">اسم ولي الأمر:</span>
                      <strong className="text-slate-900">{viewingCommitmentForPrint.guardianName || '...........................................'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">رقم البطاقة الوطنية (CIN):</span>
                      <span className="font-mono font-bold text-slate-900">{viewingCommitmentForPrint.guardianCin || '.....................'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">رقم الهاتف للتواصل:</span>
                      <span className="font-mono font-bold text-slate-900">{viewingCommitmentForPrint.guardianPhone || '.....................'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">صلة القرابة:</span>
                      <span className="font-bold text-slate-900">{viewingCommitmentForPrint.guardianRelation || 'الولي الشرعي'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Linked Violation Reference (If any) */}
              {viewingCommitmentForPrint.violationNumber && (
                <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-800">مرجع المخالفة الانضباطية المسجلة: </span>
                    <span className="font-mono font-bold text-rose-700">رقم {viewingCommitmentForPrint.violationNumber}</span>
                  </div>
                  <span className="text-[11px] text-rose-600 font-bold">تم تحرير هذا الالتزام كإجراء إداري وتربوي ملزم</span>
                </div>
              )}

              {/* Commitment Clauses Body Text */}
              <div className="border border-slate-400 rounded-lg overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-1.5 font-black border-b border-slate-400 text-slate-900">
                  ثالثاً: مقتضيات وبنود الالتزام المصادق عليها
                </div>
                <div className="p-4 bg-white text-slate-800 leading-relaxed whitespace-pre-wrap text-justify">
                  {viewingCommitmentForPrint.text}
                </div>
              </div>

              {/* Administrative Closing Declaration */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-[11px] text-slate-700 leading-relaxed text-justify">
                <p>
                  <strong>مقتضى تنفيذي:</strong> يُعتبر هذا الالتزام وثيقة إدارية وتربوية رسمية ملزمة للمتعلم(ة) وولي أمره طيلة مسار تكوينه بمركز الفرصة الثانية الجيل الجديد زرارة. ويترتب عن أي إخلال بمقتضياته تطبيق الإجراءات والتدابير التأديبية المنصوص عليها في النظام الداخلي للمركز والمذكرات الوزارية الجاري بها العمل.
                </p>
              </div>

              {/* Signature Areas (Optional Manual Signature Spaces - Zero electronic signature required) */}
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  
                  {/* Learner Signature */}
                  <div className="border border-slate-300 rounded-lg p-2.5 h-28 flex flex-col justify-between bg-slate-50/40">
                    <span className="font-black text-slate-800">توقيع والتزام المتعلم(ة)</span>
                    <span className="text-[10px] text-slate-400 italic">قرأت والتزمت به</span>
                  </div>

                  {/* Guardian Signature */}
                  <div className="border border-slate-300 rounded-lg p-2.5 h-28 flex flex-col justify-between bg-slate-50/40">
                    <span className="font-black text-slate-800">توقيع ومصادقة ولي الأمر</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ب.ت.و: {viewingCommitmentForPrint.guardianCin || '................'}
                    </span>
                  </div>

                  {/* Administration Stamp */}
                  <div className="border border-slate-300 rounded-lg p-2.5 h-28 flex flex-col justify-between bg-slate-50/40">
                    <span className="font-black text-slate-800">تأشيرة وخاتم إدارة المركز</span>
                    <span className="text-[10px] text-slate-400">عن الإدارة التربوية</span>
                  </div>

                </div>
              </div>

              {/* Printable Footer */}
              <div className="text-center text-[10px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between items-center">
                <span>{settings.schoolName} · المديرية الإقليمية الصخيرات تمارة</span>
                <span>سجل تتبع الانضباط · وثيقة رسمية معتمدة</span>
              </div>

            </div>

            {/* Modal Bottom Actions (Hidden during print) */}
            <div className="no-print flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                الحالة الحالية: <strong>{viewingCommitmentForPrint.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>تصدير وطباعة PDF</span>
                </button>
                <button
                  onClick={() => setViewingCommitmentForPrint(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                >
                  إغلاق المعاينة
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 8: تعديل وتتبع الالتزام (Edit Commitment Follow-up Modal) */}
      {editingCommitmentRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 animate-fadeIn space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-900">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    تعديل وتتبع وثيقة الالتزام ({editingCommitmentRecord.commitmentNumber})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    المتعلم: {editingCommitmentRecord.learnerName} · تاريخ التحرير: {editingCommitmentRecord.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCommitmentRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCommitment} className="space-y-4">
              
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  حالة المتابعة الإدارية والتربوية للالتزام
                </label>
                <select
                  value={commitmentFormData.status}
                  onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, status: e.target.value as CommitmentStatus }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="محرر">محرر (جاهز للتوقيع والتنفيذ)</option>
                  <option value="قيد المتابعة">قيد المتابعة الإدارية والتربوية المستمرة</option>
                  <option value="تمت المتابعة">تمت المتابعة وتأكيد الانضباط الإيجابي</option>
                  <option value="مغلق">مغلق (أُرشف)</option>
                </select>
              </div>

              {/* Guardian Info Quick Edit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم ولي الأمر
                  </label>
                  <input
                    type="text"
                    value={commitmentFormData.guardianName}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianName: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={commitmentFormData.guardianPhone}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianPhone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم البطاقة (CIN)
                  </label>
                  <input
                    type="text"
                    value={commitmentFormData.guardianCin}
                    onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, guardianCin: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Follow-up Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات ونتائج التتبع الدوري
                </label>
                <textarea
                  rows={4}
                  value={commitmentFormData.notes}
                  onChange={(e) => setCommitmentFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="سجل ملاحظات حول تحسن سلوك المتعلم، جلسات الاستماع، أو زيارات ولي الأمر..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCommitmentRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  حفظ التعديلات
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 9: تأكيد حذف وثيقة الالتزام (Delete Commitment Confirmation Modal) */}
      {deletingCommitmentRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn space-y-4">
            
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد حذف وثيقة الالتزام
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                هل أنت متأكد من حذف وثيقة الالتزام رقم ({deletingCommitmentRecord.commitmentNumber}) الخاصة بالمتعلم ({deletingCommitmentRecord.learnerName}) نهائياً من السجل؟
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 mt-3 text-right">
                <p>تاريخ التحرير: {deletingCommitmentRecord.date}</p>
                <p>الحالة: {deletingCommitmentRecord.status}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCommitmentRecord(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCommitment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
              >
                نعم، احذف الالتزام
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={previewTitle}
        settings={settings}
        printableBodyHtml={previewHtml}
        defaultOrientation={previewOrientation}
        fileName={previewFileName}
      />

    </div>
  );
};
