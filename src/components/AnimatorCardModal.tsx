import React, { useMemo } from 'react';
import { 
  X, 
  UserCheck, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Printer, 
  Edit, 
  Briefcase, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileText
} from 'lucide-react';
import { Animator, ScheduledSession, AppSettings } from '../types';

interface AnimatorCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  animator: Animator | null;
  schedule: ScheduledSession[];
  settings: AppSettings;
  onEdit: (animator: Animator) => void;
}

const DAYS_ORDER = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export const AnimatorCardModal: React.FC<AnimatorCardModalProps> = ({
  isOpen,
  onClose,
  animator,
  schedule,
  settings,
  onEdit,
}) => {
  if (!isOpen || !animator) return null;

  // Find all sessions assigned to this animator
  const assignedSessions = useMemo(() => {
    return schedule.filter(
      (s) =>
        (s.animatorId && s.animatorId === animator.id) ||
        s.animator.trim().toLowerCase() === animator.arabicName.trim().toLowerCase()
    );
  }, [schedule, animator]);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const map: Record<string, ScheduledSession[]> = {};
    DAYS_ORDER.forEach((day) => {
      map[day] = [];
    });
    assignedSessions.forEach((s) => {
      if (!map[s.dayOfWeek]) {
        map[s.dayOfWeek] = [];
      }
      map[s.dayOfWeek].push(s);
    });
    return map;
  }, [assignedSessions]);

  // Calculate approximate weekly hours
  const weeklyHours = useMemo(() => {
    let hours = 0;
    assignedSessions.forEach((s) => {
      if (s.timeSlot === '09:00–13:00') hours += 4;
      else if (s.timeSlot === '09:00–11:00' || s.timeSlot === '11:00–13:00' || s.timeSlot === '14:00–16:00') hours += 2;
      else hours += 2;
    });
    return hours;
  }, [assignedSessions]);

  const handlePrintCard = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const sessionsTableHtml = assignedSessions.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #0f172a;">
            <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">اليوم</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">التوقيت</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">المادة / النشاط</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">نوع الحصة</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">الأقسام</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">الشعب</th>
          </tr>
        </thead>
        <tbody>
          ${assignedSessions.map((s) => `
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${s.dayOfWeek}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${s.timeSlot}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${s.subject}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${s.sessionType}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px;">${s.classes.join('، ')}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px;">${s.streams.join('، ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="font-size: 10pt; color: #64748b; font-style: italic; margin-top: 6px;">لا توجد حصص مبرمجة حالياً في التخطيط الأسبوعي.</p>';

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>بطاقة منشط - ${animator.arabicName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            line-height: 1.4;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title-banner {
            background-color: #f8fafc;
            border: 1.5px solid #0f172a;
            text-align: center;
            padding: 8px;
            margin-bottom: 16px;
            border-radius: 4px;
          }
          .section-title {
            font-size: 11pt;
            font-weight: bold;
            background-color: #e2e8f0;
            padding: 4px 8px;
            border-right: 4px solid #1e3a8a;
            margin-top: 14px;
            margin-bottom: 8px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 10pt;
          }
          .item-row {
            display: flex;
            padding: 3px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .label {
            font-weight: bold;
            color: #475569;
            width: 140px;
          }
          .value {
            font-weight: 600;
            color: #0f172a;
            flex: 1;
          }
          .signature-box {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 10pt;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div style="text-align: right; line-height: 1.35; font-size: 9.5pt;">
            <div style="font-weight: bold; font-size: 10.5pt;">المملكة المغربية</div>
            <div style="font-weight: bold; color: #334155;">وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
            <div style="color: #475569;">الأكاديمية الجهوية للتربية والتكوين جهة الرباط - سلا - القنيطرة</div>
            <div style="color: #475569;">المديرية الإقليمية بسيدي قاسم</div>
          </div>
          <div style="text-align: center;">
            ${settings.ministryLogoDataURL ? `<img src="${settings.ministryLogoDataURL}" style="height: 60px; max-width: 140px; object-fit: contain;" alt="شعار الوزارة" />` : ''}
          </div>
          <div style="text-align: left; line-height: 1.35; font-size: 9.5pt;">
            <div style="font-weight: bold; font-size: 10pt; color: #1e3a8a;">مركز الفرصة الثانية - الجيل الجديد زرارة</div>
            <div style="color: #475569;">السنة الدراسية: ${settings.schoolYear}</div>
            <div style="color: #64748b; font-size: 8.5pt;">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-MA')}</div>
          </div>
        </div>

        <div class="title-banner">
          <h2 style="margin: 0; font-size: 14pt; color: #0f172a;">بطاقة المنشط / المؤطر (FICHE ANIMATEUR)</h2>
          <div style="font-size: 9.5pt; color: #475569; margin-top: 4px;">الرقم التعريفي: <strong>${animator.registrationNumber}</strong> — الوضعية: <strong>${animator.status}</strong></div>
        </div>

        <div class="section-title">1. المعلومات الشخصية والمهنية</div>
        <div class="grid">
          <div>
            <div class="item-row"><span class="label">الاسم الكامل (عربي):</span><span class="value" style="font-size: 11pt; font-weight: bold;">${animator.arabicName}</span></div>
            <div class="item-row"><span class="label">الاسم بالفرنسية:</span><span class="value" style="font-family: sans-serif;">${animator.frenchName || '-'}</span></div>
            <div class="item-row"><span class="label">نوع النشاط:</span><span class="value" style="color: #1e3a8a; font-weight: bold;">${animator.activityType}</span></div>
            <div class="item-row"><span class="label">التخصص / المجال:</span><span class="value" style="font-weight: bold;">${animator.specialty}</span></div>
          </div>
          <div>
            <div class="item-row"><span class="label">الرقم التعريفي:</span><span class="value" style="font-family: monospace; font-weight: bold;">${animator.registrationNumber}</span></div>
            <div class="item-row"><span class="label">رقم الهاتف:</span><span class="value" style="font-family: monospace;">${animator.phone}</span></div>
            <div class="item-row"><span class="label">البريد الإلكتروني:</span><span class="value" style="font-family: sans-serif;">${animator.email || '-'}</span></div>
            <div class="item-row"><span class="label">تاريخ بداية العمل:</span><span class="value">${animator.startDate}</span></div>
          </div>
        </div>

        <div class="section-title">2. الأقسام والشعب المسندة</div>
        <div class="item-row"><span class="label">الأقسام المسندة:</span><span class="value">${animator.assignedClasses.join('، ') || 'غير محدد'}</span></div>
        <div class="item-row"><span class="label">الشعب المسندة:</span><span class="value">${animator.assignedStreams.join('، ') || 'غير محدد'}</span></div>
        ${animator.notes ? `<div class="item-row"><span class="label">ملاحظات إدارية:</span><span class="value">${animator.notes}</span></div>` : ''}

        <div class="section-title">3. الحصص المبرمجة أسبوعياً (${assignedSessions.length} حصص — حوالي ${weeklyHours} ساعة أسبوعياً)</div>
        ${sessionsTableHtml}

        <div class="signature-box">
          <div>
            <strong>توقيع المنشط(ة)</strong><br /><br /><br />
            <span>...............................</span>
          </div>
          <div>
            <strong>إدارة المركز / خاتم المؤسسة</strong><br /><br /><br />
            <span>...............................</span>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'نشط':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>نشط (Actif)</span>
          </span>
        );
      case 'غير نشط':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            <span>غير نشط (Inactif)</span>
          </span>
        );
      case 'متوقف عن العمل':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>متوقف عن العمل (Suspendu)</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
        {/* Modal Top Bar */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 md:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-bold text-2xl text-white shadow-inner">
                {animator.arabicName.trim().charAt(0) || 'م'}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black">{animator.arabicName}</h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-xs font-mono font-bold tracking-wider">
                    {animator.registrationNumber}
                  </span>
                </div>
                {animator.frenchName && (
                  <p className="text-sm text-blue-100 font-sans mt-0.5" dir="ltr">
                    {animator.frenchName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {getStatusBadge(animator.status)}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    animator.activityType === 'التأهيل التربوي'
                      ? 'bg-blue-900/60 text-blue-100 border border-blue-400/40'
                      : 'bg-emerald-900/60 text-emerald-100 border border-emerald-400/40'
                  }`}>
                    {animator.activityType === 'التأهيل التربوي' ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                    <span>{animator.activityType}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onEdit(animator)}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition border border-white/20"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل</span>
              </button>
              <button
                onClick={handlePrintCard}
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold transition shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة البطاقة PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Contact Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500">رقم الهاتف</div>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                    {animator.phone}
                  </div>
                </div>
              </div>
              <a
                href={`https://wa.me/212${animator.phone.replace(/^0/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition"
                title="مراسلة عبر واتساب"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">البريد الإلكتروني</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[170px]" dir="ltr">
                  {animator.email || 'غير مسجل'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">تاريخ بداية العمل</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {animator.startDate}
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Specialty & Assignments */}
            <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>المجال والتأطير</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-500">التخصص / مجال التكوين:</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {animator.specialty}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500">الأقسام المسندة:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {animator.assignedClasses.map((cls) => (
                      <span
                        key={cls}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-900"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500">الشعب والحرف المسندة:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {animator.assignedStreams.length > 0 ? (
                      animator.assignedStreams.map((stm) => (
                        <span
                          key={stm}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-900"
                        >
                          {stm}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">جميع شعب الأقسام المسندة</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Summary */}
            <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>الملاحظات والوضعية الإدارية</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-500">ملاحظات إدارية:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {animator.notes || 'لا توجد ملاحظات إدارية مسجلة.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 text-center">
                    <div className="text-[10px] font-bold text-slate-500">الحصص المبرمجة</div>
                    <div className="text-lg font-black text-blue-700 dark:text-blue-400 mt-0.5">
                      {assignedSessions.length} حصص
                    </div>
                  </div>
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                    <div className="text-[10px] font-bold text-slate-500">الحجم الزمني التقديري</div>
                    <div className="text-lg font-black text-indigo-700 dark:text-indigo-400 mt-0.5">
                      {weeklyHours} س / أسبوعياً
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timetable / Scheduled Sessions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>جدول الحصص المبرمجة أسبوعياً ({assignedSessions.length} حصص)</span>
              </h3>
            </div>

            {assignedSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
                لا توجد حصص مبرمجة حالياً لهذا المنشط في التخطيط الأسبوعي.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">اليوم</th>
                      <th className="py-2.5 px-3">التوقيت</th>
                      <th className="py-2.5 px-3">المادة / النشاط</th>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">الأقسام والشعب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assignedSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {session.dayOfWeek}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {session.timeSlot}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-blue-400">
                          {session.subject}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            session.sessionType === 'التأهيل التربوي'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          }`}>
                            {session.sessionType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {session.classes.join('، ')} {session.streams.length > 0 && `(${session.streams.join('، ')})`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition"
          >
            إغلاق
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(animator)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>تعديل بيانات المنشط</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
