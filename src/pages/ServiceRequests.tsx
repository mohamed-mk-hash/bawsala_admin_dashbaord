import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Search,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';

import { Card } from '../components/Card';
import { useLanguage } from '../i18n/LanguageContext';
import { db } from '../firebase';

type DateLike =
  | Date
  | Timestamp
  | {
      seconds: number;
      nanoseconds?: number;
    }
  | null
  | undefined;

type ServiceRequest = {
  id: string;

  userId?: string;
  userEmail?: string;

  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  servicePackage?: string;
  message?: string;
  privacy?: boolean;

  serviceId?: string | null;
  serviceSlug?: string;
  serviceTitle?: string;
  serviceType?: string;
  language?: string;

  serviceSpecificAnswers?: Record<string, unknown>;
  serviceSpecificQuestionLabels?: Record<string, string>;

  status?: string;
  adminStatus?: string;
  requestStatus?: string;
  rejectionReason?: string;

  technicalOfferId?: string;
  technicalOfferUrl?: string;
  technicalOfferMeta?: {
    title?: string;
    titleAr?: string;
    titleEn?: string;
    clientName?: string;
    clientNameAr?: string;
    clientNameEn?: string;
    offerLanguage?: OfferLanguage;
    availableLanguages?: OfferLanguage[];
    serviceCategory?: string;
    templateSlug?: string;
    publishedAt?: DateLike;
  };

  createdAt?: DateLike;
};

type OfferLanguage = 'ar' | 'en';
type OfferTemplateType = 'website-management' | 'curricula-programs';

type TechnicalOfferForm = {
  clientName: string;
  clientDescription: string;
  offerTitle: string;
  offerSubtitle: string;
  offerDate: string;
  validUntil: string;

  executiveSummary: string;
  currentSituation: string;
  goalAfterDevelopment: string;
  projectScope: string;

  proposedServices: string;
  deliverables: string;
  implementationPlan: string;
  technicalStack: string;

  estimatedTimeline: string;
  websitePackagePrice: string;
  platformPackagePrice: string;
  monthlyMaintenance: string;

  notIncluded: string;
  nextSteps: string;
};

type BilingualTechnicalOfferForm = Record<OfferLanguage, TechnicalOfferForm>;
type TechnicalOfferFieldLabels = Record<keyof TechnicalOfferForm, string>;

const toDate = (value: DateLike): Date | null => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if ('toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  if ('seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }

  return null;
};

const formatDate = (value: DateLike, locale: string) => {
  const date = toDate(value);

  if (!date) return '-';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatInputDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatFieldKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
};

const formatValue = (value: unknown, isArabic: boolean): string => {
  if (value === null || value === undefined || value === '') {
    return isArabic ? 'غير متوفر' : 'Not provided';
  }

  if (typeof value === 'boolean') {
    return value ? (isArabic ? 'نعم' : 'Yes') : isArabic ? 'لا' : 'No';
  }

  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(', ') : isArabic ? 'غير متوفر' : 'Not provided';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

const normalizeStatus = (status?: string) => String(status || 'pending').toLowerCase();

const getRequestStatus = (request: ServiceRequest) => {
  return request.requestStatus || request.adminStatus || request.status || 'pending';
};

const getFullName = (request: ServiceRequest) => {
  const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
  return fullName || '-';
};

const getClientName = (request: ServiceRequest) => {
  return request.company || getFullName(request) || request.email || 'Client';
};

const getPublicOfferUrl = (offerId: string) => {
  return `${window.location.origin}/technical-offers/${offerId}`;
};


const normalizeSearchText = (value: unknown) => {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[_-]/g, ' ')
    .trim();
};

const getRequestServiceText = (request: ServiceRequest) => {
  return normalizeSearchText(
    [
      request.serviceTitle,
      request.serviceSlug,
      request.serviceType,
      request.servicePackage,
    ]
      .filter(Boolean)
      .join(' ')
  );
};

const getOfferTemplateType = (request: ServiceRequest): OfferTemplateType => {
  const serviceText = getRequestServiceText(request);

  if (
    serviceText.includes('curricula') ||
    serviceText.includes('curriculum') ||
    serviceText.includes('programs') ||
    serviceText.includes('programmes') ||
    serviceText.includes('training program') ||
    serviceText.includes('training-program') ||
    serviceText.includes('المناهج') ||
    serviceText.includes('البرامج') ||
    serviceText.includes('البرامج التدريبية') ||
    serviceText.includes('المناهج والبرامج')
  ) {
    return 'curricula-programs';
  }

  return 'website-management';
};

const getOfferTemplateMetadata = (request: ServiceRequest) => {
  const templateType = getOfferTemplateType(request);

  if (templateType === 'curricula-programs') {
    return {
      serviceCategory: 'curricula-programs',
      templateSlug: 'curricula-programs-v1-bilingual',
    };
  }

  return {
    serviceCategory: 'website-management',
    templateSlug: 'website-management-v2-bilingual',
  };
};

const normalizeAnswerKey = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
};

const getRequestAnswer = (
  request: ServiceRequest,
  keys: string[]
): string => {
  const answers = request.serviceSpecificAnswers || {};
  const labels = request.serviceSpecificQuestionLabels || {};
  const normalizedKeys = keys.map(normalizeAnswerKey);

  for (const [answerKey, value] of Object.entries(answers)) {
    const normalizedAnswerKey = normalizeAnswerKey(answerKey);
    const normalizedLabel = normalizeAnswerKey(labels[answerKey] || '');

    const isMatch = normalizedKeys.some((key) => {
      return normalizedAnswerKey.includes(key) || normalizedLabel.includes(key);
    });

    if (!isMatch) continue;

    const formattedValue = formatValue(value, false);

    if (
      formattedValue &&
      formattedValue !== 'Not provided' &&
      formattedValue !== 'غير متوفر'
    ) {
      return formattedValue;
    }
  }

  return '';
};

const getCurriculaRequestSummary = (
  request: ServiceRequest,
  isArabic: boolean
) => {
  const programType = getRequestAnswer(request, [
    'programtype',
    'typeofprogram',
    'trainingtype',
    'نوعالبرنامج',
    'نوعالبرنامجاوالمسار',
  ]);

  const targetAudience = getRequestAnswer(request, [
    'targetaudience',
    'audience',
    'participants',
    'الفئةالمستهدفة',
    'الجمهورالمستهدف',
  ]);

  const numberOfLearners = getRequestAnswer(request, [
    'numberoflearners',
    'learners',
    'participantsnumber',
    'عددالمتعلمين',
    'عددالمشاركين',
  ]);

  const learningObjectives = getRequestAnswer(request, [
    'learningobjectives',
    'objectives',
    'goals',
    'اهدافالتعلم',
    'الأهدافالتعليمية',
    'ماذايتعلم',
  ]);

  const preferredFormat = getRequestAnswer(request, [
    'preferredformat',
    'format',
    'deliveryformat',
    'صيغةالتنفيذ',
    'الشكلالمفضل',
  ]);

  const existingMaterials = getRequestAnswer(request, [
    'existingmaterials',
    'materials',
    'documents',
    'slides',
    'الموادالموجودة',
    'المراجعالحالية',
  ]);

  const preferredTimeline = getRequestAnswer(request, [
    'preferredtimeline',
    'timeline',
    'deadline',
    'المدةالمفضلة',
    'المدةالزمنية',
  ]);

  if (isArabic) {
    return {
      programType: programType || 'حسب طبيعة البرنامج المطلوب',
      targetAudience: targetAudience || 'حسب الفئة المستهدفة التي يحددها العميل',
      numberOfLearners: numberOfLearners || 'حسب نطاق التنفيذ',
      learningObjectives: learningObjectives || 'تحويل احتياج العميل إلى أهداف تعلم واضحة وقابلة للقياس.',
      preferredFormat: preferredFormat || 'حضوري أو عن بعد أو صيغة هجينة حسب الاتفاق.',
      existingMaterials: existingMaterials || 'يتم مراجعة أي مواد أو مراجع متوفرة قبل إعداد المحتوى النهائي.',
      preferredTimeline: preferredTimeline || 'حسب حجم البرنامج وسرعة توفير المعطيات.',
    };
  }

  return {
    programType: programType || 'Based on the requested program type',
    targetAudience: targetAudience || 'Based on the audience defined by the client',
    numberOfLearners: numberOfLearners || 'Based on implementation scope',
    learningObjectives: learningObjectives || 'Translate the client need into clear and measurable learning objectives.',
    preferredFormat: preferredFormat || 'In-person, remote, or hybrid delivery depending on the agreement.',
    existingMaterials: existingMaterials || 'Any available documents, slides, or references will be reviewed before final production.',
    preferredTimeline: preferredTimeline || 'Based on the program size and availability of required inputs.',
  };
};


const getDefaultWebsiteManagementOffer = (
  request: ServiceRequest,
  isArabic: boolean
): TechnicalOfferForm => {
  const today = new Date();
  const validUntil = addDays(today, 15);
  const clientName = getClientName(request);
  const packageName = request.servicePackage || (isArabic ? 'حسب نطاق المشروع' : 'Based on project scope');

  if (!isArabic) {
    return {
      clientName,
      clientDescription: `${packageName} website project for ${clientName}, including a professional business website, service pages, a dynamic news page, online payment, and an admin dashboard for managing content and requests.`,
      offerTitle: 'Technical Offer - Professional Website Design and Development',
      offerSubtitle: 'Website Design & Management | New website with admin dashboard, online payment, and dynamic news page',
      offerDate: formatInputDate(today),
      validUntil: formatInputDate(validUntil),

      executiveSummary: `Bawsala is pleased to submit this technical offer to design and develop a professional website for ${clientName}. The project aims to build a new digital presence that presents the company identity and services clearly, delivers a modern responsive user experience, and connects the website to an admin dashboard for managing content, a dynamic news page, and online payment according to the agreed scope.`,

      currentSituation:
        'The client does not currently have a ready website or digital structure. The project requires building a new website from scratch, including the site structure, pages, user experience, content management, and the required integrations.',

      goalAfterDevelopment:
        'Create a professional, fast, and responsive website that builds trust, presents services clearly, allows the client to manage news and content from an admin dashboard, and supports online payment and organized service requests.',

      projectScope:
        'Design and development of a new website of around 6 pages, with an admin dashboard, dynamic news page, and online payment integration according to the final agreed scope.',

      proposedServices:
        `Analyze the client needs and define the website structure.
Design a modern responsive UI/UX for mobile and desktop.
Develop around 6 core website pages.
Create a dynamic news page that can be managed from the dashboard.
Develop an admin dashboard for managing content and requests.
Add online payment according to the available payment gateway.
Connect forms and data to the database.
Set up basic SEO optimization.
Run full testing before launch.`,

      deliverables:
        `Website UI design.
Responsive website development.
Around 6 core pages.
Dynamic news page.
Admin dashboard for content management.
Online payment integration according to the agreed scope.
Forms and database connection.
Basic SEO setup.
Simple training on how to use the dashboard.`,

      implementationPlan:
        `Phase 1: Analyze requirements and prepare the page structure.
Phase 2: Design the interfaces and approve the visual direction.
Phase 3: Develop the website frontend.
Phase 4: Develop the admin dashboard and dynamic news page.
Phase 5: Add and connect online payment when technically available.
Phase 6: Full testing and performance optimization.
Phase 7: Launch and handover.`,

      technicalStack:
        `React / Next.js depending on the project structure.
CSS Modules or Tailwind CSS for styling.
Firebase / Firestore for data and request management.
Firebase Authentication when needed.
Online payment gateway according to the available service.
Suitable hosting depending on the existing structure or a new hosting option if needed.`,

      estimatedTimeline: '20 to 30 working days depending on content availability, design approval, and online payment details.',
      websitePackagePrice: '160000 DZD',
      platformPackagePrice: 'Partially included for news and content management. Advanced features are priced separately.',
      monthlyMaintenance: 'Optional - includes updates, backup, performance monitoring, technical support, and minor changes according to agreement.',

      notIncluded:
        `This offer does not include domain or hosting costs if the client requests independent purchase.
It does not include payment gateway subscriptions or transaction fees.
It does not include paid advertising.
It does not include extensive copywriting beyond the agreed pages.
It does not include external integrations not clearly mentioned in this offer.`,

      nextSteps:
        `Review the technical offer.
Confirm the final scope and required features.
Confirm the available online payment method.
Provide the basic content and brand assets if available.
Sign the agreement and start the design phase.`,
    };
  }

  return {
    clientName,
    clientDescription: `موقع أعمال احترافي لصالح ${clientName}، يشمل واجهة تعريفية، صفحات خدمات، صفحة أخبار ديناميكية، دفع إلكتروني، ولوحة تحكم لإدارة المحتوى والطلبات.`,
    offerTitle: 'عرض فني - تصميم وتطوير موقع إلكتروني احترافي',
    offerSubtitle: 'تصميم وإدارة المواقع | موقع جديد مع لوحة تحكم، دفع إلكتروني، وصفحة أخبار ديناميكية',
    offerDate: formatInputDate(today),
    validUntil: formatInputDate(validUntil),

    executiveSummary: `تتقدم بوصلة بهذا العرض الفني لتصميم وتطوير موقع إلكتروني احترافي لصالح ${clientName}. يهدف المشروع إلى إنشاء موقع جديد يعرض هوية الشركة وخدماتها بشكل واضح، مع توفير تجربة مستخدم عصرية ومتجاوبة، وربط الموقع بلوحة تحكم لإدارة المحتوى، إضافة إلى صفحة أخبار ديناميكية ونظام دفع إلكتروني حسب النطاق المتفق عليه.`,

    currentSituation:
      'لا يوجد موقع حالي للعميل، ولا توجد بنية رقمية جاهزة. يحتاج المشروع إلى إنشاء موقع جديد من الصفر، مع تحديد الهيكل، الصفحات، تجربة المستخدم، ونظام إدارة المحتوى.',

    goalAfterDevelopment:
      'إنشاء موقع إلكتروني احترافي وسريع ومتجاوب يعكس صورة موثوقة للشركة، يسهّل عرض الخدمات، يسمح بإدارة الأخبار والمحتوى من لوحة تحكم، ويوفر قابلية إضافة الدفع الإلكتروني واستقبال الطلبات بطريقة منظمة.',

    projectScope:
      'تصميم وتطوير موقع إلكتروني جديد مكوّن من 6 صفحات تقريباً، مع لوحة تحكم، صفحة أخبار ديناميكية، ونظام دفع إلكتروني حسب الإمكانيات التقنية المتفق عليها.',

    proposedServices:
      `تحليل احتياجات العميل وتحديد هيكل الموقع.
تصميم واجهة UI/UX عصرية ومتجاوبة مع الهاتف والحاسوب.
تطوير 6 صفحات أساسية للموقع.
إنشاء صفحة أخبار ديناميكية قابلة للتحديث من لوحة التحكم.
تطوير لوحة تحكم لإدارة المحتوى والطلبات.
إضافة نظام دفع إلكتروني حسب بوابة الدفع المتاحة.
ربط النماذج بقاعدة البيانات.
تهيئة أساسية لمحركات البحث SEO.
اختبار شامل قبل الإطلاق.`,

    deliverables:
      `تصميم واجهات الموقع.
موقع إلكتروني Responsive.
6 صفحات أساسية.
صفحة أخبار ديناميكية.
لوحة تحكم لإدارة المحتوى.
نظام دفع إلكتروني حسب النطاق المتفق عليه.
ربط النماذج وقاعدة البيانات.
تهيئة SEO أساسية.
تدريب بسيط على طريقة استخدام لوحة التحكم.`,

    implementationPlan:
      `المرحلة 1: تحليل الاحتياج وتجهيز هيكل الصفحات.
المرحلة 2: تصميم الواجهات واعتماد الاتجاه البصري.
المرحلة 3: تطوير الواجهة الأمامية للموقع.
المرحلة 4: تطوير لوحة التحكم وصفحة الأخبار الديناميكية.
المرحلة 5: إضافة وربط نظام الدفع الإلكتروني حسب الإمكانية.
المرحلة 6: اختبار شامل وتحسين الأداء.
المرحلة 7: الإطلاق والتسليم.`,

    technicalStack:
      `React / Next.js حسب بنية المشروع.
CSS Modules أو Tailwind CSS للتصميم.
Firebase / Firestore لإدارة البيانات والطلبات.
Firebase Authentication حسب الحاجة.
بوابة دفع إلكتروني حسب الخدمة المتاحة.
استضافة مناسبة حسب البنية الحالية أو اختيار استضافة جديدة عند الحاجة.`,

    estimatedTimeline: 'من 20 إلى 30 يوم عمل حسب سرعة توفير المحتوى، اعتماد التصميم، وتفاصيل الدفع الإلكتروني.',
    websitePackagePrice: '160000 دج',
    platformPackagePrice: 'مشمول جزئياً ضمن النطاق الحالي لإدارة الأخبار والمحتوى، وأي خصائص متقدمة يتم تسعيرها بشكل منفصل.',
    monthlyMaintenance: 'اختيارية - تشمل التحديثات، النسخ الاحتياطي، مراقبة الأداء، الدعم الفني، وتعديلات بسيطة حسب الاتفاق.',

    notIncluded:
      `لا يشمل العرض تكاليف الدومين أو الاستضافة في حال طلب العميل شراءها بشكل مستقل.
لا يشمل اشتراكات بوابات الدفع أو رسوم المعاملات.
لا يشمل الإعلانات الممولة.
لا يشمل كتابة محتوى كبير خارج الصفحات المتفق عليها.
لا يشمل أي تكاملات خارجية غير مذكورة صراحة في هذا العرض.`,

    nextSteps:
      `مراجعة العرض الفني من طرف العميل.
تأكيد النطاق النهائي للموقع والخصائص المطلوبة.
تأكيد طريقة الدفع الإلكتروني المتاحة.
توفير المحتوى الأساسي والهوية البصرية إن وجدت.
توقيع الاتفاق وبدء مرحلة التصميم.`,
  };
};


const getDefaultCurriculaProgramsOffer = (
  request: ServiceRequest,
  isArabic: boolean
): TechnicalOfferForm => {
  const today = new Date();
  const validUntil = addDays(today, 15);
  const clientName = getClientName(request);
  const packageName = request.servicePackage || (isArabic ? 'حسب نطاق المشروع' : 'Based on project scope');
  const summary = getCurriculaRequestSummary(request, isArabic);

  if (!isArabic) {
    return {
      clientName,
      clientDescription: `${packageName} curricula and programs project for ${clientName}. The work covers training identity, program structure, learning objectives, content design, implementation tools, assessment methods, and a professional training presentation structure.`,
      offerTitle: 'Technical Offer - Curricula and Training Programs Development',
      offerSubtitle: 'Curricula & Programs | Training identity, learning path design, practical tools, and implementation-ready content',
      offerDate: formatInputDate(today),
      validUntil: formatInputDate(validUntil),

      executiveSummary: `Bawsala is pleased to submit this technical offer to design and develop professional curricula and training programs for ${clientName}. The offer responds to the increasing need for practical, organized, and measurable training content that connects theoretical detail with real-world application. The goal is to build a clear training structure, prepare implementation-ready materials, and create a coherent learning journey that can be delivered in person, remotely, or in a hybrid format.

This offer aims to:
- Transform knowledge into applicable training skills.
- Prepare structured content with clear, measurable learning objectives.
- Build training paths that can be repeated, scaled, and improved.
- Provide assessment and follow-up tools for each learning journey.`,

      currentSituation:
        `The request indicates a need to design or improve a training program. Current request details:
Program type: ${summary.programType}
Target audience: ${summary.targetAudience}
Number of learners: ${summary.numberOfLearners}
Preferred format: ${summary.preferredFormat}
Existing materials: ${summary.existingMaterials}`,

      goalAfterDevelopment:
        `Create a clear and professional training identity for the program, convert the required knowledge into organized learning modules, define measurable outcomes, and prepare the material in a format that is easy for trainers to deliver and easy for participants to follow.`,

      projectScope:
        `Design and development of a professional training program structure, including training identity, learning objectives, module breakdown, content flow, practical exercises, visual presentation structure, participant materials, and evaluation tools according to the final agreed scope.`,

      proposedServices:
        `Analyze the training need and define the program direction.
Build the trainer/program training identity.
Define the knowledge and methodology pillars.
Create a clear framework for the learning journey.
Design the program modules and sessions.
Write learning objectives and expected outcomes.
Prepare practical activities, exercises, and examples.
Create assessment and follow-up tools.
Structure the visual presentation and participant materials.
Prepare implementation notes for the trainer.`,

      deliverables:
        `Training identity and program positioning.
Curriculum framework and learning path.
Detailed module/session structure.
Learning objectives and outcomes.
Trainer guide or implementation notes.
Participant workbook or handout structure.
Professional presentation structure.
Exercises, activities, and applied examples.
Assessment forms and follow-up tools.
Recommendations for program delivery and improvement.`,

      implementationPlan:
        `Phase 1: Review request details, objectives, target audience, and available materials.
Phase 2: Define the training identity and the main knowledge pillars.
Phase 3: Build the curriculum framework and learning journey.
Phase 4: Design modules, sessions, activities, and learning outcomes.
Phase 5: Prepare training materials, presentation structure, and participant tools.
Phase 6: Review, refine, and align the content with the client feedback.
Phase 7: Final handover with usage notes and next-step recommendations.`,

      technicalStack:
        `Training needs analysis.
Instructional design methodology.
Learning objectives mapping.
Program framework and curriculum architecture.
Google Workspace / Docs / Slides / Sheets when needed.
Forms or assessment tools for measurement.
Presentation structure and reusable templates.
Implementation notes for in-person, remote, or hybrid delivery.`,

      estimatedTimeline: summary.preferredTimeline || '15 to 30 working days depending on program size, available materials, review cycles, and final scope.',
      websitePackagePrice: 'Based on the number of modules, depth of content, and required deliverables.',
      platformPackagePrice: 'Optional - includes digital learning tools, forms, workspace setup, or implementation support when requested.',
      monthlyMaintenance: 'Optional - includes content updates, program review, assessment improvements, and trainer support according to agreement.',

      notIncluded:
        `This offer does not include venue rental, catering, or logistics for physical training unless agreed separately.
It does not include paid learning platforms or third-party subscriptions.
It does not include video production, professional filming, or voice-over recording.
It does not include printing costs for participant materials.
It does not include delivery of the training sessions unless this is added to the agreement.`,

      nextSteps:
        `Review the technical offer.
Confirm the final program type and target audience.
Share any existing documents, slides, or references.
Confirm the preferred delivery format and timeline.
Approve the scope, then start the analysis and design phase.`,
    };
  }

  return {
    clientName,
    clientDescription: `مشروع تصميم وتطوير مناهج وبرامج تدريبية لصالح ${clientName}. يشمل العمل الهوية التدريبية، بناء المسار التعليمي، صياغة الأهداف، تصميم المحتوى، أدوات التنفيذ، وسائل القياس، وشكل عرض تدريبي احترافي.`,
    offerTitle: 'عرض فني - تصميم وتطوير مناهج وبرامج تدريبية',
    offerSubtitle: 'المناهج والبرامج | هوية تدريبية، مسارات تعليمية، أدوات عملية، ومحتوى جاهز للتنفيذ',
    offerDate: formatInputDate(today),
    validUntil: formatInputDate(validUntil),

    executiveSummary: `تتقدم بوصلة بهذا العرض الفني لتصميم وتطوير مناهج وبرامج تدريبية احترافية لصالح ${clientName}. يأتي هذا العرض استجابة للحاجة إلى محتوى تدريبي عملي، منظم، وقابل للقياس، يجمع بين التفصيل النظري والتطبيق العملي بطريقة واضحة ومنهجية.

يهدف هذا العرض إلى:
- تحويل المعرفة إلى مهارات عملية قابلة للتطبيق.
- إعداد محتوى تدريبي منظم بأهداف تعليمية واضحة وقابلة للقياس.
- بناء مسارات تدريبية قابلة للتكرار والتوسع.
- توفير أدوات قياس أثر واضحة لكل دورة أو برنامج.`,

    currentSituation:
      `يوضح الطلب الحاجة إلى تصميم أو تطوير برنامج تدريبي. تفاصيل الطلب الحالية:
نوع البرنامج: ${summary.programType}
الفئة المستهدفة: ${summary.targetAudience}
عدد المتعلمين: ${summary.numberOfLearners}
صيغة التنفيذ المفضلة: ${summary.preferredFormat}
المواد الحالية: ${summary.existingMaterials}`,

    goalAfterDevelopment:
      `صياغة هوية تدريبية واضحة للبرنامج، وتحويل المعرفة المطلوبة إلى وحدات تعليمية منظمة، وتحديد مخرجات قابلة للقياس، وتجهيز المحتوى بصيغة يسهل على المدرب تنفيذها وعلى المشاركين الاستفادة منها.`,

    projectScope:
      `تصميم وتطوير هيكل برنامج تدريبي احترافي يشمل الهوية التدريبية، أهداف التعلم، تقسيم المحاور، تسلسل المحتوى، التمارين التطبيقية، شكل العرض البصري، مواد المشاركين، وأدوات التقييم حسب النطاق النهائي المتفق عليه.`,

    proposedServices:
      `تحليل الاحتياج التدريبي وتحديد اتجاه البرنامج.
صياغة الهوية التدريبية للمدرب أو البرنامج.
تحديد المرتكزات المعرفية والمنهجية.
بناء نموذج تدريبي واضح يعتمد في جميع أجزاء البرنامج.
تصميم محاور البرنامج والجلسات التدريبية.
صياغة أهداف التعلم والمخرجات المتوقعة.
إعداد تمارين وأنشطة وأمثلة تطبيقية.
تجهيز أدوات التقييم وقياس الأثر.
تنظيم الرؤية البصرية للعرض التدريبي ومواد المشاركين.
إعداد ملاحظات تنفيذية تساعد المدرب أثناء التطبيق.`,

    deliverables:
      `هوية تدريبية واضحة للبرنامج.
إطار عام للمنهج والمسار التعليمي.
تقسيم تفصيلي للمحاور والجلسات.
أهداف تعلم ومخرجات قابلة للقياس.
دليل مدرب أو ملاحظات تنفيذية.
هيكل كراس المتدرب أو مواد المشاركين.
هيكل عرض تدريبي احترافي.
تمارين وأنشطة ونماذج تطبيقية.
نماذج تقييم وقياس أثر.
توصيات لتنفيذ البرنامج وتحسينه.`,

    implementationPlan:
      `المرحلة 1: مراجعة تفاصيل الطلب، الأهداف، الفئة المستهدفة، والمواد المتوفرة.
المرحلة 2: تحديد الهوية التدريبية والمرتكزات المعرفية الأساسية.
المرحلة 3: بناء إطار المنهج والمسار التعليمي.
المرحلة 4: تصميم المحاور والجلسات والأنشطة ومخرجات التعلم.
المرحلة 5: إعداد مواد التدريب، هيكل العرض، وأدوات المشاركين.
المرحلة 6: المراجعة والتحسين حسب ملاحظات العميل.
المرحلة 7: التسليم النهائي مع ملاحظات الاستخدام والخطوات التالية.`,

    technicalStack:
      `تحليل الاحتياج التدريبي.
منهجية التصميم التعليمي.
صياغة أهداف التعلم وربطها بالمخرجات.
بناء إطار المنهج والمسار التعليمي.
Google Workspace / Docs / Slides / Sheets عند الحاجة.
نماذج تقييم أو Forms لقياس النتائج.
قوالب عرض قابلة لإعادة الاستخدام.
ملاحظات تنفيذ للحضور أو التدريب عن بعد أو التدريب الهجين.`,

    estimatedTimeline: summary.preferredTimeline || 'من 15 إلى 30 يوم عمل حسب حجم البرنامج، توفر المواد، عدد جولات المراجعة، والنطاق النهائي.',
    websitePackagePrice: 'حسب عدد المحاور، عمق المحتوى، والمخرجات المطلوبة.',
    platformPackagePrice: 'اختياري - يشمل أدوات رقمية للتعلم، نماذج قياس، إعداد Workspace، أو دعم التنفيذ عند الطلب.',
    monthlyMaintenance: 'اختيارية - تشمل تحديث المحتوى، مراجعة البرنامج، تحسين أدوات القياس، ودعم المدرب حسب الاتفاق.',

    notIncluded:
      `لا يشمل العرض كراء القاعات أو الضيافة أو لوجستيك التدريب الحضوري إلا باتفاق منفصل.
لا يشمل اشتراكات منصات التعلم المدفوعة أو الأدوات الخارجية.
لا يشمل إنتاج الفيديو أو التصوير الاحترافي أو التسجيل الصوتي.
لا يشمل تكاليف طباعة كراسات أو مواد المشاركين.
لا يشمل تنفيذ الدورات التدريبية ميدانياً إلا إذا تم إضافته إلى الاتفاق.`,

    nextSteps:
      `مراجعة العرض الفني.
تأكيد نوع البرنامج والفئة المستهدفة.
إرسال أي وثائق أو عروض أو مراجع متوفرة.
تأكيد صيغة التنفيذ والمدة المفضلة.
اعتماد النطاق ثم بدء مرحلة التحليل والتصميم.`,
  };
};

const getDefaultOfferForRequest = (
  request: ServiceRequest,
  isArabic: boolean
): TechnicalOfferForm => {
  const templateType = getOfferTemplateType(request);

  if (templateType === 'curricula-programs') {
    return getDefaultCurriculaProgramsOffer(request, isArabic);
  }

  return getDefaultWebsiteManagementOffer(request, isArabic);
};


const mapOfferDocumentToForm = (
  data: Record<string, unknown>,
  fallback: TechnicalOfferForm
): TechnicalOfferForm => {
  return {
    clientName: String(data.clientName || fallback.clientName),
    clientDescription: String(data.clientDescription || fallback.clientDescription),
    offerTitle: String(data.offerTitle || fallback.offerTitle),
    offerSubtitle: String(data.offerSubtitle || fallback.offerSubtitle),
    offerDate: String(data.offerDate || fallback.offerDate),
    validUntil: String(data.validUntil || fallback.validUntil),

    executiveSummary: String(data.executiveSummary || fallback.executiveSummary),
    currentSituation: String(data.currentSituation || fallback.currentSituation),
    goalAfterDevelopment: String(data.goalAfterDevelopment || fallback.goalAfterDevelopment),
    projectScope: String(data.projectScope || fallback.projectScope),

    proposedServices: String(data.proposedServices || fallback.proposedServices),
    deliverables: String(data.deliverables || fallback.deliverables),
    implementationPlan: String(data.implementationPlan || fallback.implementationPlan),
    technicalStack: String(data.technicalStack || fallback.technicalStack),

    estimatedTimeline: String(data.estimatedTimeline || fallback.estimatedTimeline),
    websitePackagePrice: String(data.websitePackagePrice || fallback.websitePackagePrice),
    platformPackagePrice: String(data.platformPackagePrice || fallback.platformPackagePrice),
    monthlyMaintenance: String(data.monthlyMaintenance || fallback.monthlyMaintenance),

    notIncluded: String(data.notIncluded || fallback.notIncluded),
    nextSteps: String(data.nextSteps || fallback.nextSteps),
  };
};

const getDefaultBilingualOffer = (
  request: ServiceRequest
): BilingualTechnicalOfferForm => {
  return {
    ar: getDefaultOfferForRequest(request, true),
    en: getDefaultOfferForRequest(request, false),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getSavedOfferLanguage = (
  data: Record<string, unknown>,
  fallback: OfferLanguage
): OfferLanguage => {
  if (data.offerLanguage === 'ar' || data.offerLanguage === 'en') {
    return data.offerLanguage;
  }

  if (data.defaultOfferLanguage === 'ar' || data.defaultOfferLanguage === 'en') {
    return data.defaultOfferLanguage;
  }

  return fallback;
};

const mapOfferDocumentToBilingualForms = (
  data: Record<string, unknown>,
  request: ServiceRequest,
  fallbackLanguage: OfferLanguage
): BilingualTechnicalOfferForm => {
  const fallbackOffers = getDefaultBilingualOffer(request);
  const savedLanguage = getSavedOfferLanguage(data, fallbackLanguage);
  const translations = data.translations || data.localizedContent;

  const mappedOffers: BilingualTechnicalOfferForm = {
    ar: fallbackOffers.ar,
    en: fallbackOffers.en,
  };

  if (isRecord(translations)) {
    const arabicTranslation = translations.ar;
    const englishTranslation = translations.en;

    if (isRecord(arabicTranslation)) {
      mappedOffers.ar = mapOfferDocumentToForm(arabicTranslation, fallbackOffers.ar);
    }

    if (isRecord(englishTranslation)) {
      mappedOffers.en = mapOfferDocumentToForm(englishTranslation, fallbackOffers.en);
    }
  }

  const hasLegacyTopLevelOffer =
    Boolean(data.offerTitle) ||
    Boolean(data.executiveSummary) ||
    Boolean(data.proposedServices) ||
    Boolean(data.websitePackagePrice);

  if (hasLegacyTopLevelOffer && !isRecord(translations)) {
    mappedOffers[savedLanguage] = mapOfferDocumentToForm(
      data,
      fallbackOffers[savedLanguage]
    );
  }

  return mappedOffers;
};

const websiteOfferFieldLabels: Record<OfferLanguage, TechnicalOfferFieldLabels> = {
  ar: {
    clientName: 'اسم العميل / المؤسسة',
    clientDescription: 'وصف العميل أو الخدمة المطلوبة',
    offerTitle: 'عنوان العرض',
    offerSubtitle: 'العنوان الفرعي',
    offerDate: 'تاريخ العرض',
    validUntil: 'صالح إلى غاية',
    executiveSummary: 'الملخص التنفيذي',
    currentSituation: 'الوضع الحالي',
    goalAfterDevelopment: 'الهدف بعد التطوير',
    projectScope: 'نطاق العمل',
    proposedServices: 'الخدمات المقترحة',
    deliverables: 'المخرجات النهائية',
    implementationPlan: 'خطة التنفيذ',
    technicalStack: 'المقترح التقني',
    estimatedTimeline: 'المدة الزمنية التقديرية',
    websitePackagePrice: 'سعر باقة الموقع',
    platformPackagePrice: 'سعر إضافة لوحة الإدارة / المنصة',
    monthlyMaintenance: 'الصيانة الشهرية',
    notIncluded: 'التكاليف غير المشمولة',
    nextSteps: 'الخطوات التالية',
  },
  en: {
    clientName: 'Client / Organization name',
    clientDescription: 'Client or requested service description',
    offerTitle: 'Offer title',
    offerSubtitle: 'Offer subtitle',
    offerDate: 'Offer date',
    validUntil: 'Valid until',
    executiveSummary: 'Executive summary',
    currentSituation: 'Current situation',
    goalAfterDevelopment: 'Goal after development',
    projectScope: 'Project scope',
    proposedServices: 'Proposed services',
    deliverables: 'Final deliverables',
    implementationPlan: 'Implementation plan',
    technicalStack: 'Technical proposal',
    estimatedTimeline: 'Estimated timeline',
    websitePackagePrice: 'Website package price',
    platformPackagePrice: 'Admin panel / platform add-on price',
    monthlyMaintenance: 'Monthly maintenance',
    notIncluded: 'Not included costs',
    nextSteps: 'Next steps',
  },
};

const curriculaOfferFieldLabels: Record<OfferLanguage, TechnicalOfferFieldLabels> = {
  ar: {
    clientName: 'اسم العميل / المؤسسة',
    clientDescription: 'وصف مشروع المناهج أو البرنامج المطلوب',
    offerTitle: 'عنوان العرض',
    offerSubtitle: 'العنوان الفرعي',
    offerDate: 'تاريخ العرض',
    validUntil: 'صالح إلى غاية',
    executiveSummary: 'مقدمة العرض',
    currentSituation: 'الوضع الحالي / تفاصيل الطلب',
    goalAfterDevelopment: 'الهدف بعد تطوير البرنامج',
    projectScope: 'نطاق العمل التدريبي',
    proposedServices: 'الخدمات التدريبية المقترحة',
    deliverables: 'المخرجات التدريبية النهائية',
    implementationPlan: 'آليات التنفيذ والتنسيق',
    technicalStack: 'المنهجية والأدوات التعليمية',
    estimatedTimeline: 'المدة الزمنية التقديرية',
    websitePackagePrice: 'سعر تصميم البرنامج / المنهج',
    platformPackagePrice: 'إضافات أدوات التعلم / المنصة',
    monthlyMaintenance: 'المراجعة والتحديث بعد التسليم',
    notIncluded: 'التكاليف غير المشمولة',
    nextSteps: 'الخطوات التالية',
  },
  en: {
    clientName: 'Client / Organization name',
    clientDescription: 'Curricula or program project description',
    offerTitle: 'Offer title',
    offerSubtitle: 'Offer subtitle',
    offerDate: 'Offer date',
    validUntil: 'Valid until',
    executiveSummary: 'Offer introduction',
    currentSituation: 'Current situation / request details',
    goalAfterDevelopment: 'Goal after program development',
    projectScope: 'Training project scope',
    proposedServices: 'Proposed training services',
    deliverables: 'Final training deliverables',
    implementationPlan: 'Implementation and coordination plan',
    technicalStack: 'Methodology and learning tools',
    estimatedTimeline: 'Estimated timeline',
    websitePackagePrice: 'Program / curriculum design price',
    platformPackagePrice: 'Learning tools / platform add-ons',
    monthlyMaintenance: 'Review and updates after delivery',
    notIncluded: 'Not included costs',
    nextSteps: 'Next steps',
  },
};

const getOfferFieldLabels = (
  language: OfferLanguage,
  templateType: OfferTemplateType
): TechnicalOfferFieldLabels => {
  if (templateType === 'curricula-programs') {
    return curriculaOfferFieldLabels[language];
  }

  return websiteOfferFieldLabels[language];
};

export const ServiceRequests: React.FC = () => {
  const { isArabic } = useLanguage();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOffer, setSavingOffer] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [offerRequest, setOfferRequest] = useState<ServiceRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<ServiceRequest | null>(null);

  const [offerForms, setOfferForms] = useState<BilingualTechnicalOfferForm | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const locale = isArabic ? 'ar-DZ' : 'en-US';
  const textAlignClass = isArabic ? 'text-right' : 'text-left';

  const labels = {
    pageTitle: isArabic ? 'طلبات الخدمات' : 'Service Requests',
    pageDescription: isArabic
      ? 'عرض وإدارة كل الطلبات المرسلة من صفحة الخدمات.'
      : 'View and manage all service requests submitted from the services page.',
    searchPlaceholder: isArabic
      ? 'ابحث بالاسم، البريد، الشركة، الخدمة...'
      : 'Search by name, email, company, service...',
    totalRequests: isArabic ? 'إجمالي الطلبات' : 'Total Requests',
    todayRequests: isArabic ? 'طلبات اليوم' : 'Today Requests',
    services: isArabic ? 'الخدمات المطلوبة' : 'Requested Services',
    withPackage: isArabic ? 'طلبات فيها باقة' : 'With Package',
    date: isArabic ? 'التاريخ' : 'Date',
    client: isArabic ? 'العميل' : 'Client',
    contact: isArabic ? 'معلومات التواصل' : 'Contact',
    service: isArabic ? 'الخدمة' : 'Service',
    package: isArabic ? 'الباقة' : 'Package',
    status: isArabic ? 'الحالة' : 'Status',
    language: isArabic ? 'اللغة' : 'Language',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    details: isArabic ? 'التفاصيل' : 'Details',
    acceptAndCreateOffer: isArabic ? 'قبول + عرض فني' : 'Accept + Offer',
    editOffer: isArabic ? 'تعديل العرض' : 'Edit Offer',
    viewOffer: isArabic ? 'فتح العرض' : 'View Offer',
    reject: isArabic ? 'رفض' : 'Reject',
    noRequests: isArabic ? 'لا توجد طلبات خدمات حتى الآن.' : 'No service requests yet.',
    loading: isArabic ? 'جاري تحميل طلبات الخدمات...' : 'Loading service requests...',
    loadError: isArabic
      ? 'حدث خطأ أثناء تحميل طلبات الخدمات.'
      : 'Something went wrong while loading service requests.',
    close: isArabic ? 'إغلاق' : 'Close',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    savePublish: isArabic ? 'حفظ ونشر العرض' : 'Save and publish offer',
    saving: isArabic ? 'جاري الحفظ...' : 'Saving...',
    basicInformation: isArabic ? 'المعلومات الأساسية' : 'Basic Information',
    requestInformation: isArabic ? 'معلومات الطلب' : 'Request Information',
    serviceAnswers: isArabic ? 'إجابات تفاصيل الخدمة' : 'Service Specific Answers',
    additionalMessage: isArabic ? 'رسالة إضافية' : 'Additional Message',
    firstName: isArabic ? 'الاسم الأول' : 'First Name',
    lastName: isArabic ? 'اللقب' : 'Last Name',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    phone: isArabic ? 'رقم الهاتف' : 'Phone',
    company: isArabic ? 'الشركة / المؤسسة' : 'Company / Organization',
    serviceTitle: isArabic ? 'عنوان الخدمة' : 'Service Title',
    serviceSlug: isArabic ? 'رابط الخدمة' : 'Service Slug',
    serviceType: isArabic ? 'نوع الخدمة' : 'Service Type',
    servicePackage: isArabic ? 'الباقة المطلوبة' : 'Preferred Package',
    privacy: isArabic ? 'الموافقة على الخصوصية' : 'Privacy Accepted',
    createdAt: isArabic ? 'تاريخ الإرسال' : 'Submitted At',
    notProvided: isArabic ? 'غير متوفر' : 'Not provided',
    pending: isArabic ? 'قيد المراجعة' : 'Pending',
    approved: isArabic ? 'مقبول' : 'Approved',
    rejected: isArabic ? 'مرفوض' : 'Rejected',
    offerModalTitle: isArabic
      ? 'إنشاء العرض الفني'
      : 'Create technical offer',
    offerModalDescription: isArabic
      ? 'املأ كل الحقول بالعربية والإنجليزية. سيتم حفظ النسختين في Firebase داخل technicalOffers حتى يختار العميل اللغة التي يريدها.'
      : 'Fill every field in Arabic and English. Both versions will be saved in Firebase technicalOffers so the client can choose the language they prefer.',
    rejectTitle: isArabic ? 'رفض طلب الخدمة' : 'Reject service request',
    rejectDescription: isArabic
      ? 'يمكنك كتابة سبب الرفض ليظهر للعميل.'
      : 'You can write a rejection reason to show to the client.',
    rejectionReason: isArabic ? 'سبب الرفض' : 'Rejection reason',
    confirmReject: isArabic ? 'تأكيد الرفض' : 'Confirm rejection',
    offerSaved: isArabic
      ? 'تم حفظ العرض الفني باللغتين ونشره للعميل بنجاح.'
      : 'Bilingual technical offer saved and published successfully.',
    requestRejected: isArabic ? 'تم رفض الطلب بنجاح.' : 'Request rejected successfully.',
    saveError: isArabic
      ? 'حدث خطأ أثناء الحفظ. تحقق من صلاحيات Firestore.'
      : 'Could not save. Please check Firestore permissions.',
    offerCancel: isArabic ? 'إلغاء' : 'Cancel',
    offerSavePublish: isArabic ? 'حفظ ونشر العرض باللغتين' : 'Save and publish bilingual offer',
    offerSaving: isArabic ? 'جاري الحفظ...' : 'Saving...',
    bilingualOfferHint: isArabic
      ? 'العرض الآن يحتوي على نسختين منفصلتين: نسخة عربية ونسخة إنجليزية. عند الحفظ يتم تخزينهما داخل translations.ar و translations.en.'
      : 'The offer now contains two separate versions: Arabic and English. On save, both are stored inside translations.ar and translations.en.',
    arabicVersion: isArabic ? 'النسخة العربية' : 'Arabic version',
    englishVersion: isArabic ? 'النسخة الإنجليزية' : 'English version',
    arabicVersionDescription: isArabic
      ? 'هذه النصوص تظهر للعميل عندما يختار العربية.'
      : 'This content appears when the client chooses Arabic.',
    englishVersionDescription: isArabic
      ? 'هذه النصوص تظهر للعميل عندما يختار الإنجليزية.'
      : 'This content appears when the client chooses English.'
  };

  useEffect(() => {
    setLoading(true);
    setError('');

    const unsubscribe = onSnapshot(
      collection(db, 'serviceRequests'),
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...(docItem.data() as Omit<ServiceRequest, 'id'>),
        }));

        const sortedData = data.sort((a, b) => {
          const firstDate = toDate(a.createdAt)?.getTime() || 0;
          const secondDate = toDate(b.createdAt)?.getTime() || 0;

          return secondDate - firstDate;
        });

        setRequests(sortedData);
        setLoading(false);
      },
      (firebaseError) => {
        console.error('Error loading service requests:', firebaseError);
        setError(labels.loadError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [labels.loadError]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return requests;

    return requests.filter((request) => {
      const searchableText = [
        request.firstName,
        request.lastName,
        request.email,
        request.phone,
        request.company,
        request.serviceTitle,
        request.serviceSlug,
        request.serviceType,
        request.servicePackage,
        request.message,
        request.language,
        request.adminStatus,
        request.requestStatus,
        JSON.stringify(request.serviceSpecificAnswers || {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [requests, searchTerm]);

  const todayRequestsCount = useMemo(() => {
    const today = new Date();

    return requests.filter((request) => {
      const requestDate = toDate(request.createdAt);

      if (!requestDate) return false;

      return (
        requestDate.getFullYear() === today.getFullYear() &&
        requestDate.getMonth() === today.getMonth() &&
        requestDate.getDate() === today.getDate()
      );
    }).length;
  }, [requests]);

  const uniqueServicesCount = useMemo(() => {
    const services = requests
      .map((request) => request.serviceTitle || request.serviceSlug || request.serviceType)
      .filter(Boolean);

    return new Set(services).size;
  }, [requests]);

  const requestsWithPackageCount = useMemo(() => {
    return requests.filter((request) => Boolean(request.servicePackage?.trim())).length;
  }, [requests]);

  const getStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);

    if (normalized === 'approved' || normalized === 'accepted') return labels.approved;
    if (normalized === 'rejected') return labels.rejected;

    return labels.pending;
  };

  const getStatusClassName = (status?: string) => {
    const normalized = normalizeStatus(status);

    if (normalized === 'approved' || normalized === 'accepted') {
      return 'bg-green-50 text-green-700 border-green-200';
    }

    if (normalized === 'rejected') {
      return 'bg-red-50 text-red-700 border-red-200';
    }

    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  const handleOfferFormChange = (
    language: OfferLanguage,
    field: keyof TechnicalOfferForm,
    value: string
  ) => {
    setOfferForms((current) => {
      if (!current) return current;

      return {
        ...current,
        [language]: {
          ...current[language],
          [field]: value,
        },
      };
    });
  };

  const getInitialOfferLanguage = (request: ServiceRequest): OfferLanguage => {
    const requestLanguage = String(request.language || '').toLowerCase();

    if (requestLanguage.startsWith('ar')) return 'ar';
    if (requestLanguage.startsWith('en')) return 'en';

    return isArabic ? 'ar' : 'en';
  };

  const openOfferModal = async (request: ServiceRequest) => {
    setError('');
    setSuccessMessage('');

    const initialOfferLanguage = getInitialOfferLanguage(request);

    setOfferRequest(request);
    setOfferForms(getDefaultBilingualOffer(request));

    if (!request.technicalOfferId) return;

    try {
      const offerSnapshot = await getDoc(doc(db, 'technicalOffers', request.technicalOfferId));

      if (offerSnapshot.exists()) {
        const offerData = offerSnapshot.data() as Record<string, unknown>;

        setOfferForms(
          mapOfferDocumentToBilingualForms(
            offerData,
            request,
            initialOfferLanguage
          )
        );
      }
    } catch (firebaseError) {
      console.error('Error loading technical offer:', firebaseError);
    }
  };

  const closeOfferModal = () => {
    if (savingOffer) return;
    setOfferRequest(null);
    setOfferForms(null);
  };

  const handleSaveOffer = async () => {
    if (!offerRequest || !offerForms) return;

    try {
      setSavingOffer(true);
      setError('');
      setSuccessMessage('');

      let offerId = offerRequest.technicalOfferId;
      const defaultOfferLanguage = getInitialOfferLanguage(offerRequest);
      const primaryOfferForm = offerForms[defaultOfferLanguage];
      const templateMetadata = getOfferTemplateMetadata(offerRequest);

      const offerPayload = {
        // Backward compatibility: old public pages can still read the main fields.
        ...primaryOfferForm,

        // New bilingual content: public pages should read from this object.
        translations: {
          ar: offerForms.ar,
          en: offerForms.en,
        },
        localizedContent: {
          ar: offerForms.ar,
          en: offerForms.en,
        },
        availableLanguages: ['ar', 'en'] as OfferLanguage[],
        contentMode: 'bilingual',
        defaultOfferLanguage,

        requestId: offerRequest.id,
        userId: offerRequest.userId || '',
        userEmail: offerRequest.userEmail || offerRequest.email || '',
        clientEmail: offerRequest.email || offerRequest.userEmail || '',
        clientPhone: offerRequest.phone || '',
        clientCompany: offerRequest.company || '',

        serviceCategory: templateMetadata.serviceCategory,
        templateSlug: templateMetadata.templateSlug,
        status: 'published',
        // Kept as ar/en for old code that expects a single language.
        offerLanguage: defaultOfferLanguage,
        sourceRequestLanguage: offerRequest.language || '',

        sourceRequest: {
          serviceTitle: offerRequest.serviceTitle || '',
          serviceSlug: offerRequest.serviceSlug || '',
          serviceType: offerRequest.serviceType || '',
          servicePackage: offerRequest.servicePackage || '',
          message: offerRequest.message || '',
          serviceSpecificAnswers: offerRequest.serviceSpecificAnswers || {},
        },

        updatedAt: serverTimestamp(),
      };

      if (offerId) {
        await updateDoc(doc(db, 'technicalOffers', offerId), offerPayload);
      } else {
        const offerRef = await addDoc(collection(db, 'technicalOffers'), {
          ...offerPayload,
          createdAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
        });

        offerId = offerRef.id;
      }

      const technicalOfferUrl = getPublicOfferUrl(offerId);

      await updateDoc(doc(db, 'serviceRequests', offerRequest.id), {
        requestStatus: 'approved',
        adminStatus: 'approved',
        status: 'approved',

        technicalOfferId: offerId,
        technicalOfferUrl,
        technicalOfferMeta: {
          title: primaryOfferForm.offerTitle,
          titleAr: offerForms.ar.offerTitle,
          titleEn: offerForms.en.offerTitle,
          clientName: primaryOfferForm.clientName,
          clientNameAr: offerForms.ar.clientName,
          clientNameEn: offerForms.en.clientName,
          offerLanguage: defaultOfferLanguage,
          availableLanguages: ['ar', 'en'] as OfferLanguage[],
          serviceCategory: templateMetadata.serviceCategory,
          templateSlug: templateMetadata.templateSlug,
          publishedAt: serverTimestamp(),
        },

        rejectionReason: '',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage(labels.offerSaved);
      closeOfferModal();
    } catch (firebaseError) {
      console.error('Error saving technical offer:', firebaseError);
      setError(labels.saveError);
    } finally {
      setSavingOffer(false);
    }
  };

  const openRejectModal = (request: ServiceRequest) => {
    setError('');
    setSuccessMessage('');
    setRejectRequest(request);
    setRejectionReason(request.rejectionReason || '');
  };

  const closeRejectModal = () => {
    if (rejecting) return;
    setRejectRequest(null);
    setRejectionReason('');
  };

  const handleRejectRequest = async () => {
    if (!rejectRequest) return;

    try {
      setRejecting(true);
      setError('');
      setSuccessMessage('');

      await updateDoc(doc(db, 'serviceRequests', rejectRequest.id), {
        requestStatus: 'rejected',
        adminStatus: 'rejected',
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage(labels.requestRejected);
      closeRejectModal();
    } catch (firebaseError) {
      console.error('Error rejecting request:', firebaseError);
      setError(labels.saveError);
    } finally {
      setRejecting(false);
    }
  };

  const openOfferInNewTab = (request: ServiceRequest) => {
    const offerUrl =
      request.technicalOfferUrl ||
      (request.technicalOfferId ? getPublicOfferUrl(request.technicalOfferId) : '');

    if (!offerUrl) return;

    window.open(offerUrl, '_blank', 'noopener,noreferrer');
  };

  const getOfferModalTitle = (request: ServiceRequest) => {
    const templateType = getOfferTemplateType(request);

    if (templateType === 'curricula-programs') {
      return isArabic
        ? 'إنشاء العرض الفني - المناهج والبرامج'
        : 'Create technical offer - Curricula and Programs';
    }

    return isArabic
      ? 'إنشاء العرض الفني - إدارة المواقع'
      : 'Create technical offer - Website Design & Management';
  };

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{labels.pageTitle}</h1>
        <p className="text-sm text-gray-500">{labels.pageDescription}</p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={labels.totalRequests}
          value={requests.length}
          icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
        />

        <StatsCard
          title={labels.todayRequests}
          value={todayRequestsCount}
          icon={<CalendarDays className="h-6 w-6 text-green-600" />}
        />

        <StatsCard
          title={labels.services}
          value={uniqueServicesCount}
          icon={<Globe2 className="h-6 w-6 text-purple-600" />}
        />

        <StatsCard
          title={labels.withPackage}
          value={requestsWithPackageCount}
          icon={<Package className="h-6 w-6 text-orange-600" />}
        />
      </div>

      <Card>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{labels.pageTitle}</h2>
            <p className="text-sm text-gray-500">
              {isArabic
                ? `عدد النتائج المعروضة: ${filteredRequests.length}`
                : `Showing ${filteredRequests.length} result(s)`}
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${
                isArabic ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className={`w-full rounded-lg border border-gray-300 bg-white py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                isArabic ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-gray-500">
            {labels.loading}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.date}
                  </th>
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.client}
                  </th>
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.contact}
                  </th>
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.service}
                  </th>
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.package}
                  </th>
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.status}
                  </th>
                  <th className={`px-4 py-3 text-sm font-medium text-gray-600 ${textAlignClass}`}>
                    {labels.actions}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                      {labels.noRequests}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => {
                    const requestStatus = getRequestStatus(request);
                    const hasOffer = Boolean(request.technicalOfferId || request.technicalOfferUrl);

                    return (
                      <tr
                        key={request.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 align-top text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(request.createdAt, locale)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                              <User className="h-4 w-4 text-blue-700" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {getFullName(request)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {request.company || labels.notProvided}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            {request.email ? (
                              <a
                                href={`mailto:${request.email}`}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <Mail className="h-4 w-4" />
                                {request.email}
                              </a>
                            ) : (
                              <p className="text-sm text-gray-400">{labels.notProvided}</p>
                            )}

                            {request.phone && (
                              <a
                                href={`tel:${request.phone}`}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                              >
                                <Phone className="h-4 w-4" />
                                {request.phone}
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.serviceTitle || labels.notProvided}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {request.serviceType || request.serviceSlug || labels.notProvided}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {request.servicePackage || labels.notProvided}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                              requestStatus
                            )}`}
                          >
                            {getStatusLabel(requestStatus)}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedRequest(request)}
                              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
                            >
                              <Eye className="h-4 w-4" />
                              {labels.details}
                            </button>

                            <button
                              type="button"
                              onClick={() => openOfferModal(request)}
                              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700"
                            >
                              {hasOffer ? (
                                <Edit3 className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              {hasOffer ? labels.editOffer : labels.acceptAndCreateOffer}
                            </button>

                            {hasOffer && (
                              <button
                                type="button"
                                onClick={() => openOfferInNewTab(request)}
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {labels.viewOffer}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openRejectModal(request)}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                            >
                              <XCircle className="h-4 w-4" />
                              {labels.reject}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{labels.details}</h3>
                <p className="text-sm text-gray-500">
                  {selectedRequest.serviceTitle || labels.notProvided}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label={labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <DetailsSection
                title={labels.basicInformation}
                icon={<User className="h-5 w-5 text-blue-600" />}
              >
                <InfoItem label={labels.firstName} value={selectedRequest.firstName} />
                <InfoItem label={labels.lastName} value={selectedRequest.lastName} />

                <InfoItem label={labels.email}>
                  {selectedRequest.email ? (
                    <a
                      href={`mailto:${selectedRequest.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedRequest.email}
                    </a>
                  ) : (
                    labels.notProvided
                  )}
                </InfoItem>

                <InfoItem label={labels.phone}>
                  {selectedRequest.phone ? (
                    <a
                      href={`tel:${selectedRequest.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedRequest.phone}
                    </a>
                  ) : (
                    labels.notProvided
                  )}
                </InfoItem>

                <InfoItem label={labels.company} value={selectedRequest.company} full />
              </DetailsSection>

              <DetailsSection
                title={labels.requestInformation}
                icon={<ClipboardList className="h-5 w-5 text-purple-600" />}
              >
                <InfoItem label={labels.serviceTitle} value={selectedRequest.serviceTitle} />
                <InfoItem label={labels.servicePackage} value={selectedRequest.servicePackage} />
                <InfoItem label={labels.serviceSlug} value={selectedRequest.serviceSlug} />
                <InfoItem label={labels.serviceType} value={selectedRequest.serviceType} />
                <InfoItem label={labels.language} value={selectedRequest.language} />
                <InfoItem label={labels.status} value={getStatusLabel(getRequestStatus(selectedRequest))} />
                <InfoItem
                  label={labels.privacy}
                  value={formatValue(selectedRequest.privacy, isArabic)}
                />
                <InfoItem
                  label={labels.createdAt}
                  value={formatDate(selectedRequest.createdAt, locale)}
                  full
                />
              </DetailsSection>

              <DetailsSection
                title={labels.serviceAnswers}
                icon={<FileText className="h-5 w-5 text-green-600" />}
              >
                {Object.entries(selectedRequest.serviceSpecificAnswers || {}).length > 0 ? (
                  Object.entries(selectedRequest.serviceSpecificAnswers || {}).map(
                    ([key, value]) => (
                      <InfoItem
                        key={key}
                        label={
                          selectedRequest.serviceSpecificQuestionLabels?.[key] ||
                          formatFieldKey(key)
                        }
                        value={formatValue(value, isArabic)}
                        full={typeof value === 'object'}
                      />
                    )
                  )
                ) : (
                  <div className="md:col-span-2 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                    {labels.notProvided}
                  </div>
                )}
              </DetailsSection>

              <DetailsSection
                title={labels.additionalMessage}
                icon={<MessageSquare className="h-5 w-5 text-orange-600" />}
              >
                <InfoItem
                  label={labels.additionalMessage}
                  value={selectedRequest.message}
                  full
                />
              </DetailsSection>
            </div>
          </div>
        </div>
      )}

      {offerRequest && offerForms && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={closeOfferModal}
        >
          <div
            className="my-6 w-full max-w-6xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-white px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {getOfferModalTitle(offerRequest)}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {labels.offerModalDescription}
                </p>

                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-800">
                  {labels.bilingualOfferHint}
                </div>
              </div>

              <button
                type="button"
                onClick={closeOfferModal}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label={labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <LanguageOfferEditor
                title={labels.arabicVersion}
                description={labels.arabicVersionDescription}
                language="ar"
                dir="rtl"
                form={offerForms.ar}
                fieldLabels={getOfferFieldLabels('ar', getOfferTemplateType(offerRequest))}
                onChange={handleOfferFormChange}
              />

              <LanguageOfferEditor
                title={labels.englishVersion}
                description={labels.englishVersionDescription}
                language="en"
                dir="ltr"
                form={offerForms.en}
                fieldLabels={getOfferFieldLabels('en', getOfferTemplateType(offerRequest))}
                onChange={handleOfferFormChange}
              />
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeOfferModal}
                disabled={savingOffer}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {labels.offerCancel}
              </button>

              <button
                type="button"
                onClick={handleSaveOffer}
                disabled={savingOffer}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {savingOffer ? labels.offerSaving : labels.offerSavePublish}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeRejectModal}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{labels.rejectTitle}</h3>
                <p className="mt-1 text-sm text-gray-500">{labels.rejectDescription}</p>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label={labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <FormTextarea
                label={labels.rejectionReason}
                value={rejectionReason}
                onChange={setRejectionReason}
                rows={5}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={rejecting}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {labels.cancel}
              </button>

              <button
                type="button"
                onClick={handleRejectRequest}
                disabled={rejecting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                {rejecting ? labels.saving : labels.confirmReject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type StatsCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon }) => {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
          {icon}
        </div>
      </div>
    </Card>
  );
};

type DetailsSectionProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

const DetailsSection: React.FC<DetailsSectionProps> = ({ title, icon, children }) => {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
};

type InfoItemProps = {
  label: string;
  value?: unknown;
  children?: React.ReactNode;
  full?: boolean;
};

const InfoItem: React.FC<InfoItemProps> = ({ label, value, children, full = false }) => {
  const displayValue =
    value === null || value === undefined || value === '' ? '-' : String(value);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 p-4 ${
        full ? 'md:col-span-2' : ''
      }`}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <div className="whitespace-pre-wrap break-words text-sm font-medium text-gray-900">
        {children || displayValue}
      </div>
    </div>
  );
};

type LanguageOfferEditorProps = {
  title: string;
  description: string;
  language: OfferLanguage;
  dir: 'rtl' | 'ltr';
  form: TechnicalOfferForm;
  fieldLabels: TechnicalOfferFieldLabels;
  onChange: (
    language: OfferLanguage,
    field: keyof TechnicalOfferForm,
    value: string
  ) => void;
};

const LanguageOfferEditor: React.FC<LanguageOfferEditorProps> = ({
  title,
  description,
  language,
  dir,
  form,
  fieldLabels,
  onChange,
}) => {
  const handleChange = (field: keyof TechnicalOfferForm, value: string) => {
    onChange(language, field, value);
  };

  return (
    <section
      dir={dir}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200">
          {language}
        </span>
      </div>

      <div className="space-y-5">
        <FormInput
          label={fieldLabels.clientName}
          value={form.clientName}
          onChange={(value) => handleChange('clientName', value)}
        />

        <FormInput
          label={fieldLabels.clientDescription}
          value={form.clientDescription}
          onChange={(value) => handleChange('clientDescription', value)}
        />

        <FormInput
          label={fieldLabels.offerTitle}
          value={form.offerTitle}
          onChange={(value) => handleChange('offerTitle', value)}
        />

        <FormInput
          label={fieldLabels.offerSubtitle}
          value={form.offerSubtitle}
          onChange={(value) => handleChange('offerSubtitle', value)}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormInput
            label={fieldLabels.offerDate}
            type="date"
            value={form.offerDate}
            onChange={(value) => handleChange('offerDate', value)}
          />

          <FormInput
            label={fieldLabels.validUntil}
            type="date"
            value={form.validUntil}
            onChange={(value) => handleChange('validUntil', value)}
          />
        </div>

        <FormTextarea
          label={fieldLabels.executiveSummary}
          value={form.executiveSummary}
          onChange={(value) => handleChange('executiveSummary', value)}
          rows={5}
        />

        <FormTextarea
          label={fieldLabels.currentSituation}
          value={form.currentSituation}
          onChange={(value) => handleChange('currentSituation', value)}
          rows={4}
        />

        <FormTextarea
          label={fieldLabels.goalAfterDevelopment}
          value={form.goalAfterDevelopment}
          onChange={(value) => handleChange('goalAfterDevelopment', value)}
          rows={4}
        />

        <FormInput
          label={fieldLabels.projectScope}
          value={form.projectScope}
          onChange={(value) => handleChange('projectScope', value)}
        />

        <FormTextarea
          label={fieldLabels.proposedServices}
          value={form.proposedServices}
          onChange={(value) => handleChange('proposedServices', value)}
          rows={8}
        />

        <FormTextarea
          label={fieldLabels.deliverables}
          value={form.deliverables}
          onChange={(value) => handleChange('deliverables', value)}
          rows={7}
        />

        <FormTextarea
          label={fieldLabels.implementationPlan}
          value={form.implementationPlan}
          onChange={(value) => handleChange('implementationPlan', value)}
          rows={7}
        />

        <FormTextarea
          label={fieldLabels.technicalStack}
          value={form.technicalStack}
          onChange={(value) => handleChange('technicalStack', value)}
          rows={6}
        />

        <FormInput
          label={fieldLabels.estimatedTimeline}
          value={form.estimatedTimeline}
          onChange={(value) => handleChange('estimatedTimeline', value)}
        />

        <FormInput
          label={fieldLabels.websitePackagePrice}
          value={form.websitePackagePrice}
          onChange={(value) => handleChange('websitePackagePrice', value)}
        />

        <FormInput
          label={fieldLabels.platformPackagePrice}
          value={form.platformPackagePrice}
          onChange={(value) => handleChange('platformPackagePrice', value)}
        />

        <FormInput
          label={fieldLabels.monthlyMaintenance}
          value={form.monthlyMaintenance}
          onChange={(value) => handleChange('monthlyMaintenance', value)}
        />

        <FormTextarea
          label={fieldLabels.notIncluded}
          value={form.notIncluded}
          onChange={(value) => handleChange('notIncluded', value)}
          rows={5}
        />

        <FormTextarea
          label={fieldLabels.nextSteps}
          value={form.nextSteps}
          onChange={(value) => handleChange('nextSteps', value)}
          rows={5}
        />
      </div>
    </section>
  );
};

type FormInputProps = {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
};

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  type = 'text',
  onChange,
}) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
      />
    </label>
  );
};

type FormTextareaProps = {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
};

const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  value,
  rows = 4,
  onChange,
}) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-800">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-7 text-gray-900 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
      />
    </label>
  );
};
