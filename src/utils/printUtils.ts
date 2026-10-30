import { AppSettings } from '../types';

export interface PrintOptions {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  settings: AppSettings;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'A5' | 'Letter';
  margin?: '5mm' | '10mm' | '15mm';
  showOfficialHeader?: boolean;
  showFooter?: boolean;
  scale?: number; // 0.75, 0.8, 0.9, 1.0
}

export function generateOfficialHeaderHtml(settings: AppSettings, title?: string, subtitle?: string): string {
  const schoolYear = settings.schoolYear || '2025/2026';
  const ministryLogo = settings.ministryLogoDataURL ? `<img src="${settings.ministryLogoDataURL}" style="height: 60px; max-width: 140px; object-fit: contain;" alt="الوزارة" />` : '';
  const schoolLogo = settings.schoolLogoDataURL ? `<img src="${settings.schoolLogoDataURL}" style="height: 55px; max-width: 120px; object-fit: contain;" alt="المدرسة" />` : '';
  const associationLogo = settings.associationLogoDataURL ? `<img src="${settings.associationLogoDataURL}" style="height: 60px; max-width: 140px; object-fit: contain;" alt="الجمعية" />` : '';

  return `
    <div style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; font-family: 'Cairo', 'Tajawal', sans-serif;" dir="rtl">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        
        <!-- Right: Ministry Info -->
        <div style="display: flex; align-items: center; gap: 10px; text-align: right;">
          ${ministryLogo}
          <div style="line-height: 1.35; font-size: 8.5pt;">
            <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">المملكة المغربية</div>
            <div style="font-weight: bold; color: #1e293b;">وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
            <div style="color: #334155;">الأكاديمية الجهوية للتربية والتكوين</div>
            <div style="color: #475569; font-weight: 600;">المديرية الإقليمية الصخيرات تمارة</div>
          </div>
        </div>

        <!-- Center: School Name & Document Title -->
        <div style="text-align: center; flex: 1; padding: 0 10px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${schoolLogo}
            <h1 style="font-size: 14pt; font-weight: 900; margin: 0; color: #0f172a; line-height: 1.2;">
              ${settings.schoolName}
            </h1>
          </div>
          <div style="display: inline-block; background-color: #f1f5f9; color: #0f172a; font-size: 8pt; font-weight: bold; padding: 2px 10px; border-radius: 12px; border: 1px solid #cbd5e1; margin-top: 4px;">
            السنة الدراسية: ${schoolYear}
          </div>
          ${title ? `<h2 style="font-size: 13pt; font-weight: 800; color: #1e3a8a; margin: 6px 0 0 0; text-decoration: underline;">${title}</h2>` : ''}
          ${subtitle ? `<div style="font-size: 9pt; color: #475569; margin-top: 2px;">${subtitle}</div>` : ''}
        </div>

        <!-- Left: Association Info -->
        <div style="display: flex; align-items: center; gap: 10px; text-align: left;">
          <div style="line-height: 1.35; font-size: 8.5pt; text-align: left;">
            <div style="font-weight: bold; color: #0f172a;">الهيئة المغربية للتربية والتنمية</div>
            <div style="color: #334155;">مدرسة الفرصة الثانية الجيل الجديد</div>
            <div style="color: #475569; font-weight: 600;">مركز زرارة</div>
          </div>
          ${associationLogo}
        </div>

      </div>
    </div>
  `;
}

export function generateOfficialFooterHtml(settings: AppSettings): string {
  const today = new Date().toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div style="width: 100%; margin-top: 20px; pt-8px; border-top: 1px solid #cbd5e1; font-family: 'Cairo', 'Tajawal', sans-serif; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; align-items: center;" dir="rtl">
      <div>تاريخ الطباعة: ${today} · تطبيق «تدبير المتعلمين»</div>
      <div>مدرسة الفرصة الثانية الجيل الجديد زرارة</div>
      <div style="font-weight: bold;">توقيع وخاتم الإدارة: ........................</div>
    </div>
  `;
}

export function printHtmlDocument(options: PrintOptions): void {
  const {
    title,
    subtitle,
    bodyHtml,
    settings,
    orientation = 'portrait',
    paperSize = 'A4',
    margin = '10mm',
    showOfficialHeader = true,
    showFooter = true,
    scale = 1.0,
  } = options;

  const headerHtml = showOfficialHeader ? generateOfficialHeaderHtml(settings, title, subtitle) : (title ? `<h1 style="text-align: center; font-size: 16pt; margin-bottom: 12px; font-family: 'Cairo', sans-serif;">${title}</h1>` : '');
  const footerHtml = showFooter ? generateOfficialFooterHtml(settings) : '';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const fullContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${paperSize} ${orientation};
            margin: ${margin};
          }
          
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-family: 'Cairo', 'Tajawal', system-ui, sans-serif;
            background-color: #ffffff;
            color: #000000;
            margin: 0;
            padding: 0;
            direction: rtl;
            text-align: right;
            font-size: ${scale < 1 ? `${10 * scale}pt` : '10pt'};
          }

          .print-wrapper {
            width: 100%;
            margin: 0 auto;
            transform: scale(${scale});
            transform-origin: top right;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 8px;
            page-break-inside: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th, td {
            border: 1px solid #1e293b;
            padding: 5px 7px;
            text-align: right;
            font-size: ${scale < 1 ? `${9 * scale}pt` : '9pt'};
            vertical-align: middle;
          }

          th {
            background-color: #f1f5f9;
            font-weight: 700;
            color: #0f172a;
          }

          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: bold;
          }

          .badge-green { background-color: #dcfce7; color: #166534; }
          .badge-red { background-color: #ffe4e6; color: #9f1239; }
          .badge-amber { background-color: #fef3c7; color: #92400e; }
          .badge-blue { background-color: #dbeafe; color: #1e40af; }

          .page-break {
            page-break-before: always;
            break-before: page;
          }

          .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${headerHtml}
          <div class="print-body">
            ${bodyHtml}
          </div>
          ${footerHtml}
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(fullContent);
  doc.close();

  // Wait for images and fonts to load before opening print window
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 400);
}
