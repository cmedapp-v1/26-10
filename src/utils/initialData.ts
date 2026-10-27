import { Learner, AttendanceRecord, AppSettings, ScheduledSession, Holiday, Violation, CommitmentRecord } from '../types';

export const DEFAULT_VIOLATION_TYPES: string[] = [
  'عدم احترام النظام الداخلي',
  'الشغب',
  'العنف',
  'عدم احترام الأطر التربوية والإدارية',
  'إتلاف الممتلكات',
  'الغياب أو التأخر المتكرر',
  'مخالفة أخرى',
];

export const STANDARD_VIOLATION_ACTIONS: string[] = [
  'تنبيه شفهي',
  'إنذار كتابي',
  'تحرير التزام باحترام النظام الداخلي',
  'استدعاء ولي الأمر عند الاقتضاء',
  'تسجيل جلسة استماع أو اجتماع إداري',
  'متابعة سلوك المتعلم وتسجيل الملاحظات',
  'إغلاق ملف المخالفة بعد استكمال الإجراءات',
];

export const DEFAULT_COMMITMENT_TEXT = `أنا الموقع(ة) أسفله، أتعهد باحترام النظام الداخلي لمركز الفرصة الثانية الجيل الجديد زرارة، والالتزام بقواعد الانضباط وحسن السلوك، واحترام الأطر التربوية والإدارية وباقي المتعلمين، والمحافظة على ممتلكات المركز وتجهيزاته، والمواظبة على الحضور والمشاركة الإيجابية في الأنشطة التكوينية.

كما أتعهد بتجنب السلوكيات المخالفة للنظام الداخلي، والعمل على تصحيح أي سلوك غير مناسب، مع علمي بأن الإخلال بهذا الالتزام قد يستدعي اتخاذ الإجراءات التربوية والإدارية المناسبة وفق النظام الداخلي المعتمد بالمركز.`;


export const DEFAULT_SETTINGS: AppSettings = {
  schoolName: 'مركز الفرصة الثانية – الجيل الجديد زرارة',
  schoolNameFull: 'الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة\nالمديرية الإقليمية الصخيرات تمارة\nمركز الفرصة الثانية الجيل الجديد زرارة',
  schoolYear: '2025/2026',
  alertThreshold: 3,
  classes: [
    'القسم 1 - تكوين أساسي',
    'القسم 2 - مهني مستوى 1',
    'القسم 3 - مهني مستوى 2',
  ],
  streams: [
    'المعلوماتيات والرقمنة',
    'الكهرباء والميكانيك',
    'الحلاقة والخياطة',
    'الفلاحة المستدامة',
  ],
  sessions: ['09:00–11:00', '11:00–13:00', '14:00–16:00'],
  violationTypes: DEFAULT_VIOLATION_TYPES,
  schoolLogoDataURL: null,
  ministryLogoDataURL: null,
  associationLogoDataURL: '/assets/aistudio/cmedmaroc.org_-440x131_8fa2c039.jpeg',
};

export const SAMPLE_LEARNERS: Learner[] = [
  {
    id: 'lrn_1',
    registrationNumber: 'ZR-0001',
    arabicName: 'أمين المنصوري',
    frenchName: 'Amine El Mansouri',
    masarCode: 'G138291042',
    gender: 'ذكر',
    className: 'القسم 1 - تكوين أساسي',
    stream: 'المعلوماتيات والرقمنة',
    previousLevel: 'الثالثة إعدادي',
    parentPhone: '0661234567',
    whatsapp: '0661234567',
    address: 'حي الأمل، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-10',
  },
  {
    id: 'lrn_2',
    registrationNumber: 'ZR-0002',
    arabicName: 'فاطمة الزهراء بنعلي',
    frenchName: 'Fatima-Zahra Benaali',
    masarCode: 'G139827163',
    gender: 'أنثى',
    className: 'القسم 1 - تكوين أساسي',
    stream: 'الحلاقة والخياطة',
    previousLevel: 'السادسة ابتدائي',
    parentPhone: '0662345678',
    whatsapp: '0662345678',
    address: 'الدوار المركزي، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-10',
  },
  {
    id: 'lrn_3',
    registrationNumber: 'ZR-0003',
    arabicName: 'يوسف العثماني',
    frenchName: 'Youssef El Outhmani',
    masarCode: 'G131102948',
    gender: 'ذكر',
    className: 'القسم 2 - مهني مستوى 1',
    stream: 'الكهرباء والميكانيك',
    previousLevel: 'الأولى إعدادي',
    parentPhone: '0663456789',
    whatsapp: '0663456789',
    address: 'حي الزيتون، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-11',
  },
  {
    id: 'lrn_4',
    registrationNumber: 'ZR-0004',
    arabicName: 'مريم العلمي',
    frenchName: 'Meryem El Alami',
    masarCode: 'G137592014',
    gender: 'أنثى',
    className: 'القسم 1 - تكوين أساسي',
    stream: 'المعلوماتيات والرقمنة',
    previousLevel: 'الثانية إعدادي',
    parentPhone: '0664567890',
    whatsapp: '0664567890',
    address: 'حي النهضة، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-11',
  },
  {
    id: 'lrn_5',
    registrationNumber: 'ZR-0005',
    arabicName: 'حمزة المودن',
    frenchName: 'Hamza El Moudene',
    masarCode: 'G134019283',
    gender: 'ذكر',
    className: 'القسم 3 - مهني مستوى 2',
    stream: 'الفلاحة المستدامة',
    previousLevel: 'الثالثة إعدادي',
    parentPhone: '0665678901',
    whatsapp: '0665678901',
    address: 'حي المسيرة، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-12',
  },
  {
    id: 'lrn_6',
    registrationNumber: 'ZR-0006',
    arabicName: 'خديجة الصقلي',
    frenchName: 'Khadija Es-Saqali',
    masarCode: 'G132983710',
    gender: 'أنثى',
    className: 'القسم 2 - مهني مستوى 1',
    stream: 'الحلاقة والخياطة',
    previousLevel: 'السادسة ابتدائي',
    parentPhone: '0666789012',
    whatsapp: '0666789012',
    address: 'شارع الحسن الثاني، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-12',
  },
  {
    id: 'lrn_7',
    registrationNumber: 'ZR-0007',
    arabicName: 'عمر الإدريسي',
    frenchName: 'Omar El Idrissi',
    masarCode: 'G136612984',
    gender: 'ذكر',
    className: 'القسم 2 - مهني مستوى 1',
    stream: 'الكهرباء والميكانيك',
    previousLevel: 'الأولى إعدادي',
    parentPhone: '0667890123',
    whatsapp: '0667890123',
    address: 'حي الوفاء، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-14',
  },
  {
    id: 'lrn_8',
    registrationNumber: 'ZR-0008',
    arabicName: 'زينب التازي',
    frenchName: 'Zineb Tazi',
    masarCode: 'G135549012',
    gender: 'أنثى',
    className: 'القسم 3 - مهني مستوى 2',
    stream: 'المعلوماتيات والرقمنة',
    previousLevel: 'الثالثة إعدادي',
    parentPhone: '0668901234',
    whatsapp: '0668901234',
    address: 'دوار أولاد موسى، زيرارة',
    status: 'نشط',
    createdAt: '2025-09-15',
  },
  {
    id: 'lrn_9',
    registrationNumber: 'ZR-0009',
    arabicName: 'طارق الناصري',
    frenchName: 'Tariq En-Naciri',
    masarCode: 'G130091234',
    gender: 'ذكر',
    className: 'القسم 3 - مهني مستوى 2',
    stream: 'الفلاحة المستدامة',
    previousLevel: 'الثانية إعدادي',
    parentPhone: '0669012345',
    whatsapp: '0669012345',
    address: 'حي الفرح، زيرارة',
    status: 'منقطع',
    createdAt: '2025-09-15',
  },
  {
    id: 'lrn_10',
    registrationNumber: 'ZR-0010',
    arabicName: 'سلمى الفاسي',
    frenchName: 'Salma El Fassi',
    masarCode: 'G131182390',
    gender: 'أنثى',
    className: 'القسم 1 - تكوين أساسي',
    stream: 'الحلاقة والخياطة',
    previousLevel: 'السادسة ابتدائي',
    parentPhone: '0670123456',
    whatsapp: '0670123456',
    address: 'حي السلام، زيرارة',
    status: 'مغادر',
    createdAt: '2025-09-16',
  },
];

export const generateSampleAttendanceRecords = (learners: Learner[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  // Generate records for the last 10 days
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends (Sunday=0, Saturday=6 depending on school days, let's keep Sun as day off)
    if (d.getDay() === 0) continue; 
    const dateStr = d.toISOString().split('T')[0];

    const sessions = ['09:00–11:00', '11:00–13:00', '14:00–16:00'];
    
    learners.forEach((learner) => {
      // Only record for active or formerly active learners
      sessions.forEach((session) => {
        // deterministic pseudo-random status based on learner id and date
        const charCodeSum = (learner.id + dateStr + session).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rand = charCodeSum % 100;
        
        let status: 'حاضر' | 'غائب' | 'متأخر' | 'غياب مبرر' = 'حاضر';
        let reason = '';

        if (learner.id === 'lrn_1' && (i === 1 || i === 2 || i === 3)) {
          // Trigger threshold warning for Amine
          status = 'غائب';
          reason = 'غياب غير مصرح به';
        } else if (learner.id === 'lrn_3' && i === 1) {
          status = 'متأخر';
          reason = 'تأخر النقل المبرمج';
        } else if (learner.id === 'lrn_6' && i === 2) {
          status = 'غياب مبرر';
          reason = 'شهادة طبية لمصحة الحي';
        } else if (rand < 78) {
          status = 'حاضر';
        } else if (rand < 88) {
          status = 'متأخر';
          reason = 'عطب في وسائل النقل';
        } else if (rand < 94) {
          status = 'غياب مبرر';
          reason = 'ظروف عائلية قاهرة';
        } else {
          status = 'غائب';
          reason = 'بدون عذر';
        }

        records.push({
          id: `att_${learner.id}_${dateStr}_${session.replace(/[^0-9]/g, '')}`,
          learnerId: learner.id,
          date: dateStr,
          session,
          status,
          reason,
          updatedAt: new Date(d.getTime() + 10000).toISOString(),
        });
      });
    });
  }

  return records;
};

export const SAMPLE_SCHEDULE: ScheduledSession[] = [
  {
    id: 'sch_1',
    dayOfWeek: 'الاثنين',
    timeSlot: '09:00–11:00',
    sessionType: 'التأهيل التربوي',
    subject: 'اللغة العربية والتواصل الوظيفي',
    animator: 'أ. محمد العلوي',
    classes: ['القسم 1 - تكوين أساسي'],
    streams: ['المعلوماتيات والرقمنة', 'الحلاقة والخياطة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_2',
    dayOfWeek: 'الاثنين',
    timeSlot: '11:00–13:00',
    sessionType: 'التأهيل التربوي',
    subject: 'الرياضيات والعلوم التطبيقية',
    animator: 'أ. فاطمة الزهراء بنعلي',
    classes: ['القسم 1 - تكوين أساسي'],
    streams: ['المعلوماتيات والرقمنة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_3',
    dayOfWeek: 'الاثنين',
    timeSlot: '14:00–16:00',
    sessionType: 'التأهيل المهني',
    subject: 'ورشة الإعلاميات والرقمنة',
    animator: 'أ. رشيد بنسعيد',
    classes: ['القسم 1 - تكوين أساسي', 'القسم 2 - مهني مستوى 1'],
    streams: ['المعلوماتيات والرقمنة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_4',
    dayOfWeek: 'الثلاثاء',
    timeSlot: '09:00–13:00',
    sessionType: 'التأهيل المهني',
    subject: 'ورشة الكهرباء والميكانيك التطبيقية',
    animator: 'أ. طارق التازي',
    classes: ['القسم 2 - مهني مستوى 1'],
    streams: ['الكهرباء والميكانيك'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_5',
    dayOfWeek: 'الثلاثاء',
    timeSlot: '14:00–16:00',
    sessionType: 'التأهيل التربوي',
    subject: 'الفرنسية الوظيفية وسوق الشغل',
    animator: 'أ. نادية العمراني',
    classes: ['القسم 2 - مهني مستوى 1'],
    streams: ['الكهرباء والميكانيك', 'المعلوماتيات والرقمنة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_6',
    dayOfWeek: 'الأربعاء',
    timeSlot: '09:00–13:00',
    sessionType: 'التأهيل المهني',
    subject: 'ورشة الحلاقة والتصميم والخياطة',
    animator: 'أ. خديجة العبدلاوي',
    classes: ['القسم 1 - تكوين أساسي', 'القسم 2 - مهني مستوى 1'],
    streams: ['الحلاقة والخياطة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_7',
    dayOfWeek: 'الأربعاء',
    timeSlot: '14:00–16:00',
    sessionType: 'التأهيل التربوي',
    subject: 'التوجيه وبناء المشروع الشخصي',
    animator: 'أ. يوسف العالمي',
    classes: ['القسم 1 - تكوين أساسي', 'القسم 2 - مهني مستوى 1', 'القسم 3 - مهني مستوى 2'],
    streams: ['المعلوماتيات والرقمنة', 'الكهرباء والميكانيك', 'الحلاقة والخياطة', 'الفلاحة المستدامة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_8',
    dayOfWeek: 'الخميس',
    timeSlot: '09:00–11:00',
    sessionType: 'التأهيل التربوي',
    subject: 'التربية المواطنة والبيئة',
    animator: 'أ. محمد العلوي',
    classes: ['القسم 3 - مهني مستوى 2'],
    streams: ['الفلاحة المستدامة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_9',
    dayOfWeek: 'الخميس',
    timeSlot: '11:00–13:00',
    sessionType: 'التأهيل المهني',
    subject: 'تقنيات الفلاحة المستدامة والري',
    animator: 'أ. كريم الإدريسي',
    classes: ['القسم 3 - مهني مستوى 2'],
    streams: ['الفلاحة المستدامة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_10',
    dayOfWeek: 'الخميس',
    timeSlot: '14:00–16:00',
    sessionType: 'التأهيل المهني',
    subject: 'الميكانيك الزراعي والصيانة',
    animator: 'أ. طارق التازي',
    classes: ['القسم 3 - مهني مستوى 2'],
    streams: ['الفلاحة المستدامة', 'الكهرباء والميكانيك'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_11',
    dayOfWeek: 'الجمعة',
    timeSlot: '09:00–11:00',
    sessionType: 'التأهيل التربوي',
    subject: 'المهارات الحياتية والمقاولة الذاتية',
    animator: 'أ. نادية العمراني',
    classes: ['القسم 1 - تكوين أساسي', 'القسم 2 - مهني مستوى 1', 'القسم 3 - مهني مستوى 2'],
    streams: ['المعلوماتيات والرقمنة', 'الكهرباء والميكانيك', 'الحلاقة والخياطة', 'الفلاحة المستدامة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
  {
    id: 'sch_12',
    dayOfWeek: 'الجمعة',
    timeSlot: '11:00–13:00',
    sessionType: 'التأهيل المهني',
    subject: 'ورشة الخياطة التطبيقية والتفصيل',
    animator: 'أ. خديجة العبدلاوي',
    classes: ['القسم 1 - تكوين أساسي'],
    streams: ['الحلاقة والخياطة'],
    isRecurring: true,
    createdAt: '2025-09-01',
  },
];

export const SAMPLE_HOLIDAYS: Holiday[] = [
  {
    id: 'hol_1',
    title: 'العطلة البينية الأولى',
    startDate: '2025-10-26',
    endDate: '2025-11-02',
    type: 'مدرسية',
  },
  {
    id: 'hol_2',
    title: 'ذكرى المسيرة الخضراء',
    startDate: '2025-11-06',
    endDate: '2025-11-06',
    type: 'وطنية',
  },
  {
    id: 'hol_3',
    title: 'عيد الاستقلال المجيد',
    startDate: '2025-11-18',
    endDate: '2025-11-18',
    type: 'وطنية',
  },
  {
    id: 'hol_4',
    title: 'رأس السنة الميلادية',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    type: 'وطنية',
  },
  {
    id: 'hol_5',
    title: 'وثيقة المطالبة بالاستقلال',
    startDate: '2026-01-11',
    endDate: '2026-01-11',
    type: 'وطنية',
  },
  {
    id: 'hol_6',
    title: 'رأس السنة الأمازيغية',
    startDate: '2026-01-14',
    endDate: '2026-01-14',
    type: 'وطنية',
  },
  {
    id: 'hol_7',
    title: 'عطلة منتصف السنة الدراسية',
    startDate: '2026-01-25',
    endDate: '2026-02-01',
    type: 'مدرسية',
  },
];

export const SAMPLE_VIOLATIONS: Violation[] = [
  {
    id: 'vio_1',
    violationNumber: 'MKH-2026-0001',
    learnerId: 'lrn_1',
    learnerName: 'أمين المنصوري',
    registrationNumber: 'ZR-0001',
    className: 'القسم 1 - تكوين أساسي',
    stream: 'المعلوماتيات والرقمنة',
    date: '2026-02-15',
    time: '11:30',
    type: 'عدم احترام النظام الداخلي',
    description: 'استخدام الهاتف النقال أثناء الحصة التفاعلية والتشويش على زملائه رغم التنبيه الأولي.',
    location: 'قاعة المعلوميات',
    actionTaken: 'إنذار شفهي وتنبيه كتابي',
    status: 'تمت المعالجة',
    recordedBy: 'ذ. عبد الرحيم السالمي',
    notes: 'تمت مناقشة الأمر مع المتعلم ووعد بعدم التكرار.',
    createdAt: '2026-02-15T11:45:00Z',
    actionHistory: [
      {
        id: 'act_1_1',
        date: '2026-02-15',
        action: 'توجيه إنذار شفهي ومصادرة الهاتف مؤقتا إلى نهاية الحصة',
        notes: 'حضور الأستاذ المؤطر وموافقة المتعلم على الالتزام',
        recordedBy: 'ذ. عبد الرحيم السالمي'
      },
      {
        id: 'act_1_2',
        date: '2026-02-16',
        action: 'توقيع تعهد باحترام ميثاق القسم',
        notes: 'تسوية الوضعية والتأكيد على الانضباط',
        recordedBy: 'الحراسة العامة'
      }
    ]
  },
  {
    id: 'vio_2',
    violationNumber: 'MKH-2026-0002',
    learnerId: 'lrn_3',
    learnerName: 'يوسف العثماني',
    registrationNumber: 'ZR-0003',
    className: 'القسم 2 - مهني مستوى 1',
    stream: 'الكهرباء والميكانيك',
    date: '2026-02-20',
    time: '14:20',
    type: 'مخالفة قواعد السلامة والوقاية',
    description: 'عدم ارتداء بذلة العمل الوقائية والنظارات الحامية داخل ورشة التكوين الميكانيكي وتجاوز حدود الأمان.',
    location: 'ورشة الكهرباء والميكانيك',
    actionTaken: 'استدعاء ولي الأمر وتوقيع التزام',
    status: 'قيد المعالجة',
    recordedBy: 'ذ. مصطفى التازي',
    notes: 'في انتظار حضور ولي الأمر للمؤسسة.',
    createdAt: '2026-02-20T14:35:00Z',
    actionHistory: [
      {
        id: 'act_2_1',
        date: '2026-02-20',
        action: 'توقيف مؤقت عن الأشغال التطبيقية للورشة وإرسال إشعار للمديرية',
        notes: 'حفاظاً على سلامته وسلامة زملائه',
        recordedBy: 'مؤطر الورشة'
      }
    ]
  },
  {
    id: 'vio_3',
    violationNumber: 'MKH-2026-0003',
    learnerId: 'lrn_5',
    learnerName: 'حمزة المودن',
    registrationNumber: 'ZR-0005',
    className: 'القسم 3 - مهني مستوى 2',
    stream: 'الفلاحة المستدامة',
    date: '2026-02-24',
    time: '10:00',
    type: 'الشجار أو الاعتداء اللفظي/الجسدي',
    description: 'مشادة كلامية وسلوك غير لائق في فناء المؤسسة أثناء فترة الاستراحة الصباحية.',
    location: 'ساحة المؤسسة',
    actionTaken: 'إحالة على مجلس الانضباط',
    status: 'جديدة',
    recordedBy: 'الحارس العام للخارجية',
    notes: 'تسجيل التقرير لعرضه في الاجتماع القادم.',
    createdAt: '2026-02-24T10:15:00Z',
    actionHistory: []
  }
];

export const SAMPLE_COMMITMENTS: CommitmentRecord[] = [
  {
    id: 'cmt_1',
    commitmentNumber: 'ILTZ-2026-0001',
    learnerId: 'lrn_3',
    learnerName: 'يوسف العثماني',
    registrationNumber: 'ZR-0003',
    className: 'القسم 2 - مهني مستوى 1',
    stream: 'الكهرباء والميكانيك',
    date: '2026-02-21',
    violationId: 'vio_2',
    violationNumber: 'MKH-2026-0002',
    text: DEFAULT_COMMITMENT_TEXT,
    notes: 'تم استقبال ولي الأمر وتأكيد الالتزام بقواعد السلامة والوقاية داخل الورشة المهنية',
    status: 'قيد المتابعة',
    guardianName: 'محمد العثماني',
    guardianPhone: '0663456789',
    guardianCin: 'AA123456',
    recordedBy: 'إدارة المركز',
    exportDate: '2026-02-21',
    lastFollowUpDate: '2026-02-25',
    createdAt: '2026-02-21T10:30:00Z',
  },
  {
    id: 'cmt_2',
    commitmentNumber: 'ILTZ-2026-0002',
    learnerId: 'lrn_1',
    learnerName: 'أمين المنصوري',
    registrationNumber: 'ZR-0001',
    className: 'القسم 1 - تكوين أساسي',
    stream: 'المعلوماتيات والرقمنة',
    date: '2026-02-16',
    violationId: 'vio_1',
    violationNumber: 'MKH-2026-0001',
    text: DEFAULT_COMMITMENT_TEXT,
    notes: 'التزام بحسن السلوك والانضباط الصفي والمحافظة على حواسيب قاعة الإعلاميات',
    status: 'تمت المتابعة',
    guardianName: 'عبد الكريم المنصوري',
    guardianPhone: '0661234567',
    recordedBy: 'إدارة المركز',
    exportDate: '2026-02-16',
    lastFollowUpDate: '2026-02-20',
    createdAt: '2026-02-16T11:00:00Z',
  }
];

