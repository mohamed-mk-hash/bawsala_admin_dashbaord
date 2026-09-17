import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, FileText, Languages, Printer } from "lucide-react";

import { db } from "../firebase";

const ALEXANDRIA_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap";

const ALEXANDRIA_FONT_FAMILY =
  '"Alexandria", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const alexandriaFontStyle: React.CSSProperties = {
  fontFamily: ALEXANDRIA_FONT_FAMILY,
};

const useAlexandriaFont = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const existingFontLink = document.getElementById("alexandria-google-font");

    if (existingFontLink) return;

    const googleFontsPreconnect = document.createElement("link");
    googleFontsPreconnect.rel = "preconnect";
    googleFontsPreconnect.href = "https://fonts.googleapis.com";

    const googleStaticPreconnect = document.createElement("link");
    googleStaticPreconnect.rel = "preconnect";
    googleStaticPreconnect.href = "https://fonts.gstatic.com";
    googleStaticPreconnect.crossOrigin = "anonymous";

    const fontLink = document.createElement("link");
    fontLink.id = "alexandria-google-font";
    fontLink.rel = "stylesheet";
    fontLink.href = ALEXANDRIA_FONT_URL;

    document.head.appendChild(googleFontsPreconnect);
    document.head.appendChild(googleStaticPreconnect);
    document.head.appendChild(fontLink);
  }, []);
};

type OfferLanguage = "ar" | "en";

type TechnicalOfferContent = {
  clientName?: string;
  clientDescription?: string;
  offerTitle?: string;
  offerSubtitle?: string;
  offerDate?: string;
  validUntil?: string;

  executiveSummary?: string;
  currentSituation?: string;
  goalAfterDevelopment?: string;
  projectScope?: string;

  proposedServices?: string;
  deliverables?: string;
  implementationPlan?: string;
  technicalStack?: string;

  estimatedTimeline?: string;
  websitePackagePrice?: string;
  platformPackagePrice?: string;
  monthlyMaintenance?: string;

  notIncluded?: string;
  nextSteps?: string;
};

type SourceRequest = {
  serviceTitle?: string;
  serviceSlug?: string;
  serviceType?: string;
  servicePackage?: string;
  message?: string;
  serviceSpecificAnswers?: Record<string, unknown>;
};

type TechnicalOffer = TechnicalOfferContent & {
  id: string;

  offerLanguage?: OfferLanguage;
  defaultOfferLanguage?: OfferLanguage;
  language?: string;
  status?: string;

  translations?: Partial<Record<OfferLanguage, TechnicalOfferContent>>;
  localizedContent?: Partial<Record<OfferLanguage, TechnicalOfferContent>>;
  availableLanguages?: OfferLanguage[];
  contentMode?: "single" | "bilingual" | string;

  userEmail?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  serviceCategory?: string;
  templateSlug?: string;
  sourceRequest?: SourceRequest;

  coverImageUrl?: string;
  presentationImageUrl?: string;
  imageUrl?: string;
  mainImageUrl?: string;
};

const TRANSLATIONS = {
  ar: {
    back: "العودة إلى طلبات الخدمات",
    print: "طباعة / حفظ PDF",
    loading: "جاري تحميل العرض الفني...",
    notFound: "العرض الفني غير موجود",
    notFoundDescription:
      "لم نتمكن من العثور على هذا العرض. تأكد من أن الرابط صحيح وأن العرض محفوظ في Firebase.",
    technicalOffer: "عرض فني",
    preparedFor: "مُقدَّم إلى",
    preparedBy: "مُقدَّم من",
    bawsala: "بوصلة",
    confidential: "وثيقة سرية",
    offerDate: "تاريخ العرض",
    validUntil: "صالح إلى غاية",

    viewLanguage: "لغة عرض الصفحة",
    arabic: "العربية",
    english: "English",
    showingFallback:
      "هذه النسخة غير متوفرة لهذا العرض، لذلك يتم عرض النسخة المتاحة حالياً.",

    executiveSummary: "الملخص التنفيذي",
    currentSituation: "الوضع الحالي",
    goalAfterDevelopment: "الهدف بعد التطوير",
    projectScope: "نطاق العمل",
    proposedServices: "الخدمات المقترحة",
    deliverables: "المخرجات النهائية",
    implementationPlan: "خطة التنفيذ",
    technicalStack: "المقترح التقني",
    commercialSummary: "الملخص التجاري",
    estimatedTimeline: "المدة الزمنية التقديرية",
    websitePackagePrice: "سعر باقة الموقع",
    platformPackagePrice: "سعر إضافة لوحة الإدارة / المنصة",
    monthlyMaintenance: "الصيانة الشهرية",
    notIncluded: "التكاليف غير المشمولة",
    nextSteps: "الخطوات التالية",

    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    serviceCategory: "قسم الخدمة",
    notProvided: "غير متوفر",
    footer: "بوصلة طريق الريادة",

    curriculaIntro: "مقدمة",
    trainerIdentity: "أولاً: الهوية التدريبية للمدرب",
    identityPillars: "ترتكز هويته على خمسة مرتكزات أساسية:",
    proposedCourses: "ثانياً: الدورات التدريبية المقترحة",
    whyImportant: "لماذا هذا العرض مهم؟",
    coordination: "آليات التنفيذ والتنسيق",
    course: "الدورة",
    objectives: "الأهداف الرئيسية",
    preparationType: "نوع الإعداد",
    suggestedHours: "عدد الساعات المقترحة",
    commercialTerms: "المؤشرات التجارية",
    contactLine: "+213 540 299 322",
  },

  en: {
    back: "Back to service requests",
    print: "Print / Save PDF",
    loading: "Loading technical offer...",
    notFound: "Technical offer not found",
    notFoundDescription:
      "We could not find this offer. Please make sure the link is correct and the offer is saved in Firebase.",
    technicalOffer: "Technical Offer",
    preparedFor: "Prepared for",
    preparedBy: "Prepared by",
    bawsala: "Bawsala",
    confidential: "Confidential document",
    offerDate: "Offer date",
    validUntil: "Valid until",

    viewLanguage: "Page language",
    arabic: "العربية",
    english: "English",
    showingFallback:
      "This language version is not available for this offer, so the available version is being shown.",

    executiveSummary: "Executive summary",
    currentSituation: "Current situation",
    goalAfterDevelopment: "Goal after development",
    projectScope: "Project scope",
    proposedServices: "Proposed services",
    deliverables: "Final deliverables",
    implementationPlan: "Implementation plan",
    technicalStack: "Technical proposal",
    commercialSummary: "Commercial Summary",
    estimatedTimeline: "Estimated timeline",
    websitePackagePrice: "Website package price",
    platformPackagePrice: "Admin panel / platform add-on price",
    monthlyMaintenance: "Monthly maintenance",
    notIncluded: "Not included costs",
    nextSteps: "Next steps",

    email: "Email",
    phone: "Phone",
    serviceCategory: "Service category",
    notProvided: "Not provided",
    footer: "Bawsala, your path to leadership",

    curriculaIntro: "Introduction",
    trainerIdentity: "First: Trainer Training Identity",
    identityPillars: "The identity is built on five main pillars:",
    proposedCourses: "Second: Proposed Training Courses",
    whyImportant: "Why is this offer important?",
    coordination: "Execution and Coordination Mechanisms",
    course: "Course",
    objectives: "Main Objectives",
    preparationType: "Preparation Type",
    suggestedHours: "Suggested Hours",
    commercialTerms: "Commercial Indicators",
    contactLine: "+213 540 299 322",
  },
};

const isOfferLanguage = (value: unknown): value is OfferLanguage => {
  return value === "ar" || value === "en";
};

const hasContent = (content?: TechnicalOfferContent | null) => {
  if (!content) return false;

  return Object.values(content).some((value) => {
    return typeof value === "string" && value.trim().length > 0;
  });
};

const getFlatOfferContent = (offer: TechnicalOffer): TechnicalOfferContent => ({
  clientName: offer.clientName,
  clientDescription: offer.clientDescription,
  offerTitle: offer.offerTitle,
  offerSubtitle: offer.offerSubtitle,
  offerDate: offer.offerDate,
  validUntil: offer.validUntil,

  executiveSummary: offer.executiveSummary,
  currentSituation: offer.currentSituation,
  goalAfterDevelopment: offer.goalAfterDevelopment,
  projectScope: offer.projectScope,

  proposedServices: offer.proposedServices,
  deliverables: offer.deliverables,
  implementationPlan: offer.implementationPlan,
  technicalStack: offer.technicalStack,

  estimatedTimeline: offer.estimatedTimeline,
  websitePackagePrice: offer.websitePackagePrice,
  platformPackagePrice: offer.platformPackagePrice,
  monthlyMaintenance: offer.monthlyMaintenance,

  notIncluded: offer.notIncluded,
  nextSteps: offer.nextSteps,
});

const getTranslatedContent = (
  offer: TechnicalOffer,
  language: OfferLanguage
): TechnicalOfferContent | undefined => {
  return offer.translations?.[language] || offer.localizedContent?.[language];
};

const resolveOfferContent = (
  offer: TechnicalOffer,
  selectedLanguage: OfferLanguage
): {
  content: TechnicalOfferContent;
  contentLanguage: OfferLanguage;
  usedFallback: boolean;
} => {
  const selectedContent = getTranslatedContent(offer, selectedLanguage);

  if (hasContent(selectedContent)) {
    return {
      content: selectedContent || {},
      contentLanguage: selectedLanguage,
      usedFallback: false,
    };
  }

  const fallbackLanguage: OfferLanguage = selectedLanguage === "ar" ? "en" : "ar";
  const fallbackContent = getTranslatedContent(offer, fallbackLanguage);

  if (hasContent(fallbackContent)) {
    return {
      content: fallbackContent || {},
      contentLanguage: fallbackLanguage,
      usedFallback: true,
    };
  }

  const flatContent = getFlatOfferContent(offer);

  return {
    content: flatContent,
    contentLanguage:
      offer.offerLanguage === "en" || offer.language === "en" ? "en" : selectedLanguage,
    usedFallback: false,
  };
};

const getInitialOfferLanguage = (offer: TechnicalOffer): OfferLanguage => {
  const urlLanguage = new URLSearchParams(window.location.search).get("lang");

  if (isOfferLanguage(urlLanguage)) {
    return urlLanguage;
  }

  if (isOfferLanguage(offer.defaultOfferLanguage)) {
    return offer.defaultOfferLanguage;
  }

  if (isOfferLanguage(offer.offerLanguage)) {
    return offer.offerLanguage;
  }

  if (offer.language === "en") {
    return "en";
  }

  return "ar";
};

const updateLanguageInUrl = (language: OfferLanguage) => {
  const params = new URLSearchParams(window.location.search);
  params.set("lang", language);

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
};

const formatDate = (value?: string, language: OfferLanguage = "ar") => {
  if (!value) return "-";

  const normalizedValue = value.includes("/") ? value : `${value}T00:00:00`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(language === "ar" ? "ar-DZ" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const splitLines = (value?: string) => {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const getValue = (value?: string, fallback = "-") => {
  return value && value.trim() ? value : fallback;
};

const normalizeSearchText = (value: unknown) => {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
};

const isCurriculaProgramsOffer = (
  offer: TechnicalOffer,
  content: TechnicalOfferContent
) => {
  const searchText = [
    offer.serviceCategory,
    offer.templateSlug,
    offer.sourceRequest?.serviceTitle,
    offer.sourceRequest?.serviceSlug,
    offer.sourceRequest?.serviceType,
    content.offerTitle,
    content.offerSubtitle,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return (
    searchText.includes("curricula") ||
    searchText.includes("curriculum") ||
    searchText.includes("program") ||
    searchText.includes("programs") ||
    searchText.includes("training") ||
    searchText.includes("مناهج") ||
    searchText.includes("برامج") ||
    searchText.includes("تدريب")
  );
};

const getPresentationImageUrl = (offer: TechnicalOffer) => {
  return (
    offer.presentationImageUrl ||
    offer.coverImageUrl ||
    offer.mainImageUrl ||
    offer.imageUrl ||
    ""
  );
};

type CourseRow = {
  course: string;
  objectives: string[];
  preparationType: string;
  hours: string;
};

const getDefaultCourseRows = (language: OfferLanguage): CourseRow[] => {
  if (language === "ar") {
    return [
      {
        course: "فن التعامل الراقي والبروتوكول",
        objectives: [
          "فهم قواعد الإتيكيت الرسمي والمهني.",
          "التمييز بين البروتوكول الداخلي والدولي.",
          "إدارة الحضور والانطباع الأول.",
          "تطبيق مهارات التعامل والاجتماعات الرسمية.",
        ],
        preparationType: "إعداد متكامل يشمل دليل مدرب + دليل متدرب + كراس تمارين + نموذج تقييم قبلي/بعدي.",
        hours: "12 - 18 ساعة",
      },
      {
        course: "أدوات Google Workspace",
        objectives: [
          "بناء منظومة عمل متكاملة باستخدام أدوات Google.",
          "تنظيم الملفات والتعاون بطريقة مؤسسية واضحة.",
          "إدارة المحتوى والبيانات عبر Google Drive و Forms و Sheets.",
        ],
        preparationType: "نماذج عرض احترافية + مواد تطبيقية.",
        hours: "6 ساعات",
      },
      {
        course: "إدارة الفريق الفعال",
        objectives: [
          "فهم ديناميكيات الفريق ومراحل التشكل.",
          "تعزيز الأدوار داخل الفريق.",
          "إدارة الخلافات والصراعات باحترافية.",
          "بناء ثقافة فريق مستدامة ومتعاونة.",
        ],
        preparationType: "إعداد متكامل يشمل دليل مدرب + دليل متدرب + كراس تمارين + نموذج تقييم.",
        hours: "6 - 12 ساعة",
      },
      {
        course: "تنظيم وإدارة الفعاليات",
        objectives: [
          "تخطيط الفعاليات وفق منهجية واضحة وموسعة.",
          "إعداد ميزانية احترافية قابلة للمتابعة.",
          "إدارة المخاطر والخطة التشغيلية.",
          "تقييم الفعالية وقياس نجاحها بعد التنفيذ.",
        ],
        preparationType: "إعداد متكامل يشمل دليل مدرب + دليل متدرب + كراس تمارين + نموذج تقييم.",
        hours: "15 - 18 ساعة",
      },
    ];
  }

  return [
    {
      course: "Professional Etiquette and Protocol",
      objectives: [
        "Understand formal and professional etiquette rules.",
        "Differentiate between internal and international protocol.",
        "Manage presence and first impression.",
        "Apply professional communication and meeting practices.",
      ],
      preparationType: "Complete preparation including trainer guide, trainee guide, exercises, and pre/post evaluation.",
      hours: "12 - 18 hours",
    },
    {
      course: "Google Workspace Tools",
      objectives: [
        "Build a practical work system using Google tools.",
        "Organize files and collaboration clearly.",
        "Manage content and data through Drive, Forms, and Sheets.",
      ],
      preparationType: "Professional presentation models and practical materials.",
      hours: "6 hours",
    },
    {
      course: "Effective Team Management",
      objectives: [
        "Understand team dynamics and formation stages.",
        "Strengthen roles inside the team.",
        "Handle conflicts professionally.",
        "Build a sustainable collaborative team culture.",
      ],
      preparationType: "Complete preparation including guides, exercises, and evaluation tools.",
      hours: "6 - 12 hours",
    },
    {
      course: "Event Organization and Management",
      objectives: [
        "Plan events using a clear methodology.",
        "Prepare professional trackable budgets.",
        "Manage risks and operational plans.",
        "Evaluate success after execution.",
      ],
      preparationType: "Complete preparation including guides, exercises, and evaluation tools.",
      hours: "15 - 18 hours",
    },
  ];
};

const getFallbackLines = (
  value: string | undefined,
  fallback: string[]
) => {
  const lines = splitLines(value);
  return lines.length ? lines : fallback;
};

export const TechnicalOfferPage: React.FC = () => {
  useAlexandriaFont();

  const { offerId } = useParams<{ offerId: string }>();

  const [offer, setOffer] = useState<TechnicalOffer | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<OfferLanguage>("ar");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const resolvedOffer = useMemo(() => {
    if (!offer) {
      return {
        content: {} as TechnicalOfferContent,
        contentLanguage: selectedLanguage,
        usedFallback: false,
      };
    }

    return resolveOfferContent(offer, selectedLanguage);
  }, [offer, selectedLanguage]);

  const content = resolvedOffer.content;
  const pageLanguage = resolvedOffer.contentLanguage;
  const isArabic = pageLanguage === "ar";
  const t = TRANSLATIONS[pageLanguage];

  useEffect(() => {
    const loadOffer = async () => {
      if (!offerId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);

        const offerRef = doc(db, "technicalOffers", offerId);
        const offerSnapshot = await getDoc(offerRef);

        if (!offerSnapshot.exists()) {
          setNotFound(true);
          setOffer(null);
          return;
        }

        const loadedOffer = {
          id: offerSnapshot.id,
          ...(offerSnapshot.data() as Omit<TechnicalOffer, "id">),
        };

        setOffer(loadedOffer);
        setSelectedLanguage(getInitialOfferLanguage(loadedOffer));
      } catch (error) {
        console.error("Error loading technical offer:", error);
        setNotFound(true);
        setOffer(null);
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [offerId]);

  const commercialRows = useMemo(() => {
    return [
      {
        label: t.estimatedTimeline,
        value: content.estimatedTimeline,
      },
      {
        label: t.websitePackagePrice,
        value: content.websitePackagePrice,
      },
      {
        label: t.platformPackagePrice,
        value: content.platformPackagePrice,
      },
      {
        label: t.monthlyMaintenance,
        value: content.monthlyMaintenance,
      },
    ];
  }, [content, t]);

  const handleLanguageChange = (language: OfferLanguage) => {
    setSelectedLanguage(language);
    updateLanguageInUrl(language);
  };

  if (loading) {
    return (
      <main
        className="min-h-screen bg-slate-50 px-4 py-10"
        dir={isArabic ? "rtl" : "ltr"}
        style={alexandriaFontStyle}
      >
        <div className="mx-auto flex min-h-[420px] max-w-4xl items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-500">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (notFound || !offer) {
    return (
      <main
        className="min-h-screen bg-slate-50 px-4 py-10"
        dir={isArabic ? "rtl" : "ltr"}
        style={alexandriaFontStyle}
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <FileText className="h-7 w-7 text-red-600" />
          </div>

          <h1 className="text-2xl font-black leading-relaxed text-slate-900">
            {t.notFound}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-slate-500">
            {t.notFoundDescription}
          </p>

          <Link
            to="/service-requests"
            className="mt-7 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
          >
            {t.back}
          </Link>
        </div>
      </main>
    );
  }

  const isCurriculaPresentation = isCurriculaProgramsOffer(offer, content);

  return (
    <main
      className={`min-h-screen px-4 py-8 print:bg-white print:p-0 ${
        isCurriculaPresentation ? "bg-[#eef0f4]" : "bg-slate-100"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
      style={alexandriaFontStyle}
    >
      <TopActions
        isArabic={isArabic}
        selectedLanguage={selectedLanguage}
        labels={t}
        onLanguageChange={handleLanguageChange}
      />

      {resolvedOffer.usedFallback && (
        <div
          className="mx-auto mb-5 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-8 text-amber-800 print:hidden"
          dir={selectedLanguage === "ar" ? "rtl" : "ltr"}
        >
          {TRANSLATIONS[selectedLanguage].showingFallback}
        </div>
      )}

      {isCurriculaPresentation ? (
        <CurriculaProgramsPresentation
          offer={offer}
          content={content}
          labels={t}
          language={pageLanguage}
          commercialRows={commercialRows}
        />
      ) : (
        <DefaultTechnicalOfferDocument
          offer={offer}
          content={content}
          labels={t}
          language={pageLanguage}
          commercialRows={commercialRows}
        />
      )}
    </main>
  );
};

type TopActionsProps = {
  isArabic: boolean;
  selectedLanguage: OfferLanguage;
  labels: typeof TRANSLATIONS.ar;
  onLanguageChange: (language: OfferLanguage) => void;
};

const TopActions: React.FC<TopActionsProps> = ({
  isArabic,
  selectedLanguage,
  labels,
  onLanguageChange,
}) => {
  return (
    <div className="mx-auto mb-5 flex max-w-6xl flex-col gap-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
      <Link
        to="/service-requests"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
      >
        <ArrowLeft className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} />
        {labels.back}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1">
          <span className="hidden items-center gap-2 px-3 text-xs font-black uppercase tracking-wide text-slate-500 sm:inline-flex">
            <Languages className="h-4 w-4 text-emerald-700" />
            {labels.viewLanguage}
          </span>

          <button
            type="button"
            onClick={() => onLanguageChange("ar")}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              selectedLanguage === "ar"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {TRANSLATIONS.ar.arabic}
          </button>

          <button
            type="button"
            onClick={() => onLanguageChange("en")}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              selectedLanguage === "en"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {TRANSLATIONS.en.english}
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
        >
          <Printer className="h-4 w-4" />
          {labels.print}
        </button>
      </div>
    </div>
  );
};

type DocumentProps = {
  offer: TechnicalOffer;
  content: TechnicalOfferContent;
  labels: typeof TRANSLATIONS.ar;
  language: OfferLanguage;
  commercialRows: {
    label: string;
    value?: string;
  }[];
};

const CurriculaProgramsPresentation: React.FC<DocumentProps> = ({
  offer,
  content,
  labels,
  language,
  commercialRows,
}) => {
  const isArabic = language === "ar";
  const imageUrl = getPresentationImageUrl(offer);
  const courseRows = getDefaultCourseRows(language);

  const introBullets = getFallbackLines(
    content.projectScope,
    isArabic
      ? [
          "تحويل المعرفة إلى مهارات عملية قابلة للتطبيق.",
          "إعداد مواد تدريبية احترافية تعكس صورة مؤسسية قوية.",
          "بناء مسارات تدريبية قابلة للتكرار والتوسع.",
          "توفير أدوات قياس أثر واضحة لكل دورة.",
        ]
      : [
          "Convert knowledge into practical applicable skills.",
          "Prepare professional training materials that reflect a strong institutional image.",
          "Build repeatable and scalable training paths.",
          "Provide clear impact measurement tools for every course.",
        ]
  );

  const identityBullets = getFallbackLines(
    content.proposedServices,
    isArabic
      ? [
          "يصنع الأثر: يبني برامجه على أهداف قابلة للقياس ومؤشرات نجاح واضحة.",
          "تطبيق تفاعلي: يعتمد التعلم بالممارسة والمحاكاة والحالات الواقعية.",
          "منهج منظم: يصمم كل برنامج وفق تسلسل واضح من التأصيل إلى التطبيق.",
          "احتراف في الإخراج: يقدم مواد تدريبية منظمة وعروضاً احترافية.",
          "استدامة في الأثر: يهيئ البرامج لتكون قابلة للتطبيق والتوسع المؤسسي.",
        ]
      : [
          "Creates impact: builds programs on measurable goals and clear success indicators.",
          "Interactive application: relies on practice, simulation, and real cases.",
          "Structured methodology: designs each program with a clear learning sequence.",
          "Professional output: provides organized materials and polished presentations.",
          "Sustainable impact: prepares programs for institutional implementation and scaling.",
        ]
  );

  const pillars = getFallbackLines(
    content.technicalStack,
    isArabic
      ? [
          "القيم والمنهجية التدريبية: صياغة الرؤية التدريبية وتحديد الركائز المعرفية والمنهجية.",
          "أساليب التدريب المعتمدة: تحديد نمط التدريب المناسب واعتماد أدوات تفاعلية محددة.",
          "أدوات إدارة البيئة التعليمية: تصميم آلية إدارة الجلسات والتقييم والمتابعة.",
          "الرؤية البصرية: تصميم قالب عرض موحد ودليل للمدرب وكراس للمتدرب.",
          "حوكمة التنفيذ: ضبط آليات التنسيق والتوثيق وقياس النتائج.",
        ]
      : [
          "Training values and methodology: define the training vision and knowledge pillars.",
          "Approved training methods: select the right training mode and interactive tools.",
          "Learning environment management: design session management, evaluation, and follow-up tools.",
          "Visual identity: create a unified presentation template, trainer guide, and trainee workbook.",
          "Execution governance: define coordination, documentation, and result measurement.",
        ]
  );

  const whyBullets = getFallbackLines(
    content.deliverables,
    isArabic
      ? [
          "يوفر محتوى تدريبي متكامل وأدوات عملية لتمكين المدرب والمتدربين.",
          "يضمن أثراً ملموساً ومستداماً للمهارات وقابلاً للقياس.",
          "يعزز صورة المدرب كمحترف قادر على تطوير مهارات فرق العمل.",
          "يفتح فرص تعاون وشراكات مستقبلية.",
        ]
      : [
          "Provides complete training content and practical tools for the trainer and participants.",
          "Ensures measurable and sustainable skill impact.",
          "Strengthens the trainer image as a professional capable of developing teams.",
          "Creates opportunities for future partnerships and collaborations.",
        ]
  );

  const coordinationBullets = getFallbackLines(
    content.implementationPlan,
    isArabic
      ? [
          "تحديد مؤشرات كمية لكل خدمة قبل التعاقد لضمان وضوح نطاق العمل.",
          "تخضع الطلبات الإضافية لاتفاقيات فرعية منفصلة أو ملاحق إضافية.",
          "تتم مراجعة دورية للأداء عبر اجتماعات تنسيق شهرية.",
          "تسليم النسخ النهائية بعد ضبط المحتوى والهوية البصرية.",
        ]
      : [
          "Define quantitative indicators for each service before contracting.",
          "Additional requests are handled through separate agreements or appendices.",
          "Review performance through periodic coordination meetings.",
          "Deliver final versions after aligning content and visual identity.",
        ]
  );

  return (
    <article className="mx-auto w-full max-w-[850px] print:max-w-none">
      <CurriculaPage pageNumber="01" labels={labels} language={language}>
        <div className="flex h-full flex-col justify-center">
          <div className="mb-10 flex items-center justify-between">
            <BawsalaMark labels={labels} />
            <span className="rounded-full bg-[#1b2f6f] px-7 py-2 text-base font-black text-white">
              {labels.technicalOffer}
            </span>
          </div>

          <h1 className="mx-auto max-w-[640px] text-center text-[42px] font-black leading-[1.55] text-[#1b2f6f]">
            {getValue(content.offerTitle, labels.technicalOffer)}
          </h1>

          <p className="mx-auto mt-7 max-w-[620px] text-center text-[18px] font-bold leading-[2] text-[#1b2f6f]">
            {getValue(content.offerSubtitle, "")}
          </p>

          <dl className="mx-auto mt-16 grid w-full max-w-[620px] grid-cols-2 gap-x-10 gap-y-7 text-[#1b2f6f]">
            <PresentationDefinition
              label={labels.preparedFor}
              value={getValue(content.clientName, labels.notProvided)}
            />
            <PresentationDefinition
              label={labels.preparedBy}
              value={labels.bawsala}
            />
            <PresentationDefinition
              label={labels.offerDate}
              value={formatDate(content.offerDate, language)}
            />
            <PresentationDefinition
              label={labels.validUntil}
              value={formatDate(content.validUntil, language)}
            />
          </dl>
        </div>
      </CurriculaPage>

      <CurriculaPage pageNumber="02" labels={labels} language={language}>
        <PillTitle>{labels.curriculaIntro}</PillTitle>

        <ParagraphBlock>
          {getValue(content.executiveSummary, labels.notProvided)}
        </ParagraphBlock>

        <ArrowList lines={introBullets} language={language} />

        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="mt-10 h-[390px] w-full object-cover"
          />
        ) : (
          <div className="mt-10 h-[300px] w-full border border-[#d7ddeb] bg-[#f7f8fb]" />
        )}
      </CurriculaPage>

      <CurriculaPage pageNumber="03" labels={labels} language={language}>
        <PillTitle>{labels.trainerIdentity}</PillTitle>

        <ParagraphBlock>
          {getValue(content.currentSituation, labels.notProvided)}
        </ParagraphBlock>

        <ParagraphBlock>
          {getValue(content.goalAfterDevelopment, labels.notProvided)}
        </ParagraphBlock>

        <div className="mt-8 text-center text-[16px] font-black leading-[2] text-[#1b2f6f]">
          {labels.identityPillars}
        </div>

        <ArrowList lines={identityBullets} language={language} highlight />
      </CurriculaPage>

      <CurriculaPage pageNumber="04" labels={labels} language={language}>
        <div className="mt-8 text-center text-[16px] font-black leading-[2] text-[#1b2f6f]">
          {labels.identityPillars}
        </div>

        <div className="mt-8 space-y-6">
          {pillars.map((line, index) => {
            const [title, ...rest] = line.split(":");
            const body = rest.join(":").trim();

            return (
              <div key={`${line}-${index}`}>
                <h3 className="text-center text-[17px] font-black leading-[2] text-[#16bde8]">
                  {body ? title : line}
                </h3>

                {body && (
                  <ArrowList
                    lines={[body]}
                    language={language}
                    compact
                  />
                )}
              </div>
            );
          })}
        </div>
      </CurriculaPage>

      <CurriculaPage pageNumber="05" labels={labels} language={language} wide>
        <PillTitle>{labels.proposedCourses}</PillTitle>

        <div className="mt-8 overflow-hidden">
          <table className="w-full border-collapse text-[#1b2f6f]">
            <thead>
              <tr className="bg-[#24aeea] text-white">
                <CourseHeader>{labels.course}</CourseHeader>
                <CourseHeader>{labels.objectives}</CourseHeader>
                <CourseHeader>{labels.preparationType}</CourseHeader>
                <CourseHeader>{labels.suggestedHours}</CourseHeader>
              </tr>
            </thead>

            <tbody>
              {courseRows.map((row, index) => (
                <tr
                  key={row.course}
                  className={index % 2 === 0 ? "bg-white" : "bg-[#f0f0f0]"}
                >
                  <CourseCell className="w-[18%] font-black">
                    {row.course}
                  </CourseCell>

                  <CourseCell className="w-[42%]">
                    <ul className="list-disc space-y-1 px-5">
                      {row.objectives.map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                  </CourseCell>

                  <CourseCell className="w-[25%]">
                    {row.preparationType}
                  </CourseCell>

                  <CourseCell className="w-[15%]">
                    {row.hours}
                  </CourseCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10">
          <PillTitle small>{labels.commercialTerms}</PillTitle>

          <dl className="mt-6 space-y-3 text-[#1b2f6f]">
            {commercialRows.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[190px_minmax(0,1fr)] gap-5 border-b border-[#d7ddeb] pb-3"
              >
                <dt className="text-[13px] font-black leading-[2] text-[#1b2f6f]">
                  {item.label}
                </dt>
                <dd className="m-0 text-[13px] font-bold leading-[2]">
                  {getValue(item.value, labels.notProvided)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </CurriculaPage>

      <CurriculaPage pageNumber="06" labels={labels} language={language}>
        <PillTitle>{labels.whyImportant}</PillTitle>
        <ArrowList lines={whyBullets} language={language} />

        <div className="mt-14">
          <PillTitle>{labels.coordination}</PillTitle>
          <ArrowList lines={coordinationBullets} language={language} ordered />
        </div>

        <div className="mt-10">
          <PillTitle small>{labels.notIncluded}</PillTitle>
          <ParagraphBlock>
            {getValue(content.notIncluded, labels.notProvided)}
          </ParagraphBlock>
        </div>

        <div className="mt-8">
          <PillTitle small>{labels.nextSteps}</PillTitle>
          <ArrowList
            lines={getFallbackLines(content.nextSteps, [labels.notProvided])}
            language={language}
          />
        </div>
      </CurriculaPage>
    </article>
  );
};

type CurriculaPageProps = {
  children: React.ReactNode;
  pageNumber: string;
  labels: typeof TRANSLATIONS.ar;
  language: OfferLanguage;
  wide?: boolean;
};

const CurriculaPage: React.FC<CurriculaPageProps> = ({
  children,
  pageNumber,
  labels,
  language,
  wide = false,
}) => {
  const isArabic = language === "ar";

  return (
    <section
      className={`mx-auto mb-8 flex min-h-[1120px] w-full ${
        wide ? "max-w-[850px]" : "max-w-[794px]"
      } flex-col bg-white px-[72px] py-[58px] text-[#1b2f6f] shadow-sm print:mb-0 print:min-h-screen print:max-w-none print:shadow-none`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex-1">{children}</div>

      <footer className="mt-10 flex items-end justify-between text-[10px] leading-[1.8] text-[#1b2f6f]">
        <div>
          <div>{labels.contactLine}</div>
          <div>contact@bawsala-dz.com</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-black text-[#24aeea]">{labels.bawsala}</div>
          <div className="text-[9px] font-bold text-[#1b2f6f]">{labels.footer}</div>
        </div>
      </footer>

      <div className="mt-1 text-center text-[10px] text-slate-400 print:hidden">
        {pageNumber}
      </div>
    </section>
  );
};

const BawsalaMark: React.FC<{ labels: typeof TRANSLATIONS.ar }> = ({ labels }) => {
  return (
    <div className="text-center">
      <div className="text-[28px] font-black text-[#24aeea]">{labels.bawsala}</div>
      <div className="text-[11px] font-bold text-[#1b2f6f]">{labels.footer}</div>
    </div>
  );
};

const PillTitle: React.FC<{ children: React.ReactNode; small?: boolean }> = ({
  children,
  small = false,
}) => {
  return (
    <h2
      className={`mx-auto w-fit rounded-full bg-[#1b2f6f] px-8 ${
        small ? "py-1.5 text-[22px]" : "py-2 text-[28px]"
      } text-center font-black leading-[1.7] text-white`}
    >
      {children}
    </h2>
  );
};

const ParagraphBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <p className="mx-auto mt-8 max-w-[610px] whitespace-pre-wrap text-center text-[15px] font-medium leading-[2.05] text-[#1b2f6f]">
      {children}
    </p>
  );
};

type ArrowListProps = {
  lines: string[];
  language: OfferLanguage;
  highlight?: boolean;
  compact?: boolean;
  ordered?: boolean;
};

const ArrowList: React.FC<ArrowListProps> = ({
  lines,
  language,
  highlight = false,
  ordered = false,
}) => {
  const isArabic = language === "ar";

  return (
    <ul className={`mx-auto mt-6 max-w-[610px] space-y-2 text-[#1b2f6f]`}>
      {lines.map((line, index) => (
        <li
          key={`${line}-${index}`}
          className={`flex gap-2 text-[15px] font-bold leading-[2] ${
            isArabic ? "flex-row" : "flex-row"
          }`}
        >
          <span className="mt-[7px] shrink-0 text-[#1b2f6f]">
            {ordered ? `${index + 1}.` : isArabic ? "⬅" : "➜"}
          </span>

          <span className={highlight ? "text-[#12bde8]" : ""}>{line}</span>
        </li>
      ))}
    </ul>
  );
};

const CourseHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <th className="border border-white/40 px-3 py-4 text-center text-[13px] font-black leading-[1.9]">
      {children}
    </th>
  );
};

const CourseCell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <td
      className={`border border-white px-3 py-4 align-top text-center text-[12px] font-semibold leading-[1.9] ${className}`}
    >
      {children}
    </td>
  );
};

const PresentationDefinition: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => {
  return (
    <div>
      <dt className="text-[13px] font-black leading-[2] text-[#1b2f6f]">
        {label}
      </dt>
      <dd className="m-0 text-[16px] font-black leading-[2] text-[#1b2f6f]">
        {value}
      </dd>
    </div>
  );
};

const DefaultTechnicalOfferDocument: React.FC<DocumentProps> = ({
  offer,
  content,
  labels,
  language,
  commercialRows,
}) => {
  return (
    <article className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white print:max-w-none print:rounded-none print:border-0">
      <header className="bg-slate-950 px-8 py-10 text-white md:px-12 md:py-14 print:bg-slate-950">
        <div className="flex items-start justify-between gap-6">
          <div className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 px-5">
            <span className="text-lg font-black text-white">{labels.bawsala}</span>
          </div>

          <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black leading-relaxed text-emerald-200">
            {labels.technicalOffer}
          </span>
        </div>

        <div className="mt-12 max-w-4xl">
          <h1 className="text-3xl font-black leading-[1.35] tracking-tight text-white md:text-5xl md:leading-[1.5]">
            {getValue(content.offerTitle, labels.technicalOffer)}
          </h1>

          <p className="mt-6 max-w-3xl text-sm font-medium leading-9 text-slate-300 md:text-base">
            {getValue(content.offerSubtitle, "")}
          </p>
        </div>

        <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-7 border-t border-white/20 pt-7 md:grid-cols-4">
          <InfoDefinition
            label={labels.preparedFor}
            value={getValue(content.clientName, labels.notProvided)}
            description={getValue(content.clientDescription, labels.notProvided)}
            dark
          />

          <InfoDefinition
            label={labels.preparedBy}
            value={labels.bawsala}
            description={labels.confidential}
            dark
          />

          <InfoDefinition
            label={labels.offerDate}
            value={formatDate(content.offerDate, language)}
            dark
          />

          <InfoDefinition
            label={labels.validUntil}
            value={formatDate(content.validUntil, language)}
            dark
          />
        </dl>
      </header>

      <section className="border-b border-slate-200 bg-slate-50 px-8 py-6 md:px-12">
        <dl className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <InfoDefinition
            label={labels.email}
            value={getValue(offer.clientEmail || offer.userEmail, labels.notProvided)}
          />
          <InfoDefinition
            label={labels.phone}
            value={getValue(offer.clientPhone, labels.notProvided)}
          />
          <InfoDefinition
            label={labels.serviceCategory}
            value={getValue(offer.serviceCategory, labels.notProvided)}
          />
        </dl>
      </section>

      <OfferSection title={labels.executiveSummary}>
        <p>{getValue(content.executiveSummary, labels.notProvided)}</p>
      </OfferSection>

      <section className="grid grid-cols-1 gap-10 border-b border-slate-200 px-8 py-9 md:grid-cols-2 md:px-12">
        <PlainTextBlock
          title={labels.currentSituation}
          text={getValue(content.currentSituation, labels.notProvided)}
        />

        <PlainTextBlock
          title={labels.goalAfterDevelopment}
          text={getValue(content.goalAfterDevelopment, labels.notProvided)}
        />
      </section>

      <OfferSection title={labels.projectScope}>
        <p>{getValue(content.projectScope, labels.notProvided)}</p>
      </OfferSection>

      <OfferSection title={labels.proposedServices}>
        <OfferList lines={splitLines(content.proposedServices)} emptyText={labels.notProvided} />
      </OfferSection>

      <OfferSection title={labels.deliverables}>
        <OfferList lines={splitLines(content.deliverables)} emptyText={labels.notProvided} />
      </OfferSection>

      <OfferSection title={labels.implementationPlan}>
        <OfferList lines={splitLines(content.implementationPlan)} emptyText={labels.notProvided} />
      </OfferSection>

      <OfferSection title={labels.technicalStack}>
        <OfferList lines={splitLines(content.technicalStack)} emptyText={labels.notProvided} />
      </OfferSection>

      <section className="border-b border-slate-200 px-8 py-9 md:px-12">
        <SectionTitle title={labels.commercialSummary} />

        <dl className="mt-7 border-t border-slate-300">
          {commercialRows.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-1 gap-2 border-b border-slate-200 py-5 md:grid-cols-[240px_minmax(0,1fr)] md:gap-8"
            >
              <dt className="text-sm font-black leading-8 text-slate-500">
                {item.label}
              </dt>

              <dd className="m-0 whitespace-pre-wrap break-words text-base font-bold leading-9 text-slate-950">
                {getValue(item.value, labels.notProvided)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <OfferSection title={labels.notIncluded}>
        <p>{getValue(content.notIncluded, labels.notProvided)}</p>
      </OfferSection>

      <OfferSection title={labels.nextSteps}>
        <OfferList lines={splitLines(content.nextSteps)} emptyText={labels.notProvided} />
      </OfferSection>

      <footer className="bg-slate-50 px-8 py-8 md:px-12">
        <strong className="block text-lg font-black leading-8 text-slate-900">
          {labels.footer}
        </strong>

        <span className="mt-2 block text-sm leading-7 text-slate-500">
          serine@bawsala-dz.com - bouaicha@bawsala-dz.com
        </span>
      </footer>
    </article>
  );
};

type InfoDefinitionProps = {
  label: string;
  value: string;
  description?: string;
  dark?: boolean;
};

const InfoDefinition: React.FC<InfoDefinitionProps> = ({
  label,
  value,
  description,
  dark = false,
}) => {
  return (
    <div>
      <dt
        className={`mb-2 text-xs font-black uppercase leading-7 ${
          dark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </dt>

      <dd className="m-0">
        <strong
          className={`block break-words text-base font-black leading-8 ${
            dark ? "text-white" : "text-slate-950"
          }`}
        >
          {value}
        </strong>

        {description && (
          <span
            className={`mt-2 block text-sm font-medium leading-8 ${
              dark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {description}
          </span>
        )}
      </dd>
    </div>
  );
};

type OfferSectionProps = {
  title: string;
  children: React.ReactNode;
};

const OfferSection: React.FC<OfferSectionProps> = ({ title, children }) => {
  return (
    <section className="border-b border-slate-200 px-8 py-9 md:px-12">
      <SectionTitle title={title} />

      <div className="mt-6 whitespace-pre-wrap text-sm font-medium leading-9 text-slate-700">
        {children}
      </div>
    </section>
  );
};

type SectionTitleProps = {
  title: string;
};

const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return (
    <div>
      <h2 className="text-2xl font-black leading-relaxed tracking-tight text-slate-950">
        {title}
      </h2>

      <div className="mt-2 h-1 w-12 rounded-full bg-emerald-700" />
    </div>
  );
};

type PlainTextBlockProps = {
  title: string;
  text: string;
};

const PlainTextBlock: React.FC<PlainTextBlockProps> = ({ title, text }) => {
  return (
    <div>
      <SectionTitle title={title} />

      <p className="mt-6 whitespace-pre-wrap text-sm font-medium leading-9 text-slate-700">
        {text}
      </p>
    </div>
  );
};

type OfferListProps = {
  lines: string[];
  emptyText: string;
};

const OfferList: React.FC<OfferListProps> = ({ lines, emptyText }) => {
  if (!lines.length) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="border-t border-slate-200">
      {lines.map((line, index) => (
        <li
          key={`${line}-${index}`}
          className="relative border-b border-slate-200 py-4 text-sm font-medium leading-9 text-slate-700"
        >
          <span className="absolute top-8 h-1.5 w-1.5 rounded-full bg-emerald-700 ltr:left-0 rtl:right-0" />
          <span className="block ltr:pl-6 rtl:pr-6">{line}</span>
        </li>
      ))}
    </ul>
  );
};

export default TechnicalOfferPage;
