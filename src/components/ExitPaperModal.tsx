import React, { useState } from 'react';
import { FileText, X, CheckCircle2 } from 'lucide-react';
import { Learner, ExitPaper } from '../types';

interface ExitPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  learners: Learner[];
  onSave: (paper: ExitPaper) => void;
}

export const ExitPaperModal: React.FC<ExitPaperModalProps> = ({ isOpen, onClose, learners, onSave }) => {
  const [learnerId, setLearnerId] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'مؤقت' | 'لبقية اليوم'>('مؤقت');
  const [timeOut, setTimeOut] = useState(new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [timeInExpected, setTimeInExpected] = useState('');
  const [destination, setDestination] = useState('');
  const [companion, setCompanion] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const selectedLearner = learners.find(l => l.id === learnerId);
    if (!selectedLearner || !reason) return;
    
    onSave({
      id: `exit_${Date.now()}`,
      exitNumber: '', // Will be generated in parent
      learnerId,
      learnerName: selectedLearner.arabicName,
      registrationNumber: selectedLearner.registrationNumber,
      className: selectedLearner.className,
      stream: selectedLearner.stream,
      date: new Date().toISOString().split('T')[0],
      timeOut,
      timeInExpected,
      reason,
      type,
      destination,
      companion,
      status: 'غادر',
      administrativeApproval: true,
      createdBy: 'الإدارة',
      createdAt: new Date().toISOString(),
    });
    
    // Reset
    setLearnerId('');
    setReason('');
    setType('مؤقت');
    setTimeInExpected('');
    setDestination('');
    setCompanion('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>إنشاء ورقة خروج جديدة</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المتعلم(ة)</label>
            <select value={learnerId} onChange={(e) => setLearnerId(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <option value="">اختر المتعلم...</option>
              {learners.map(l => <option key={l.id} value={l.id}>{l.arabicName} ({l.registrationNumber})</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نوع الخروج</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <option value="مؤقت">مؤقت (مع عودة)</option>
                <option value="لبقية اليوم">لبقية اليوم</option>
              </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وقت المغادرة</label>
                <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سبب الخروج</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: موعد طبي، ظرف عائلي..." className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الوجهة (اختياري)</label>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المرافق (اختياري)</label>
                <input type="text" value={companion} onChange={(e) => setCompanion(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">إلغاء</button>
          <button onClick={handleSubmit} className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all">حفظ ورقة الخروج</button>
        </div>
      </div>
    </div>
  );
};
