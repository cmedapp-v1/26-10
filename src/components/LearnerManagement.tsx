import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Edit2, 
  Trash2, 
  UserX, 
  CheckCircle, 
  X, 
  AlertCircle,
  Settings2,
  Phone,
  MessageSquare,
  Printer,
  ShieldAlert,
  RotateCcw,
  UserPlus,
  Save,
  Calendar,
  MapPin,
  GraduationCap,
  FileText,
  Building
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { Learner, LearnerStatus, Gender, AppSettings, AttendanceRecord, Violation } from '../types';
import { generateNextRegistrationNumber } from '../utils/storage';
import { 
  exportLearnersToExcel, 
  downloadLearnersTemplate, 
  parseLearnersFile, 
  ParsedImportResult 
} from '../utils/excelImportExport';

interface LearnerManagementProps {
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  attendance: AttendanceRecord[];
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  violations?: Violation[];
  onViewLearnerViolations?: (learnerId: string) => void;
  onAddNewViolationForLearner?: (learnerId: string) => void;
  onCreateCommitmentForLearner?: (learnerId: string) => void;
}

export const LearnerManagement: React.FC<LearnerManagementProps> = ({
  learners,
  setLearners,
  attendance,
  settings,
  setSettings,
  violations = [],
  onViewLearnerViolations,
  onAddNewViolationForLearner,
  onCreateCommitmentForLearner,
}) => {
  // Map of violations per learner
  const learnerViolationsMap = useMemo(() => {
    const map = new Map<string, Violation[]>();
    violations.forEach((v) => {
      const list = map.get(v.learnerId) || [];
      list.push(v);
      map.set(v.learnerId, list);
    });
    return map;
  }, [violations]);
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState<{
    registrationNumber: string;
    arabicName: string;
    frenchName: string;
    masarCode: string;
    gender: Gender;
    birthDate: string;
    birthPlace: string;
    previousLevelSelect: string;
    previousLevelOther: string;
    parentPhone: string;
    address: string;
    createdAt: string;
    className: string;
    stream: string;
    status: LearnerStatus;
    notes: string;
  }>({
    registrationNumber: '',
    arabicName: '',
    frenchName: '',
    masarCode: '',
    gender: 'ذكر',
    birthDate: '',
    birthPlace: 'زيرارة',
    previousLevelSelect: 'الثالثة إعدادي (3 إعدادي)',
    previousLevelOther: '',
    parentPhone: '',
    address: 'زيرارة',
    createdAt: new Date().toISOString().split('T')[0],
    className: settings.classes[0] || 'القسم 1 - تكوين أساسي',
    stream: settings.streams[0] || 'المعلوماتيات والرقمنة',
    status: 'نشط',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Reset confirmation modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Delete single learner modal state
  const [deletingLearner, setDeletingLearner] = useState<Learner | null>(null);

  // Bulk Delete Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ParsedImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Bulk Update Modal State
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<{
    status: LearnerStatus | '';
    className: string | '';
    stream: string | '';
  }>({
    status: '',
    className: '',
    stream: '',
  });

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

  // Filtered Learners
  const filteredLearners = useMemo(() => {
    return learners.filter((l) => {
      const matchesSearch =
        l.arabicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.frenchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.masarCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesClass = classFilter === 'all' || l.className === classFilter;
      const matchesStream = streamFilter === 'all' || l.stream === streamFilter;
      const matchesGender = genderFilter === 'all' || l.gender === genderFilter;

      return matchesSearch && matchesStatus && matchesClass && matchesStream && matchesGender;
    });
  }, [learners, searchTerm, statusFilter, classFilter, streamFilter, genderFilter]);

  // Bulk Selection Handlers
  const isAllSelected = useMemo(() => {
    if (filteredLearners.length === 0) return false;
    return filteredLearners.every((l) => selectedIds.has(l.id));
  }, [filteredLearners, selectedIds]);

  const isSomeSelected = useMemo(() => {
    return filteredLearners.some((l) => selectedIds.has(l.id)) && !isAllSelected;
  }, [filteredLearners, selectedIds, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredLearners.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredLearners.forEach((l) => next.add(l.id));
        return next;
      });
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Delete Stats Calculation
  const bulkDeleteStats = useMemo(() => {
    const selectedLearnersList = learners.filter((l) => selectedIds.has(l.id));
    const learnersWithHistorySet = new Set(attendance.map((a) => a.learnerId));

    let willBeHardDeleted = 0;
    let willBeSoftMovedToLeft = 0;

    selectedLearnersList.forEach((learner) => {
      if (learnersWithHistorySet.has(learner.id)) {
        willBeSoftMovedToLeft++;
      } else {
        willBeHardDeleted++;
      }
    });

    return {
      totalSelected: selectedLearnersList.length,
      willBeHardDeleted,
      willBeSoftMovedToLeft,
      selectedLearnersList,
    };
  }, [learners, selectedIds, attendance]);

  const handleConfirmBulkDelete = () => {
    const learnersWithHistorySet = new Set(attendance.map((a) => a.learnerId));

    setLearners((prev) => {
      return prev
        .map((l) => {
          if (selectedIds.has(l.id)) {
            if (learnersWithHistorySet.has(l.id)) {
              return { ...l, status: 'مغادر' as LearnerStatus };
            } else {
              return null;
            }
          }
          return l;
        })
        .filter(Boolean) as Learner[];
    });

    setToastMessage(
      `تم تنفيذ الحذف والجرف الجماعي لـ (${bulkDeleteStats.totalSelected}) متعلم: (${bulkDeleteStats.willBeHardDeleted}) حذف نهائي، و(${bulkDeleteStats.willBeSoftMovedToLeft}) نقل إلى حالة "مغادر".`
    );
    setTimeout(() => setToastMessage(null), 4500);

    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  const handleConfirmBulkUpdate = () => {
    if (!bulkUpdateData.status && !bulkUpdateData.className && !bulkUpdateData.stream) {
      setIsBulkUpdateModalOpen(false);
      return;
    }

    setLearners((prev) =>
      prev.map((l) => {
        if (selectedIds.has(l.id)) {
          return {
            ...l,
            status: (bulkUpdateData.status as LearnerStatus) || l.status,
            className: bulkUpdateData.className || l.className,
            stream: bulkUpdateData.stream || l.stream,
            updatedAt: new Date().toISOString(),
          };
        }
        return l;
      })
    );

    setToastMessage(`تم تحديث بيانات (${selectedIds.size}) متعلم بنجاح.`);
    setTimeout(() => setToastMessage(null), 3500);

    setSelectedIds(new Set());
    setIsBulkUpdateModalOpen(false);
    setBulkUpdateData({ status: '', className: '', stream: '' });
  };

  // Statistics breakdown for PDF printing
  const filteredLearnersStats = useMemo(() => {
    let males = 0;
    let females = 0;
    let unspecified = 0;

    filteredLearners.forEach((l) => {
      if (l.gender === 'ذكر') males++;
      else if (l.gender === 'أنثى') females++;
      else unspecified++;
    });

    return { total: filteredLearners.length, males, females, unspecified };
  }, [filteredLearners]);

  // Reset Form helper
  const resetFormToInitial = (currentLearnersList = learners) => {
    const nextRegNum = generateNextRegistrationNumber(currentLearnersList);
    setFormData({
      registrationNumber: nextRegNum,
      arabicName: '',
      frenchName: '',
      masarCode: '',
      gender: 'ذكر',
      birthDate: '',
      birthPlace: 'زيرارة',
      previousLevelSelect: 'الثالثة إعدادي (3 إعدادي)',
      previousLevelOther: '',
      parentPhone: '',
      address: 'زيرارة',
      createdAt: new Date().toISOString().split('T')[0],
      className: settings.classes[0] || 'القسم 1 - تكوين أساسي',
      stream: settings.streams[0] || 'المعلوماتيات والرقمنة',
      status: 'نشط',
      notes: '',
    });
    setFormError(null);
  };

  // Open modal for new learner
  const handleOpenAddModal = () => {
    setEditingLearner(null);
    resetFormToInitial(learners);
    setIsModalOpen(true);
  };

  // Open modal for editing existing learner
  const handleOpenEditModal = (learner: Learner) => {
    setEditingLearner(learner);

    // Determine previous level dropdown vs other
    const standardLevels = [
      'الأولى إعدادي (1 إعدادي)',
      'الثانية إعدادي (2 إعدادي)',
      'الثالثة إعدادي (3 إعدادي)',
    ];

    let pSelect = learner.previousLevel;
    let pOther = '';

    if (!standardLevels.includes(learner.previousLevel)) {
      pSelect = 'آخر، يُذكر';
      pOther = learner.previousLevel;
    }

    setFormData({
      registrationNumber: learner.registrationNumber, // Readonly: keep existing
      arabicName: learner.arabicName,
      frenchName: learner.frenchName || '',
      masarCode: learner.masarCode || '',
      gender: learner.gender,
      birthDate: learner.birthDate || '',
      birthPlace: learner.birthPlace || 'زيرارة',
      previousLevelSelect: pSelect,
      previousLevelOther: pOther,
      parentPhone: learner.parentPhone || '',
      address: learner.address || 'زيرارة',
      createdAt: learner.createdAt || new Date().toISOString().split('T')[0],
      className: learner.className,
      stream: learner.stream,
      status: learner.status,
      notes: learner.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Validate form entries
  const validateForm = (): { isValid: boolean; finalPreviousLevel: string } => {
    setFormError(null);

    // Arabic Name mandatory
    if (!formData.arabicName.trim()) {
      setFormError('يرجى إدخال الاسم الكامل بالعربية');
      return { isValid: false, finalPreviousLevel: '' };
    }

    // Previous Level validation
    let finalPreviousLevel = formData.previousLevelSelect;
    if (formData.previousLevelSelect === 'آخر، يُذكر') {
      if (!formData.previousLevelOther.trim()) {
        setFormError('يرجى كتابة المستوى الدراسي السابق في حقل "آخر، يُذكر"');
        return { isValid: false, finalPreviousLevel: '' };
      }
      finalPreviousLevel = formData.previousLevelOther.trim();
    }

    // MASAR Code duplicate check (optional field, but if provided, must be unique)
    const trimmedMasar = formData.masarCode.trim().toUpperCase();
    if (trimmedMasar) {
      const duplicate = learners.find(
        (l) => l.masarCode.toUpperCase().trim() === trimmedMasar && l.id !== editingLearner?.id
      );

      if (duplicate) {
        setFormError(`رقم مسار (${trimmedMasar}) مستعمل سابقاً للمتعلم: ${duplicate.arabicName}`);
        return { isValid: false, finalPreviousLevel: '' };
      }
    }

    // Phone format check if provided
    if (formData.parentPhone.trim()) {
      const cleanPhone = formData.parentPhone.trim().replace(/\s+/g, '');
      const phoneRegex = /^0[5-7]\d{8}$/;
      if (!phoneRegex.test(cleanPhone) && cleanPhone.length !== 10) {
        setFormError('يرجى إدخال رقم هاتف صحيح بيتألف من 10 أرقام (مثال: 0661234567)');
        return { isValid: false, finalPreviousLevel: '' };
      }
    }

    return { isValid: true, finalPreviousLevel };
  };


  // Real Save Logic extracted for confirmation callback
  const executeSaveLearner = () => {
    const { finalPreviousLevel } = validateForm();
    const trimmedMasar = formData.masarCode.trim().toUpperCase();

    if (editingLearner) {
      // Update existing record
      setLearners((prev) =>
        prev.map((l) =>
          l.id === editingLearner.id
            ? {
                ...l,
                registrationNumber: editingLearner.registrationNumber, // Never mutate ZR number on edit
                arabicName: formData.arabicName.trim(),
                frenchName: formData.frenchName.trim(),
                masarCode: trimmedMasar,
                gender: formData.gender,
                birthDate: formData.birthDate,
                birthPlace: formData.birthPlace.trim(),
                className: formData.className,
                stream: formData.stream,
                previousLevel: finalPreviousLevel,
                parentPhone: formData.parentPhone.trim(),
                whatsapp: formData.parentPhone.trim(),
                address: formData.address.trim(),
                status: formData.status,
                createdAt: formData.createdAt,
                notes: formData.notes.trim(),
              }
            : l
        )
      );
      setToastMessage('تم تعديل بيانات المتعلم بنجاح');
    } else {
      // Create new record
      // Auto-generate ZR number without duplicates
      const uniqueRegNum = formData.registrationNumber || generateNextRegistrationNumber(learners);

      const newLearner: Learner = {
        id: `lrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        registrationNumber: uniqueRegNum,
        arabicName: formData.arabicName.trim(),
        frenchName: formData.frenchName.trim(),
        masarCode: trimmedMasar,
        gender: formData.gender,
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace.trim(),
        className: formData.className,
        stream: formData.stream,
        previousLevel: finalPreviousLevel,
        parentPhone: formData.parentPhone.trim(),
        whatsapp: formData.parentPhone.trim(),
        address: formData.address.trim(),
        status: formData.status,
        createdAt: formData.createdAt,
        notes: formData.notes.trim(),
      };

      setLearners((prev) => [newLearner, ...prev]);
      setToastMessage(`تم إضافة المتعلم الجديد (${newLearner.arabicName}) برقم تسجلي فريد (${newLearner.registrationNumber})`);
    }

    setTimeout(() => setToastMessage(null), 3500);
    setIsModalOpen(false);
  };

  const handleSaveLearner = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid } = validateForm();
    if (!isValid) return;

    openConfirm(
      editingLearner ? 'تأكيد حفظ التعديلات' : 'تأكيد إضافة متعلم',
      editingLearner 
        ? 'هل أنت متأكد من أنك تريد حفظ التعديلات التي أجريتها؟' 
        : `هل أنت متأكد من أنك تريد إضافة المتعلم الجديد (${formData.arabicName})؟`,
      executeSaveLearner,
      editingLearner ? 'warning' : 'info'
    );
  };

  // Save & Add Another Learner («حفظ وإضافة متعلم آخر»)
  const handleSaveAndAddAnother = () => {
    const { isValid, finalPreviousLevel } = validateForm();
    if (!isValid) return;

    const trimmedMasar = formData.masarCode.trim().toUpperCase();
    const uniqueRegNum = formData.registrationNumber || generateNextRegistrationNumber(learners);

    const newLearner: Learner = {
      id: `lrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      registrationNumber: uniqueRegNum,
      arabicName: formData.arabicName.trim(),
      frenchName: formData.frenchName.trim(),
      masarCode: trimmedMasar,
      gender: formData.gender,
      birthDate: formData.birthDate,
      birthPlace: formData.birthPlace.trim(),
      className: formData.className,
      stream: formData.stream,
      previousLevel: finalPreviousLevel,
      parentPhone: formData.parentPhone.trim(),
      whatsapp: formData.parentPhone.trim(),
      address: formData.address.trim(),
      status: formData.status,
      createdAt: formData.createdAt,
      notes: formData.notes.trim(),
    };

    const updatedLearners = [newLearner, ...learners];
    setLearners(updatedLearners);

    setToastMessage(`✓ تم حفظ (${newLearner.arabicName}) بنجاح. جاهز لإدخال المتعلم التالي.`);
    setTimeout(() => setToastMessage(null), 3500);

    // Reset form for next entry with updated learners list to auto-calc next ZR number
    resetFormToInitial(updatedLearners);
  };

  // Reset fields with confirmation
  const handleTriggerResetFields = () => {
    if (formData.arabicName || formData.masarCode || formData.parentPhone || formData.frenchName) {
      setIsResetConfirmOpen(true);
    } else {
      resetFormToInitial(learners);
    }
  };

  const handleConfirmResetFields = () => {
    resetFormToInitial(learners);
    setIsResetConfirmOpen(false);
  };

  // Delete or soft-deactivate single learner
  const handleDeleteLearner = (learner: Learner, forceHardDelete = false) => {
    const hasHistory = attendance.some((a) => a.learnerId === learner.id);
    
    const actionLabel = (hasHistory && !forceHardDelete) ? 'نقل إلى "مغادر"' : 'حذف نهائي';
    const message = (hasHistory && !forceHardDelete) 
      ? `المتعلم (${learner.arabicName}) لديه سجل حضور سابق. سيتم نقله إلى حالة "مغادر" للحفاظ على البيانات. هل أنت متأكد؟`
      : `هل أنت متأكد من أنك تريد حذف المتعلم (${learner.arabicName}) بشكل نهائي من القاعدة؟ لا يمكن التراجع عن هذا الإجراء.`;

    openConfirm(
      `تأكيد ${actionLabel}`,
      message,
      () => executeDeleteLearner(learner, forceHardDelete),
      'danger'
    );
  };

  const executeDeleteLearner = (learner: Learner, forceHardDelete = false) => {
    const hasHistory = attendance.some((a) => a.learnerId === learner.id);

    if (hasHistory && !forceHardDelete) {
      // Move to 'مغادر' status to retain history
      setLearners((prev) =>
        prev.map((l) => (l.id === learner.id ? { ...l, status: 'مغادر' } : l))
      );
      setToastMessage('تم نقل المتعلم إلى حالة "مغادر" مع الحفاظ على سجله التاريخي');
    } else {
      // Hard delete
      setLearners((prev) => prev.filter((l) => l.id !== learner.id));
      setToastMessage('تم حذف بيانات المتعلم نهائياً');
    }

    setTimeout(() => setToastMessage(null), 3000);
    setDeletingLearner(null);
  };

  // Handle file select for import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await parseLearnersFile(file, learners);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({ 
        validLearners: [], 
        errors: [err.message || 'فشل استيراد الملف'],
        ignoredCount: 0,
        discoveredClasses: [],
        discoveredStreams: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Confirm import
  const handleConfirmImport = () => {
    if (!importResult || importResult.validLearners.length === 0) return;

    let addedCount = 0;
    const updatedLearners = [...learners];

    importResult.validLearners.forEach((parsed) => {
      if (!parsed.arabicName) return;

      const masarUpper = parsed.masarCode ? parsed.masarCode.toUpperCase().trim() : '';
      const existing = masarUpper ? updatedLearners.find((l) => l.masarCode.toUpperCase().trim() === masarUpper) : null;

      if (!existing) {
        const regNum = generateNextRegistrationNumber(updatedLearners);
        const newLearner: Learner = {
          id: `lrn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          registrationNumber: regNum,
          arabicName: parsed.arabicName,
          frenchName: parsed.frenchName || '',
          masarCode: masarUpper,
          gender: parsed.gender || 'ذكر',
          className: parsed.className || settings.classes[0] || 'القسم 1 - تكوين أساسي',
          stream: parsed.stream || settings.streams[0] || 'المعلوماتيات والرقمنة',
          previousLevel: parsed.previousLevel || 'إعدادي',
          parentPhone: parsed.parentPhone || '',
          whatsapp: parsed.whatsapp || parsed.parentPhone || '',
          address: parsed.address || 'زيرارة',
          status: parsed.status || 'نشط',
          createdAt: new Date().toISOString().split('T')[0],
        };
        updatedLearners.unshift(newLearner);
        addedCount++;
      }
    });

    // Auto-append missing discovered classes & streams to settings
    if (setSettings) {
      setSettings((prev) => {
        const newClasses = Array.from(new Set([...prev.classes, ...importResult.discoveredClasses]));
        const newStreams = Array.from(new Set([...prev.streams, ...importResult.discoveredStreams]));
        return {
          ...prev,
          classes: newClasses,
          streams: newStreams,
        };
      });
    }

    setLearners(updatedLearners);
    
    setToastMessage(
      `تم استيراد Excel بنجاح: إضافة (${addedCount}) متعلم جديد. تم تجاهل (${importResult.ignoredCount}) سطر مكرر أو بدون اسم.`
    );
    setTimeout(() => setToastMessage(null), 4500);

    setIsImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
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
            <CheckCircle className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* Printable PDF Header & List View (Visible during window.print()) */}
      <div className="print-only mb-6 space-y-4">
        <div className="text-center border-b border-slate-400 pb-4">
          <h1 className="text-2xl font-black">تطبيق تدبير المتعلمين</h1>
          <p className="text-base font-bold text-slate-800 mt-1">{settings.schoolName}</p>
          <p className="text-xs text-slate-600 mt-0.5">المملكة المغربية · وزارة التربية الوطنية والتعليم الأولية والرياضة</p>
          <p className="text-sm font-semibold mt-1">لائحة المتعلمين والمسجلين · السنة الدراسية {settings.schoolYear}</p>
          <p className="text-xs font-bold text-slate-800 mt-1.5 p-1.5 bg-slate-100 rounded border border-slate-300 inline-block">
            {classFilter !== 'all' ? `القسم: ${classFilter}` : 'جميع الأقسام'} 
            {streamFilter !== 'all' ? ` · الشعبة: ${streamFilter}` : ' · جميع الشعب'}
            {genderFilter !== 'all' ? ` · الجنس: ${genderFilter}` : ' · جميع الأجناس'}
            {statusFilter !== 'all' ? ` · الحالة: ${statusFilter}` : ''}
            {searchTerm ? ` · البحث: "${searchTerm}"` : ''}
          </p>
        </div>

        {/* Printable Summary Statistics Header */}
        <div className="flex items-center justify-around p-3 bg-slate-100 border border-slate-400 rounded-lg text-xs font-bold text-slate-900">
          <span>المجموع الكلي: {filteredLearnersStats.total} متعلم</span>
          <span>عدد الذكور: {filteredLearnersStats.males}</span>
          <span>عدد الإناث: {filteredLearnersStats.females}</span>
          {filteredLearnersStats.unspecified > 0 && (
            <span>غير محدد: {filteredLearnersStats.unspecified}</span>
          )}
        </div>

        {/* Printable Numbered Table */}
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold border border-slate-400">
              <th className="p-2 border border-slate-400 text-center">ت</th>
              <th className="p-2 border border-slate-400">الاسم الكامل</th>
              <th className="p-2 border border-slate-400">رقم مسار</th>
              <th className="p-2 border border-slate-400">الجنس</th>
              <th className="p-2 border border-slate-400">القسم</th>
              <th className="p-2 border border-slate-400">الشعبة / الحرفة</th>
              <th className="p-2 border border-slate-400">المستوى السابق</th>
            </tr>
          </thead>
          <tbody>
            {filteredLearners.map((learner, idx) => (
              <tr key={learner.id} className="border border-slate-300">
                <td className="p-2 border border-slate-300 font-bold text-center">{idx + 1}</td>
                <td className="p-2 border border-slate-300 font-bold">{learner.arabicName}</td>
                <td className="p-2 border border-slate-300 font-mono">{learner.masarCode || '-'}</td>
                <td className="p-2 border border-slate-300">{learner.gender}</td>
                <td className="p-2 border border-slate-300">{learner.className}</td>
                <td className="p-2 border border-slate-300">{learner.stream}</td>
                <td className="p-2 border border-slate-300">{learner.previousLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Official Print Footer for Learners List (Only during print) */}
        <div className="print-only mt-4 pt-3 border-t-2 border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-800">
          <span>مركز الفرصة الثانية - الجيل الجديد زرارة · لائحة المتعلمين الرسمية</span>
          <span>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-MA')} · السنة الدراسية: {settings.schoolYear}</span>
        </div>
      </div>

      {/* Screen Header & Top Primary Actions */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>تدبير المتعلمين وسجل المسجلين</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold tabular-nums">
              إجمالي: {learners.length}
            </span>
            {selectedIds.size > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold tabular-nums">
                محدد: {selectedIds.size}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إضافة وتعديل البحث، استيراد Excel، وتصدير PDF / الطباعة لـ {settings.schoolName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          {/* Bulk Update Button */}
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setIsBulkUpdateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
            title="تعديل بيانات المحددين (القسم، الحالة، إلخ)"
          >
            <Settings2 className="w-4 h-4" />
            <span>تعديل المحدد ({selectedIds.size})</span>
          </button>

          {/* Add learner button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة متعلم جديد</span>
          </button>

          {/* Bulk Delete Button */}
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
            title={
              selectedIds.size > 0 
                ? `حذف/نقل المحددين (${selectedIds.size})` 
                : 'حدد متعلمين من الجدول أولاً للتمكن من الحذف الجماعي'
            }
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف المحدد ({selectedIds.size})</span>
          </button>

          {/* PDF Export / Print button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all"
            title="تصدير اللائحة المحددة حالياً بصيغة PDF أو الطباعة"
          >
            <Printer className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>

          {/* Import Excel/CSV button */}
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportFile(null);
              setImportResult(null);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد Excel / CSV</span>
          </button>

          {/* Export Excel button for filtered list */}
          <button
            onClick={() => exportLearnersToExcel(filteredLearners)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all"
            title="تصدير القائمة المفلترة حالياً إلى Excel"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

        </div>
      </div>

      {/* Search & Filtering Controls */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، مسار، أو الرقم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="نشط">نشط (مستمر)</option>
              <option value="منقطع">منقطع عن الدراسة</option>
              <option value="مغادر">مغادر المؤسسة</option>
            </select>
          </div>

          {/* Class filter */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">جميع الأقسام</option>
              {settings.classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Stream filter */}
          <div>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">جميع الشعب والمهن</option>
              {settings.streams.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Gender filter */}
          <div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">جميع الأجناس (ذكور وإناث)</option>
              <option value="ذكر">ذواكر فقط (ذكر)</option>
              <option value="أنثى">إناث فقط (أنثى)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Learners Table Container (On-screen view - registrationNumber hidden as requested) */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {/* Header Bulk Checkbox */}
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isSomeSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-right">المتعلم</th>
                  <th className="p-4 text-right">رقم مسار</th>
                  <th className="p-4 text-right">الجنس</th>
                  <th className="p-4 text-right">القسم والشعبة</th>
                  <th className="p-4 text-right">المستوى السابق</th>
                  <th className="p-4 text-right">الاتصال</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLearners.length > 0 ? (
                filteredLearners.map((learner) => {
                  const isChecked = selectedIds.has(learner.id);

                  return (
                    <tr 
                      key={learner.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-emerald-50/50 dark:bg-emerald-950/30' : ''
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(learner.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Arabic and French Names */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {learner.arabicName}
                        </div>
                        {learner.frenchName && (
                          <div className="text-[11px] text-slate-400 font-sans">
                            {learner.frenchName}
                          </div>
                        )}
                      </td>

                      {/* MASAR code */}
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {learner.masarCode || <span className="text-slate-400 font-sans">-</span>}
                      </td>

                      {/* Gender */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          learner.gender === 'أنثى' 
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' 
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {learner.gender}
                        </span>
                      </td>

                      {/* Class & Stream */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {learner.className}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {learner.stream}
                        </div>
                      </td>

                      {/* Previous Level */}
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {learner.previousLevel}
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {learner.parentPhone && (
                            <a 
                              href={`tel:${learner.parentPhone}`}
                              className="p-1 rounded text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title={`اتصال: ${learner.parentPhone}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {learner.whatsapp && (
                            <a 
                              href={`https://wa.me/212${learner.whatsapp.replace(/^0/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              title={`مراسلة واتساب: ${learner.whatsapp}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <span className="text-xs font-mono text-slate-500">
                            {learner.parentPhone || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          learner.status === 'نشط'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : learner.status === 'منقطع'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        }`}>
                          {learner.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Violation Records Shortcut Button */}
                          <button
                            onClick={() => onViewLearnerViolations && onViewLearnerViolations(learner.id)}
                            className="relative p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={
                              (learnerViolationsMap.get(learner.id)?.length || 0) > 0
                                ? `عرض مخالفات المتعلم (${learnerViolationsMap.get(learner.id)!.length} مسجلة)`
                                : 'تسجيل وتتبع مخالفات المتعلم'
                            }
                          >
                            <ShieldAlert className="w-4 h-4" />
                            {(learnerViolationsMap.get(learner.id)?.length || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                                {learnerViolationsMap.get(learner.id)!.length}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => onCreateCommitmentForLearner && onCreateCommitmentForLearner(learner.id)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="إنشاء التزام باحترام النظام الداخلي للمتعلم"
                          >
                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(learner)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="تعديل ملف المتعلم"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingLearner(learner)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="حذف / نقل للمغادرين"
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
                  <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <UserX className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold">لم يتم العثور على أي متعلم</p>
                    <p className="text-xs mt-1">تأكد من عبارات البحث أو الفلاتر المحددة، أو قم بإضافة متعلمين جدد.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structured Comprehensive Modal Form for Add / Edit Learner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 animate-fadeIn space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingLearner ? 'تعديل بيانات المتعلم' : 'استمارة إضافة متعلم جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    يرجى تعبئة الحقول الأساسية والإدارية بكل دقة لمركز الفرصة الثانية.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Auto Readonly ZR Number Badge */}
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  رقم التسجيل: {formData.registrationNumber}
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Error Callout Banner */}
            {formError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLearner} className="space-y-6">
              
              {/* Section 1: معلومات المتعلم الأساسية */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>1. معلومات المتعلم الأساسية</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Arabic Name */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم الكامل بالعربية <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أمين المنصوري"
                      value={formData.arabicName}
                      onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  {/* French Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم بالفرنسية (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Amine El Mansouri"
                      value={formData.frenchName}
                      onChange={(e) => setFormData({ ...formData, frenchName: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>

                  {/* MASAR Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم مسار (اختياري، يمنع التكرار)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: G138901234"
                      value={formData.masarCode}
                      onChange={(e) => setFormData({ ...formData, masarCode: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الجنس <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاريخ الازدياد</span>
                    </label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {/* Birth Place */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>مكان الازدياد</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: زيرارة، سيدي قاسم"
                      value={formData.birthPlace}
                      onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                </div>
              </div>

              {/* Section 2: المستوى الدراسي السابق */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>2. المستوى الدراسي السابق</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Select Level */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اختيار المستوى التعليمي <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.previousLevelSelect}
                      onChange={(e) => setFormData({ ...formData, previousLevelSelect: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="الأولى إعدادي (1 إعدادي)">الأولى إعدادي (1 إعدادي)</option>
                      <option value="الثانية إعدادي (2 إعدادي)">الثانية إعدادي (2 إعدادي)</option>
                      <option value="الثالثة إعدادي (3 إعدادي)">الثالثة إعدادي (3 إعدادي)</option>
                      <option value="آخر، يُذكر">آخر، يُذكر...</option>
                    </select>
                  </div>

                  {/* Dynamic 'Other' Level Input */}
                  {formData.previousLevelSelect === 'آخر، يُذكر' && (
                    <div>
                      <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                        تحديد المستوى المذكور <span className="text-rose-500">* (إلزامي)</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="أدخل المستوى السلك التعليمي السابق..."
                        value={formData.previousLevelOther}
                        onChange={(e) => setFormData({ ...formData, previousLevelOther: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-bold"
                      />
                    </div>
                  )}

                </div>
              </div>

              {/* Section 3: معلومات الاتصال والعنوان */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  <span>3. معلومات الاتصال والعنوان</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Parent Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم هاتف ولي الأمر
                    </label>
                    <input
                      type="tel"
                      placeholder="مثال: 0661234567"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عنوان السكن المفصل
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: حي الأمل، زيرارة المركز"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                </div>
              </div>

              {/* Section 4: المعلومات الإدارية والملاحظات */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4" />
                  <span>4. المعلومات الإدارية والملاحظات</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Registration Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ التسجيل بالمركز
                    </label>
                    <input
                      type="date"
                      value={formData.createdAt}
                      onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {/* Class */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      القسم <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {settings.classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stream */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الشعبة / التخصص <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.stream}
                      onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {settings.streams.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الحالة الإدارية
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as LearnerStatus })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="نشط">نشط (مستمر بانتظام)</option>
                      <option value="منقطع">منقطع (توقف مؤقت)</option>
                      <option value="مغادر">مغادر (تم نقله أو مغادرته)</option>
                    </select>
                  </div>

                </div>

                {/* Additional Notes */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>ملاحظات إضافية (اختيارية)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="أي ملاحظات خاصة بالمتعلم، الحالة العائلية، أو الجمعية المرافقة..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section: المخالفات التأديبية الخاصة بالمتعلم (عند التعديل) */}
              {editingLearner && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      <span>المخالفات التأديبية المسجلة ({learnerViolationsMap.get(editingLearner.id)?.length || 0})</span>
                    </h4>

                    <div className="flex items-center gap-2">
                      {onCreateCommitmentForLearner && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            onCreateCommitmentForLearner(editingLearner.id);
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>إنشاء التزام بالنظام الداخلي</span>
                        </button>
                      )}

                      {onAddNewViolationForLearner && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            onAddNewViolationForLearner(editingLearner.id);
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>تسجيل مخالفة</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {(learnerViolationsMap.get(editingLearner.id)?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {learnerViolationsMap.get(editingLearner.id)!.map((v) => (
                        <div 
                          key={v.id}
                          className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{v.violationNumber}</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{v.type}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {v.date} {v.time ? `(${v.time})` : ''} · الإجراء: {v.actionTaken}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {v.status}
                            </span>
                            {onViewLearnerViolations && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsModalOpen(false);
                                  onViewLearnerViolations(editingLearner.id);
                                }}
                                className="text-rose-600 hover:underline font-bold text-[11px]"
                              >
                                عرض في السجل
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      السجل نظيف: لا توجد أي مخالفات انضباطية مسجلة بحق هذا المتعلم.
                    </p>
                  )}
                </div>
              )}

              {/* Form Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-200 dark:border-slate-800">
                
                {/* Reset fields button */}
                <button
                  type="button"
                  onClick={handleTriggerResetFields}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
                  title="مسح جميع بيانات الحقول المدخلة"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>مسح الحقول</span>
                </button>

                <div className="flex items-center gap-2">
                  
                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    إلغاء
                  </button>

                  {/* Save and Add Another (Only visible when adding new learner) */}
                  {!editingLearner && (
                    <button
                      type="button"
                      onClick={handleSaveAndAddAnother}
                      className="px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-xs transition-all"
                    >
                      حفظ وإضافة متعلم آخر
                    </button>
                  )}

                  {/* Primary Save Button */}
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingLearner ? 'حفظ التعديلات' : 'حفظ المتعلم'}</span>
                  </button>

                </div>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* Clear Fields Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 animate-fadeIn space-y-3">
            <div className="flex items-center gap-2.5 text-amber-600">
              <RotateCcw className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                تأكيد مسح الحقول المدخلة
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              هل أنت أثق من رغبتك في مسح جميع البيانات التي قمت بكتابتها في الاستمارة وإعادة الضبط؟
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmResetFields}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                مسح الحقول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Learner Delete Confirmation Modal */}
      {deletingLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-fadeIn">
            
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد إجراء الحذف / النقل للمغادرين
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              أنت على وشك حذف بيانات المتعلم(ة): <span className="font-bold text-slate-900 dark:text-white">{deletingLearner.arabicName}</span> {deletingLearner.masarCode ? `(رقم مسار: ${deletingLearner.masarCode})` : ''}.
            </p>

            {attendance.some((a) => a.learnerId === deletingLearner.id) ? (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                ⚠️ يمتلك هذا المتعلم سجلات حضور وغياب سابقة. للحفاظ على سلامة الإحصائيات والأرشيف، يفضل نقل حالته إلى «مغادر» بدل الحذف النهائي.
              </div>
            ) : null}

            <div className="flex flex-col gap-2 mt-6">
              {attendance.some((a) => a.learnerId === deletingLearner.id) && (
                <button
                  onClick={() => handleDeleteLearner(deletingLearner, false)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  تغيير الحالة إلى «مغادر» (موصى به للحفاظ على السجل)
                </button>
              )}

              <button
                onClick={() => handleDeleteLearner(deletingLearner, true)}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                حذف نهائي ومسح البيانات بشكل كامل
              </button>

              <button
                onClick={() => setDeletingLearner(null)}
                className="w-full py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg"
              >
                إلغاء الأمر
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 animate-fadeIn space-y-4">
            
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد الحذف والنقل الجماعي للمتعلمين المحددين
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              أنت على وشك معالجة الحذف الجماعي لـ <span className="font-bold text-slate-900 dark:text-white font-mono">({bulkDeleteStats.totalSelected})</span> متعلم تم تحديدهم بناءً على التصفية الحالية.
            </p>

            {/* Detailed Breakdown Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                <span>• متعلمون بدون سجل حضور (سيتم حذفهم نهائياً):</span>
                <span className="font-mono text-sm font-black tabular-nums">{bulkDeleteStats.willBeHardDeleted}</span>
              </div>

              <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                <span>• متعلمون لهم سجل حضور سابق (سينقلون إلى «مغادر»):</span>
                <span className="font-mono text-sm font-black tabular-nums">{bulkDeleteStats.willBeSoftMovedToLeft}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              ملاحظة هامة: الحفاظ على سجل المتعلمين ونقلهم للحالة «مغادر» يمنع ضياع البيانات التاريخية للحضور والغياب. لن يتم اتخاذ أي إجراء أو حذف إلا بعد الضغط على زر «موافق».
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                موافق وتأكيد الحذف الجماعي
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full p-6 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>استيراد قائمة المتعلمين من Excel أو CSV</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
                <span className="text-emerald-900 dark:text-emerald-200 font-medium">
                  تحميل النموذج الجاهز لاستيراد المتعلمين؟
                </span>
                <button
                  onClick={downloadLearnersTemplate}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors"
                >
                  تحميل النموذج (.xlsx)
                </button>
              </div>

              {/* Upload Input Area */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اختر ملف Excel (.xlsx) أو CSV من حاسوبك
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  يتعرف النظام تلقائياً على الأعمدة (الاسم، مسار، الجنس، القسم، الشعبة، الهاتف) بأي ترتيب.
                </p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                />
              </div>

              {isImporting && (
                <p className="text-center text-xs font-semibold text-emerald-600 animate-pulse">
                  جاري تحليل قراءة واستخراج بيانات الملف وتوحيد الأرقام والحقول...
                </p>
              )}

              {importResult && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1.5">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ السجلات الصالحة للاستيراد: {importResult.validLearners.length} متعلم
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      • الأسطر المتجاهَلة والمكررة: {importResult.ignoredCount}
                    </p>
                    {importResult.discoveredClasses.length > 0 && (
                      <p className="text-slate-600 dark:text-slate-300">
                        • الأقسام المستكشفة تلقائياً: {importResult.discoveredClasses.join(' ، ')}
                      </p>
                    )}
                    {importResult.discoveredStreams.length > 0 && (
                      <p className="text-slate-600 dark:text-slate-300">
                        • الشعب المستكشفة تلقائياً: {importResult.discoveredStreams.join(' ، ')}
                      </p>
                    )}

                    {importResult.errors.length > 0 && (
                      <div className="mt-2 text-amber-700 dark:text-amber-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <p className="font-bold">ملاحظات الملف ({importResult.errors.length}):</p>
                        <ul className="list-disc list-inside max-h-24 overflow-y-auto mt-1 space-y-0.5 text-[11px]">
                          {importResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      إلغاء
                    </button>
                    <button
                      disabled={importResult.validLearners.length === 0}
                      onClick={handleConfirmImport}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm"
                    >
                      تأكيد إضافة ({importResult.validLearners.length}) متعلم
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="p-6">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings2 className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">تعديل جماعي للبيانات</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">
                تعديل بيانات <span className="font-bold text-slate-900 dark:text-white">({selectedIds.size})</span> متعلم دفعة واحدة. اترك الحقول فارغة للاحتفاظ بالقيم الحالية.
              </p>

              <div className="space-y-4 mb-8">
                {/* Status Update */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تغيير الحالة إلى
                  </label>
                  <select
                    value={bulkUpdateData.status}
                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, status: e.target.value as LearnerStatus })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">لا يوجد تغيير</option>
                    <option value="نشط">نشط (مستمر)</option>
                    <option value="منقطع">منقطع عن الدراسة</option>
                    <option value="مغادر">مغادر المؤسسة</option>
                  </select>
                </div>

                {/* Class Update */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تغيير القسم إلى
                  </label>
                  <select
                    value={bulkUpdateData.className}
                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, className: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">لا يوجد تغيير</option>
                    {settings.classes.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                {/* Stream Update */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تغيير الشعبة إلى
                  </label>
                  <select
                    value={bulkUpdateData.stream}
                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, stream: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">لا يوجد تغيير</option>
                    {settings.streams.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    openConfirm(
                      'تأكيد التعديل الجماعي',
                      `هل أنت متأكد من تطبيق هذه التغييرات على ${selectedIds.size} متعلم؟ لا يمكن التراجع التلقائي عن هذه العملية.`,
                      handleConfirmBulkUpdate,
                      'warning'
                    );
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
                >
                  تطبيق التعديلات
                </button>
                <button
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
