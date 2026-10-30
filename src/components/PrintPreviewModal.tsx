import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  Sliders, 
  Eye, 
  Check, 
  Settings2,
  Maximize2,
  Minimize2,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { AppSettings } from '../types';
import { printHtmlDocument, generateOfficialHeaderHtml, generateOfficialFooterHtml } from '../utils/printUtils';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  bodyHtml?: string;
  printableBodyHtml?: string;
  settings: AppSettings;
  defaultOrientation?: 'portrait' | 'landscape';
  onExportExcel?: () => void;
  excelFilename?: string;
  fileName?: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  bodyHtml,
  printableBodyHtml,
  settings,
  defaultOrientation = 'portrait',
  onExportExcel,
  excelFilename,
  fileName,
}) => {
  const contentBodyHtml = printableBodyHtml || bodyHtml || '';
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);
  const [paperSize, setPaperSize] = useState<'A4' | 'A5' | 'Letter'>('A4');
  const [margin, setMargin] = useState<'5mm' | '10mm' | '15mm'>('10mm');
  const [scale, setScale] = useState<number>(1.0);
  const [showOfficialHeader, setShowOfficialHeader] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(true);

  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    printHtmlDocument({
      title,
      subtitle,
      bodyHtml: contentBodyHtml,
      settings,
      orientation,
      paperSize,
      margin,
      showOfficialHeader,
      showFooter,
      scale,
    });
  };

  const handleDownloadPdf = () => {
    // Uses print window with browser PDF stream or direct print-to-pdf prompt
    printHtmlDocument({
      title,
      subtitle,
      bodyHtml: contentBodyHtml,
      settings,
      orientation,
      paperSize,
      margin,
      showOfficialHeader,
      showFooter,
      scale,
    });
  };

  const officialHeaderHtml = showOfficialHeader ? generateOfficialHeaderHtml(settings, title, subtitle) : '';
  const officialFooterHtml = showFooter ? generateOfficialFooterHtml(settings) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn no-print" dir="rtl">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-right">
        
        {/* Top Control Toolbar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-snug">
                  معاينة الطباعة والمستند القياسي (Format A4)
                </h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {paperSize} {orientation === 'portrait' ? 'عمودي' : 'أفقي'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {title} {subtitle ? `· ${subtitle}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Settings Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            
            {/* Orientation */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  orientation === 'portrait' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📄 عمودي (Portrait)</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  orientation === 'landscape' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📜 أفقي (Landscape)</span>
              </button>
            </div>

            {/* Margins */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 px-2 text-[11px]">الهوامش:</span>
              <button
                type="button"
                onClick={() => setMargin('10mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${margin === '10mm' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
              >
                عادي (10мм)
              </button>
              <button
                type="button"
                onClick={() => setMargin('5mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${margin === '5mm' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
              >
                ضيق (5мм)
              </button>
            </div>

            {/* Scale/Zoom */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 px-2 text-[11px]">التحجيم:</span>
              <select
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="bg-transparent text-white font-bold px-2 py-1 outline-none text-xs"
              >
                <option value={1.0} className="bg-slate-800">100% (طبيعي)</option>
                <option value={0.9} className="bg-slate-800">90% (ملموم)</option>
                <option value={0.8} className="bg-slate-800">80% (مضغوط)</option>
                <option value={0.75} className="bg-slate-800">75% (مصغر)</option>
              </select>
            </div>

            {/* Header / Footer Toggles */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showOfficialHeader}
                onChange={(e) => setShowOfficialHeader(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>الترويسة الرسمية</span>
            </label>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl font-bold text-xs border border-emerald-500/40 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقية / A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Paper Sheet Preview Area */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto flex justify-center items-start">
          
          <div 
            ref={previewRef}
            style={{ 
              padding: margin,
              transform: `scale(${scale})`,
              transformOrigin: 'top center'
            }}
            className={`bg-white text-slate-900 shadow-2xl rounded-sm transition-all duration-300 font-sans text-right ${
              orientation === 'portrait' 
                ? 'w-[210mm] min-h-[297mm]' 
                : 'w-[297mm] min-h-[210mm]'
            }`}
          >
            {/* Render Official Header */}
            {showOfficialHeader && (
              <div dangerouslySetInnerHTML={{ __html: officialHeaderHtml }} />
            )}

            {/* Document Rendered Content */}
            <div 
              className="print-body-preview my-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contentBodyHtml }} 
            />

            {/* Render Footer */}
            {showFooter && (
              <div dangerouslySetInnerHTML={{ __html: officialFooterHtml }} />
            )}

          </div>

        </div>

        {/* Bottom Status Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between px-6 shrink-0">
          <div>
            تنسيق A4 مخصص ورسمي · هيدر الوزارة والمديرية الإقليمية · جاهز للطباعة المباشرة والتصدير
          </div>
          <div className="flex items-center gap-4 font-mono font-bold text-slate-300">
            <span>مقاس الورق: {orientation === 'portrait' ? '210×297 مم' : '297×210 مم'}</span>
            <span>الهامش: {margin}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
