import React, { useState } from 'react';
import { Stethoscope, X, CheckCircle2, User, Clock, FileText } from 'lucide-react';
import { Learner, InfirmaryVisit } from '../types';

interface InfirmaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  learners: Learner[];
  onSave: (visit: InfirmaryVisit) => void;
}

export const InfirmaryModal: React.FC<InfirmaryModalProps> = ({ isOpen, onClose, learners, onSave }) => {
  const [learnerId, setLearnerId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [treatment, setTreatment] = useState('');
  const [institution, setInstitution] = useState('');
  const [companion, setCompanion] = useState('');
  const [timeOut, setTimeOut] = useState(new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [status, setStatus] = useState<InfirmaryVisit['status']>('في انتظار المغادرة');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const selectedLearner = learners.find(l => l.id === learnerId);
    if (!selectedLearner || !complaint) return;
    
    onSave({
      id: `inf_${Date.now()}`,
      visitNumber: '', // Generated in parent
      learnerId,
      learnerName: selectedLearner.arabicName,
      registrationNumber: selectedLearner.registrationNumber,
      className: selectedLearner.className,
      stream: selectedLearner.stream,
      date: new Date().toISOString().split('T')[0],
      timeOut,
      complaint,
      treatment,
      companion,
      institution,
      status,
      createdAt: new Date().toISOString(),
    });
    
    // Reset
    setLearnerId('');
    setComplaint('');
    setTreatment('');
    setInstitution('');
    setCompanion('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            <span>تسجيل زيارة مستوصف جديدة</span>
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وقت المغادرة</label>
                <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الحالة الأولية</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <option value="في انتظار المغادرة">في انتظار المغادرة</option>
                <option value="غادر المركز">غادر المركز</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الشكاية (الأعراض)</label>
            <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المؤسسة الصحية</label>
                <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="مثال: مستوصف زيرارة" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المرافق (إن وجد)</label>
                <input type="text" value={companion} onChange={(e) => setCompanion(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">إلغاء</button>
          <button onClick={handleSubmit} className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all">حفظ الزيارة</button>
        </div>
      </div>
    </div>
  );
};
