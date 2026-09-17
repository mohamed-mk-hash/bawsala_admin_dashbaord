import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Link, useNavigate, useParams } from "react-router-dom";

import { db } from "../../firebase";
import { Card } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

type Lang = "en" | "ar";
type ServiceStatus = "draft" | "published" | "archived";
type ServiceType =
  | "general"
  | "social-media-management"
  | "administrative-development"
  | "training-packages"
  | "website-design-management";

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

interface LocalizedPair {
  en: {
    title: string;
    description: string;
  };
  ar: {
    title: string;
    description: string;
  };
}

interface ImageLocalizedPair extends LocalizedPair {
  imageFile: File | null;
  imageUrl: string;
  imagePublicId: string;
}

interface BenefitItem extends LocalizedPair {
  iconFile: File | null;
  iconUrl: string;
  iconPublicId: string;
}

interface ProcessStepItem {
  en: {
    label: string;
    title: string;
    description: string;
  };
  ar: {
    label: string;
    title: string;
    description: string;
  };
}

interface PricingPlanItem {
  en: {
    title: string;
    price: string;
    description: string;
    features: string;
  };
  ar: {
    title: string;
    price: string;
    description: string;
    features: string;
  };
}

interface ResourceItem {
  imageFile: File | null;
  imageUrl: string;
  imagePublicId: string;
  en: {
    type: string;
    date: string;
    title: string;
    description: string;
    fileType: string;
    buttonText: string;
  };
  ar: {
    type: string;
    date: string;
    title: string;
    description: string;
    fileType: string;
    buttonText: string;
  };
}

interface FaqItem {
  en: {
    question: string;
    answer: string;
  };
  ar: {
    question: string;
    answer: string;
  };
}

interface LocalizedServiceContent {
  breadcrumbTitle: string;

  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroButtonText: string;

  overviewLabel: string;
  overviewTitle: string;
  overviewDescription: string;

  benefitsTitle: string;
  benefitsDescription: string;

  deliverablesTitle: string;
  deliverablesDescription: string;

  processTitle: string;
  processDescription: string;

  pricingTitle: string;
  pricingDescription: string;

  resourcesTitle: string;
  resourcesDescription: string;

  faqsTitle: string;
  faqsDescription: string;

  requestLabel: string;
  requestTitle: string;
  requestDescription: string;
  requestButtonText: string;

  seoTitle: string;
  seoDescription: string;
}

interface EditServiceFormState {
  slug: string;
  status: ServiceStatus;
  serviceType: ServiceType;
  showPricing: boolean;
  showResources: boolean;
  showFaqs: boolean;

  heroBackgroundFile: File | null;
  heroBackgroundUrl: string;
  heroBackgroundPublicId: string;

  overviewImageFile: File | null;
  overviewImageUrl: string;
  overviewImagePublicId: string;

  requestImageFile: File | null;
  requestImageUrl: string;
  requestImagePublicId: string;

  benefits: BenefitItem[];
  deliverables: ImageLocalizedPair[];
  processSteps: ProcessStepItem[];
  pricingPlans: PricingPlanItem[];
  resources: ResourceItem[];
  faqs: FaqItem[];

  en: LocalizedServiceContent;
  ar: LocalizedServiceContent;
}

const emptyLocalizedPair = (): LocalizedPair => ({
  en: { title: "", description: "" },
  ar: { title: "", description: "" },
});

const initialForm: EditServiceFormState = {
  slug: "",
  status: "draft",
  serviceType: "general",
  showPricing: true,
  showResources: true,
  showFaqs: true,

  heroBackgroundFile: null,
  heroBackgroundUrl: "",
  heroBackgroundPublicId: "",

  overviewImageFile: null,
  overviewImageUrl: "",
  overviewImagePublicId: "",

  requestImageFile: null,
  requestImageUrl: "",
  requestImagePublicId: "",

  benefits: [
    {
      iconFile: null,
      iconUrl: "",
      iconPublicId: "",
      en: {
        title: "Clear service planning",
        description: "We define the scope, objectives, deliverables, and priorities before execution starts.",
      },
      ar: {
        title: "تخطيط واضح للخدمة",
        description: "نحدد النطاق، الأهداف، المخرجات، والأولويات قبل بداية التنفيذ.",
      },
    },
    {
      iconFile: null,
      iconUrl: "",
      iconPublicId: "",
      en: {
        title: "Professional execution",
        description: "Your service is handled through organized steps and practical implementation.",
      },
      ar: {
        title: "تنفيذ احترافي",
        description: "يتم تنفيذ الخدمة وفق خطوات منظمة وتطبيق عملي واضح.",
      },
    },
    {
      iconFile: null,
      iconUrl: "",
      iconPublicId: "",
      en: {
        title: "Flexible deliverables",
        description: "The final outputs are adapted to your organization, audience, and project goals.",
      },
      ar: {
        title: "مخرجات مرنة",
        description: "يتم تكييف المخرجات حسب مؤسستك، جمهورك، وأهداف المشروع.",
      },
    },
  ],

  deliverables: [
    {
      imageFile: null,
      imageUrl: "",
      imagePublicId: "",
      en: {
        title: "Main service deliverable",
        description: "A clear output that the client receives at the end of the service.",
      },
      ar: {
        title: "المخرج الرئيسي للخدمة",
        description: "مخرج واضح يحصل عليه العميل عند نهاية تنفيذ الخدمة.",
      },
    },
  ],

  processSteps: [
    {
      en: {
        label: "Step 01",
        title: "Understand the need",
        description: "We collect the required information and understand the goals of the project.",
      },
      ar: {
        label: "الخطوة 01",
        title: "فهم الاحتياج",
        description: "نجمع المعلومات المطلوبة ونفهم أهداف المشروع بدقة.",
      },
    },
    {
      en: {
        label: "Step 02",
        title: "Plan the solution",
        description: "We prepare the structure, priorities, timeline, and expected deliverables.",
      },
      ar: {
        label: "الخطوة 02",
        title: "تخطيط الحل",
        description: "نجهز الهيكلة، الأولويات، الجدول الزمني، والمخرجات المتوقعة.",
      },
    },
    {
      en: {
        label: "Step 03",
        title: "Execute and deliver",
        description: "We implement the service and deliver the final outputs with follow-up when needed.",
      },
      ar: {
        label: "الخطوة 03",
        title: "التنفيذ والتسليم",
        description: "ننفذ الخدمة ونسلم المخرجات النهائية مع المتابعة عند الحاجة.",
      },
    },
  ],

  pricingPlans: [
    {
      en: {
        title: "Basic",
        price: "Starting from 70,000 DZD",
        description: "For small and clear service requests.",
        features: "Initial diagnosis\nBasic planning\nLimited deliverables\nStandard delivery",
      },
      ar: {
        title: "أساسي",
        price: "ابتداءً من 70,000 دج",
        description: "مناسب للطلبات الصغيرة والواضحة.",
        features: "تشخيص أولي\nتخطيط بسيط\nمخرجات محدودة\nتسليم عادي",
      },
    },
    {
      en: {
        title: "Professional",
        price: "Custom quote",
        description: "For businesses that need more complete execution and follow-up.",
        features: "Detailed planning\nMultiple deliverables\nRevision rounds\nFollow-up support",
      },
      ar: {
        title: "احترافي",
        price: "عرض سعر مخصص",
        description: "مناسب للمؤسسات التي تحتاج تنفيذًا أكثر اكتمالًا ومتابعة أفضل.",
        features: "تخطيط مفصل\nمخرجات متعددة\nجولات تعديل\nدعم ومتابعة",
      },
    },
  ],

  resources: [
    {
      imageFile: null,
      imageUrl: "",
      imagePublicId: "",
      en: {
        type: "Guide",
        date: "Available on request",
        title: "Service planning guide",
        description: "A practical resource that helps the client understand the service requirements before starting.",
        fileType: "File Type: PDF / DOC",
        buttonText: "Download resource",
      },
      ar: {
        type: "دليل",
        date: "متاح عند الطلب",
        title: "دليل تخطيط الخدمة",
        description: "مورد عملي يساعد العميل على فهم متطلبات الخدمة قبل البدء.",
        fileType: "نوع الملف: PDF / DOC",
        buttonText: "تحميل المورد",
      },
    },
  ],

  faqs: [
    {
      en: {
        question: "How is the price calculated?",
        answer: "Pricing depends on the scope, complexity, deliverables, delivery speed, and level of customization required.",
      },
      ar: {
        question: "كيف يتم حساب السعر؟",
        answer: "يتم تحديد السعر حسب نطاق العمل، درجة التعقيد، المخرجات، سرعة التسليم، ومستوى التخصيص المطلوب.",
      },
    },
    {
      en: {
        question: "How do I request this service?",
        answer: "Send your request through the form, and our team will contact you to understand your needs.",
      },
      ar: {
        question: "كيف أطلب هذه الخدمة؟",
        answer: "أرسل طلبك عبر النموذج، وسيتواصل معك فريقنا لفهم احتياجاتك.",
      },
    },
  ],

  en: {
    breadcrumbTitle: "Service",
    heroEyebrow: "Professional service",
    heroTitle: "Service Title",
    heroDescription: "Describe the service clearly and explain the value it gives to the client.",
    heroButtonText: "Request this service",

    overviewLabel: "Service overview",
    overviewTitle: "A flexible solution built around your needs",
    overviewDescription: "This section explains the service in more detail, who it is for, and what type of results the client can expect.",

    benefitsTitle: "What you will get",
    benefitsDescription: "Main advantages and practical value of the service.",

    deliverablesTitle: "Service deliverables",
    deliverablesDescription: "Clear outputs that can be adapted depending on the service type and client needs.",

    processTitle: "How we work",
    processDescription: "A simple process that helps the client understand how the service is delivered.",

    pricingTitle: "Packages and pricing",
    pricingDescription: "Pricing depends on the project scope, complexity, timeline, and required deliverables.",

    resourcesTitle: "Resources and files",
    resourcesDescription: "Helpful files, guides, templates, or checklists related to this service.",

    faqsTitle: "Frequently asked questions",
    faqsDescription: "Answers to common questions before requesting the service.",

    requestLabel: "Service request",
    requestTitle: "Request a consultation",
    requestDescription: "Tell us about your needs and our team will contact you with the most suitable solution.",
    requestButtonText: "Send Request",

    seoTitle: "",
    seoDescription: "",
  },

  ar: {
    breadcrumbTitle: "الخدمة",
    heroEyebrow: "خدمة احترافية",
    heroTitle: "عنوان الخدمة",
    heroDescription: "اكتب وصفًا واضحًا للخدمة واشرح القيمة التي تقدمها للعميل.",
    heroButtonText: "اطلب هذه الخدمة",

    overviewLabel: "نظرة عامة على الخدمة",
    overviewTitle: "حل مرن مبني حول احتياجاتك",
    overviewDescription: "هذا القسم يشرح الخدمة بتفصيل أكبر، لمن تناسب، وما نوع النتائج التي يمكن أن يتوقعها العميل.",

    benefitsTitle: "ما الذي ستحصل عليه",
    benefitsDescription: "أهم المزايا والقيمة العملية التي تقدمها الخدمة.",

    deliverablesTitle: "مخرجات الخدمة",
    deliverablesDescription: "مخرجات واضحة يمكن تكييفها حسب نوع الخدمة واحتياجات العميل.",

    processTitle: "كيف نعمل",
    processDescription: "مسار بسيط يساعد العميل على فهم طريقة تنفيذ الخدمة وتسليمها.",

    pricingTitle: "الباقات والأسعار",
    pricingDescription: "يتم تحديد السعر حسب نطاق المشروع، درجة التعقيد، مدة التنفيذ، والمخرجات المطلوبة.",

    resourcesTitle: "الموارد والملفات",
    resourcesDescription: "ملفات، أدلة، قوالب، أو قوائم تحقق مرتبطة بهذه الخدمة.",

    faqsTitle: "الأسئلة الشائعة",
    faqsDescription: "إجابات عن الأسئلة المتكررة قبل طلب الخدمة.",

    requestLabel: "طلب خدمة",
    requestTitle: "طلب استشارة",
    requestDescription: "أخبرنا باحتياجاتك وسيتواصل معك فريقنا باقتراح الحل الأنسب.",
    requestButtonText: "إرسال الطلب",

    seoTitle: "",
    seoDescription: "",
  },
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

const compressImageToLimit = async (
  file: File,
  {
    maxSizeBytes = 10 * 1024 * 1024,
    maxWidth = 1800,
    maxHeight = 1800,
    initialQuality = 0.84,
    minQuality = 0.48,
    outputType = "image/jpeg",
  } = {}
): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxSizeBytes) return file;

  const readAsDataUrl = (inputFile: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(inputFile);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const targetWidth = Math.round(image.width * ratio);
  const targetHeight = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return file;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const toBlob = (quality: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), outputType, quality);
    });

  let quality = initialQuality;
  let blob = await toBlob(quality);

  if (!blob) return file;

  while (blob.size > maxSizeBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.08);
    blob = await toBlob(quality);

    if (!blob) return file;
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  return new File([blob], `${baseName}.jpg`, {
    type: outputType,
    lastModified: Date.now(),
  });
};

const uploadImageToCloudinary = async (
  file: File
): Promise<CloudinaryUploadResult> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Missing Cloudinary env variables: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const processedFile = await compressImageToLimit(file);
  const body = new FormData();
  body.append("file", processedFile);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed.");
  }

  return {
    url: data.secure_url || "",
    publicId: data.public_id || "",
  };
};

const optionalUpload = async (file: File | null) => {
  if (!file) return null;
  return uploadImageToCloudinary(file);
};

const splitFeatures = (features: string) =>
  features
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const cloneInitialForm = (): EditServiceFormState => ({
  ...initialForm,
  en: { ...initialForm.en },
  ar: { ...initialForm.ar },
  benefits: initialForm.benefits.map((item) => ({
    iconFile: null,
    iconUrl: item.iconUrl || "",
    iconPublicId: item.iconPublicId || "",
    en: { ...item.en },
    ar: { ...item.ar },
  })),
  deliverables: initialForm.deliverables.map((item) => ({
    imageFile: null,
    imageUrl: item.imageUrl || "",
    imagePublicId: item.imagePublicId || "",
    en: { ...item.en },
    ar: { ...item.ar },
  })),
  processSteps: initialForm.processSteps.map((item) => ({
    en: { ...item.en },
    ar: { ...item.ar },
  })),
  pricingPlans: initialForm.pricingPlans.map((item) => ({
    en: { ...item.en },
    ar: { ...item.ar },
  })),
  resources: initialForm.resources.map((item) => ({
    imageFile: null,
    imageUrl: item.imageUrl || "",
    imagePublicId: item.imagePublicId || "",
    en: { ...item.en },
    ar: { ...item.ar },
  })),
  faqs: initialForm.faqs.map((item) => ({
    en: { ...item.en },
    ar: { ...item.ar },
  })),
});


const normalizeLocalizedContent = (content?: Partial<LocalizedServiceContent> & Record<string, unknown>): LocalizedServiceContent => ({
  breadcrumbTitle: content?.breadcrumbTitle || "",

  heroEyebrow: content?.heroEyebrow || "",
  heroTitle: content?.heroTitle || "",
  heroDescription: content?.heroDescription || "",
  heroButtonText: content?.heroButtonText || "",

  overviewLabel: content?.overviewLabel || "",
  overviewTitle: content?.overviewTitle || "",
  overviewDescription: content?.overviewDescription || "",

  benefitsTitle: content?.benefitsTitle || "",
  benefitsDescription: content?.benefitsDescription || "",

  deliverablesTitle: content?.deliverablesTitle || (content as Record<string, string | undefined>)?.templatesTitle || "",
  deliverablesDescription:
    content?.deliverablesDescription || (content as Record<string, string | undefined>)?.templatesDescription || "",

  processTitle: content?.processTitle || "",
  processDescription: content?.processDescription || "",

  pricingTitle: content?.pricingTitle || "",
  pricingDescription: content?.pricingDescription || "",

  resourcesTitle: content?.resourcesTitle || (content as Record<string, string | undefined>)?.guidesTitle || "",
  resourcesDescription:
    content?.resourcesDescription || (content as Record<string, string | undefined>)?.guidesDescription || "",

  faqsTitle: content?.faqsTitle || "",
  faqsDescription: content?.faqsDescription || "",

  requestLabel: content?.requestLabel || "",
  requestTitle: content?.requestTitle || "",
  requestDescription: content?.requestDescription || "",
  requestButtonText: content?.requestButtonText || "",

  seoTitle: content?.seoTitle || "",
  seoDescription: content?.seoDescription || "",
});

const normalizeLocalizedPair = (item: any): LocalizedPair => ({
  en: {
    title: item?.en?.title || "",
    description: item?.en?.description || "",
  },
  ar: {
    title: item?.ar?.title || "",
    description: item?.ar?.description || "",
  },
});

const normalizeBenefit = (item: any): BenefitItem => ({
  iconFile: null,
  iconUrl: item?.iconUrl || "",
  iconPublicId: item?.iconPublicId || "",
  ...normalizeLocalizedPair(item),
});

const normalizeImageLocalizedPair = (item: any): ImageLocalizedPair => ({
  imageFile: null,
  imageUrl: item?.imageUrl || "",
  imagePublicId: item?.imagePublicId || "",
  ...normalizeLocalizedPair(item),
});

const normalizeProcessStep = (item: any): ProcessStepItem => ({
  en: {
    label: item?.en?.label || "",
    title: item?.en?.title || "",
    description: item?.en?.description || "",
  },
  ar: {
    label: item?.ar?.label || "",
    title: item?.ar?.title || "",
    description: item?.ar?.description || "",
  },
});

const normalizeFeatures = (features: unknown) => {
  if (Array.isArray(features)) return features.map(String).join("\n");
  if (typeof features === "string") return features;
  return "";
};

const normalizePricingPlan = (item: any): PricingPlanItem => ({
  en: {
    title: item?.en?.title || "",
    price: item?.en?.price || "",
    description: item?.en?.description || "",
    features: normalizeFeatures(item?.en?.features),
  },
  ar: {
    title: item?.ar?.title || "",
    price: item?.ar?.price || "",
    description: item?.ar?.description || "",
    features: normalizeFeatures(item?.ar?.features),
  },
});

const normalizeResource = (item: any): ResourceItem => ({
  imageFile: null,
  imageUrl: item?.imageUrl || "",
  imagePublicId: item?.imagePublicId || "",
  en: {
    type: item?.en?.type || "",
    date: item?.en?.date || "",
    title: item?.en?.title || "",
    description: item?.en?.description || "",
    fileType: item?.en?.fileType || "",
    buttonText: item?.en?.buttonText || "",
  },
  ar: {
    type: item?.ar?.type || "",
    date: item?.ar?.date || "",
    title: item?.ar?.title || "",
    description: item?.ar?.description || "",
    fileType: item?.ar?.fileType || "",
    buttonText: item?.ar?.buttonText || "",
  },
});

const normalizeFaq = (item: any): FaqItem => ({
  en: {
    question: item?.en?.question || "",
    answer: item?.en?.answer || "",
  },
  ar: {
    question: item?.ar?.question || "",
    answer: item?.ar?.answer || "",
  },
});


export default function EditService() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<EditServiceFormState>(cloneInitialForm);
  const [editorLang, setEditorLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentContent = form[editorLang];
  const heroPreview = usePreview(form.heroBackgroundFile, form.heroBackgroundUrl);
  const overviewPreview = usePreview(form.overviewImageFile, form.overviewImageUrl);
  const requestPreview = usePreview(form.requestImageFile, form.requestImageUrl);

  useEffect(() => {
    const loadService = async () => {
      if (!id) {
        setErrorMessage(isArabic ? "لم يتم العثور على معرف الخدمة." : "Service ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const serviceRef = doc(db, "services", id);
        const serviceSnapshot = await getDoc(serviceRef);

        if (!serviceSnapshot.exists()) {
          setErrorMessage(isArabic ? "هذه الخدمة غير موجودة." : "This service does not exist.");
          setLoading(false);
          return;
        }

        const data = serviceSnapshot.data();

        const loadedResources = Array.isArray(data.resources)
          ? data.resources
          : Array.isArray(data.guides)
          ? data.guides
          : [];

        const loadedDeliverables = Array.isArray(data.deliverables)
          ? data.deliverables
          : Array.isArray(data.templates)
          ? data.templates
          : [];

        setForm({
          slug: data.slug || "",
          status: data.status || "draft",
          serviceType: data.serviceType || "general",
          showPricing: typeof data.showPricing === "boolean" ? data.showPricing : true,
          showResources: typeof data.showResources === "boolean" ? data.showResources : true,
          showFaqs: typeof data.showFaqs === "boolean" ? data.showFaqs : true,

          heroBackgroundFile: null,
          heroBackgroundUrl: data.heroBackgroundUrl || "",
          heroBackgroundPublicId: data.heroBackgroundPublicId || "",

          overviewImageFile: null,
          overviewImageUrl: data.overviewImageUrl || "",
          overviewImagePublicId: data.overviewImagePublicId || "",

          requestImageFile: null,
          requestImageUrl: data.requestImageUrl || "",
          requestImagePublicId: data.requestImagePublicId || "",

          benefits: Array.isArray(data.benefits) ? data.benefits.map(normalizeBenefit) : [],
          deliverables: loadedDeliverables.map(normalizeImageLocalizedPair),
          processSteps: Array.isArray(data.processSteps) ? data.processSteps.map(normalizeProcessStep) : [],
          pricingPlans: Array.isArray(data.pricingPlans) ? data.pricingPlans.map(normalizePricingPlan) : [],
          resources: loadedResources.map(normalizeResource),
          faqs: Array.isArray(data.faqs) ? data.faqs.map(normalizeFaq) : [],

          en: normalizeLocalizedContent(data.en),
          ar: normalizeLocalizedContent(data.ar),
        });
      } catch (error) {
        console.error(error);
        setErrorMessage(isArabic ? "حدث خطأ أثناء تحميل الخدمة." : "Something went wrong while loading the service.");
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [id, isArabic]);

  const updateRoot = <K extends keyof EditServiceFormState>(
    key: K,
    value: EditServiceFormState[K]
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const updateLocalized = (key: keyof LocalizedServiceContent, value: string) => {
    setForm((previous) => ({
      ...previous,
      [editorLang]: {
        ...previous[editorLang],
        [key]: value,
      },
    }));
  };

  const generateSlug = () => {
    const source = form.en.heroTitle || form.ar.heroTitle;
    setForm((previous) => ({ ...previous, slug: createSlug(source) }));
  };

  const applyPreset = (serviceType: ServiceType) => {
    updateRoot("serviceType", serviceType);

    const presets: Record<ServiceType, Partial<EditServiceFormState>> = {
      general: {},
      "social-media-management": {
        slug: "social-media-management",
        en: {
          ...form.en,
          breadcrumbTitle: "Social Media Management",
          heroEyebrow: "Digital presence service",
          heroTitle: "Social Media Management",
          heroDescription:
            "We plan, create, publish, and monitor social media content to help your brand communicate consistently and professionally.",
          overviewTitle: "Consistent content and stronger online presence",
          overviewDescription:
            "This service helps businesses organize their social media communication through content planning, creative design, copywriting, scheduling, and performance follow-up.",
          deliverablesTitle: "What we can manage",
          resourcesTitle: "Content planning resources",
          requestTitle: "Request Social Media Management",
          seoTitle: "Social Media Management Services",
          seoDescription:
            "Professional social media management service including content planning, design, publishing, and performance reporting.",
        },
        ar: {
          ...form.ar,
          breadcrumbTitle: "إدارة مواقع التواصل الاجتماعي",
          heroEyebrow: "خدمة حضور رقمي",
          heroTitle: "إدارة مواقع التواصل الاجتماعي",
          heroDescription:
            "نخطط ونصمم وننشر ونتابع محتوى مواقع التواصل الاجتماعي لمساعدة علامتك على التواصل باحترافية واستمرارية.",
          overviewTitle: "محتوى منظم وحضور رقمي أقوى",
          overviewDescription:
            "تساعد هذه الخدمة المؤسسات على تنظيم تواصلها عبر مواقع التواصل من خلال تخطيط المحتوى، التصميم، كتابة النصوص، الجدولة، ومتابعة الأداء.",
          deliverablesTitle: "ما الذي يمكننا إدارته",
          resourcesTitle: "موارد تخطيط المحتوى",
          requestTitle: "طلب إدارة مواقع التواصل الاجتماعي",
          seoTitle: "خدمة إدارة مواقع التواصل الاجتماعي",
          seoDescription:
            "خدمة احترافية لإدارة مواقع التواصل تشمل تخطيط المحتوى، التصميم، النشر، وإعداد تقارير الأداء.",
        },
        benefits: [
          {
            iconFile: null,
            iconUrl: "",
            iconPublicId: "",
            en: { title: "Content planning", description: "Monthly planning aligned with your audience, offers, and brand voice." },
            ar: { title: "تخطيط المحتوى", description: "تخطيط شهري متوافق مع جمهورك، عروضك، ونبرة علامتك." },
          },
          {
            iconFile: null,
            iconUrl: "",
            iconPublicId: "",
            en: { title: "Creative posts", description: "Professional visuals and captions for your selected platforms." },
            ar: { title: "منشورات إبداعية", description: "تصاميم ونصوص احترافية للمنصات التي تختارها." },
          },
          {
            iconFile: null,
            iconUrl: "",
            iconPublicId: "",
            en: { title: "Performance follow-up", description: "Regular reporting to understand what works and what needs improvement." },
            ar: { title: "متابعة الأداء", description: "تقارير دورية لفهم النتائج وما يحتاج إلى تحسين." },
          },
        ],
      },
      "administrative-development": {
        slug: "administrative-development",
        en: {
          ...form.en,
          breadcrumbTitle: "Administrative Development",
          heroEyebrow: "Business improvement service",
          heroTitle: "Administrative Development",
          heroDescription:
            "We help organizations improve internal structure, workflows, documentation, and performance tracking.",
          overviewTitle: "Better organization and clearer operations",
          overviewDescription:
            "This service focuses on diagnosing administrative needs and building practical tools that simplify daily work and decision-making.",
          deliverablesTitle: "Administrative outputs",
          requestTitle: "Request Administrative Consultation",
          seoTitle: "Administrative Development Services",
          seoDescription:
            "Administrative development services for improving workflows, organizational structure, documentation, and performance management.",
        },
        ar: {
          ...form.ar,
          breadcrumbTitle: "التطوير الإداري",
          heroEyebrow: "خدمة تحسين الأعمال",
          heroTitle: "التطوير الإداري",
          heroDescription:
            "نساعد المؤسسات على تحسين الهيكلة الداخلية، سير العمل، التوثيق، ومتابعة الأداء.",
          overviewTitle: "تنظيم أفضل وعمليات أوضح",
          overviewDescription:
            "تركز هذه الخدمة على تشخيص الاحتياجات الإدارية وبناء أدوات عملية تسهّل العمل اليومي واتخاذ القرار.",
          deliverablesTitle: "المخرجات الإدارية",
          requestTitle: "طلب استشارة إدارية",
          seoTitle: "خدمة التطوير الإداري",
          seoDescription:
            "خدمات تطوير إداري لتحسين سير العمل، الهيكلة التنظيمية، التوثيق، وإدارة الأداء.",
        },
      },
      "training-packages": {
        slug: "training-packages-preparation",
        en: {
          ...form.en,
          breadcrumbTitle: "Training Packages Preparation",
          heroEyebrow: "Training content service",
          heroTitle: "Training Packages Preparation",
          heroDescription:
            "We prepare structured training packages including trainer guides, trainee materials, presentations, activities, and assessments.",
          overviewTitle: "Training content ready for delivery",
          overviewDescription:
            "This service helps trainers and organizations turn knowledge into organized, practical, and professionally presented training materials.",
          deliverablesTitle: "Training package contents",
          resourcesTitle: "Training resources",
          requestTitle: "Request a Training Package",
          seoTitle: "Training Package Preparation Services",
          seoDescription:
            "Professional preparation of training packages, trainer guides, trainee manuals, presentations, activities, and assessments.",
        },
        ar: {
          ...form.ar,
          breadcrumbTitle: "إعداد الحقائب التدريبية",
          heroEyebrow: "خدمة محتوى تدريبي",
          heroTitle: "إعداد الحقائب التدريبية",
          heroDescription:
            "نعد حقائب تدريبية منظمة تشمل دليل المدرب، مواد المتدرب، العروض، الأنشطة، وأدوات التقييم.",
          overviewTitle: "محتوى تدريبي جاهز للتقديم",
          overviewDescription:
            "تساعد هذه الخدمة المدربين والمؤسسات على تحويل المعرفة إلى مواد تدريبية منظمة، عملية، واحترافية العرض.",
          deliverablesTitle: "محتويات الحقيبة التدريبية",
          resourcesTitle: "موارد تدريبية",
          requestTitle: "طلب إعداد حقيبة تدريبية",
          seoTitle: "خدمة إعداد الحقائب التدريبية",
          seoDescription:
            "إعداد احترافي للحقائب التدريبية، دليل المدرب، دليل المتدرب، العروض، الأنشطة، وأدوات التقييم.",
        },
        deliverables: [
          {
            imageFile: null,
            imageUrl: "",
            imagePublicId: "",
            en: { title: "Trainer guide", description: "A structured guide that helps the trainer deliver the program clearly." },
            ar: { title: "دليل المدرب", description: "دليل منظم يساعد المدرب على تقديم البرنامج بوضوح." },
          },
          {
            imageFile: null,
            imageUrl: "",
            imagePublicId: "",
            en: { title: "Trainee manual", description: "A learner-friendly document with explanations, exercises, and summaries." },
            ar: { title: "دليل المتدرب", description: "وثيقة موجهة للمتدرب تضم الشرح، التمارين، والملخصات." },
          },
          {
            imageFile: null,
            imageUrl: "",
            imagePublicId: "",
            en: { title: "Presentation and activities", description: "Slides, practical activities, and assessment tools." },
            ar: { title: "العرض والأنشطة", description: "شرائح عرض، أنشطة تطبيقية، وأدوات تقييم." },
          },
        ],
      },
      "website-design-management": {
        slug: "website-design-management",
        en: {
          ...form.en,
          breadcrumbTitle: "Website Design & Management",
          heroEyebrow: "Web service",
          heroTitle: "Website Design & Management",
          heroDescription:
            "We design, develop, and manage professional websites that help businesses present their services, attract clients, and grow online.",
          overviewTitle: "A professional website built around your goals",
          overviewDescription:
            "This service can include planning, UI design, development, content structure, forms, integrations, deployment, and ongoing website management.",
          pricingDescription:
            "Website pricing is based on pages, design level, dashboard, database, integrations, security, testing, hosting, and delivery speed.",
          deliverablesTitle: "Website deliverables",
          resourcesTitle: "Website planning resources",
          requestTitle: "Request a Website Consultation",
          seoTitle: "Website Design and Management Services",
          seoDescription:
            "Professional website design, development, and management services for businesses and organizations.",
        },
        ar: {
          ...form.ar,
          breadcrumbTitle: "تصميم وإدارة المواقع",
          heroEyebrow: "خدمة مواقع إلكترونية",
          heroTitle: "تصميم وإدارة المواقع",
          heroDescription:
            "نصمم ونطور وندير مواقع إلكترونية احترافية تساعد المؤسسات على عرض خدماتها، جذب العملاء، وتعزيز حضورها الرقمي.",
          overviewTitle: "موقع احترافي مبني حول أهدافك",
          overviewDescription:
            "يمكن أن تشمل الخدمة التخطيط، تصميم الواجهة، التطوير، تنظيم المحتوى، النماذج، التكاملات، النشر، وإدارة الموقع بعد الإطلاق.",
          pricingDescription:
            "يتم حساب سعر الموقع حسب عدد الصفحات، مستوى التصميم، لوحة التحكم، قاعدة البيانات، التكاملات، الحماية، الاختبار، الاستضافة، وسرعة التسليم.",
          deliverablesTitle: "مخرجات الموقع",
          resourcesTitle: "موارد تخطيط الموقع",
          requestTitle: "طلب استشارة لموقع إلكتروني",
          seoTitle: "خدمة تصميم وإدارة المواقع",
          seoDescription:
            "خدمة احترافية لتصميم، تطوير، وإدارة المواقع الإلكترونية للمؤسسات والشركات.",
        },
        deliverables: [
          {
            imageFile: null,
            imageUrl: "",
            imagePublicId: "",
            en: { title: "Website planning", description: "Pages, structure, user journey, and required features." },
            ar: { title: "تخطيط الموقع", description: "تحديد الصفحات، الهيكلة، رحلة المستخدم، والخصائص المطلوبة." },
          },
          {
            imageFile: null,
            imageUrl: "",
            imagePublicId: "",
            en: { title: "Design and development", description: "Responsive UI design and implementation of the website features." },
            ar: { title: "التصميم والتطوير", description: "تصميم واجهة متجاوبة وتنفيذ خصائص الموقع." },
          },
          {
            imageFile: null,
            imageUrl: "",
            imagePublicId: "",
            en: { title: "Deployment and management", description: "Publishing, basic SEO setup, updates, and ongoing support options." },
            ar: { title: "النشر والإدارة", description: "نشر الموقع، إعداد SEO الأساسي، التحديثات، وخيارات الدعم المستمر." },
          },
        ],
        pricingPlans: [
          {
            en: {
              title: "Basic Website",
              price: "Starting from 70,000 DZD",
              description: "For a simple website with a clear scope.",
              features: "1 to 3 pages\nResponsive design\nContact form\nBasic SEO\nStandard deployment",
            },
            ar: {
              title: "موقع بسيط",
              price: "ابتداءً من 70,000 دج",
              description: "مناسب لموقع بسيط بنطاق واضح.",
              features: "من 1 إلى 3 صفحات\nتصميم متجاوب\nنموذج تواصل\nSEO أساسي\nنشر عادي",
            },
          },
          {
            en: {
              title: "Business Website",
              price: "From 140,000 to 180,000 DZD",
              description: "For a professional business website with more content and management needs.",
              features: "4 to 8 pages\nCustom responsive design\nContent management\nMultiple forms or sections\nTesting and deployment",
            },
            ar: {
              title: "موقع أعمال احترافي",
              price: "من 140,000 إلى 180,000 دج",
              description: "مناسب لموقع أعمال احترافي بمحتوى أكبر واحتياجات إدارة أوضح.",
              features: "من 4 إلى 8 صفحات\nتصميم مخصص ومتجاوب\nإدارة محتوى\nنماذج أو أقسام متعددة\nاختبار ونشر",
            },
          },
          {
            en: {
              title: "Advanced Platform",
              price: "Starting from 300,000 DZD",
              description: "For advanced websites with accounts, dashboards, integrations, or complex features.",
              features: "More than 8 pages\nAdvanced dashboard\nDatabase structure\nIntegrations\nSecurity and scalability",
            },
            ar: {
              title: "منصة أو موقع متقدم",
              price: "ابتداءً من 300,000 دج",
              description: "مناسب للمواقع المتقدمة التي تحتوي على حسابات، لوحة تحكم، تكاملات، أو خصائص معقدة.",
              features: "أكثر من 8 صفحات\nلوحة تحكم متقدمة\nهيكلة قاعدة بيانات\nتكاملات خارجية\nحماية وقابلية توسع",
            },
          },
        ],
      },
    };

    const preset = presets[serviceType];

    setForm((previous) => ({
      ...previous,
      ...preset,
      serviceType,
      heroBackgroundFile: previous.heroBackgroundFile,
      overviewImageFile: previous.overviewImageFile,
      requestImageFile: previous.requestImageFile,
    }));
  };


  const validateForm = () => {
    if (!form.slug.trim()) {
      return isArabic
        ? "يرجى إدخال slug أو توليده من العنوان."
        : "Please enter or generate a slug.";
    }

    if (!form.en.heroTitle.trim() && !form.ar.heroTitle.trim()) {
      return isArabic
        ? "يرجى إدخال عنوان الخدمة."
        : "Please enter the service title.";
    }

    return "";
  };

  const buildLocalizedPayload = (lang: Lang) => {
    const content = form[lang];

    return {
      breadcrumbTitle: content.breadcrumbTitle.trim(),
      heroEyebrow: content.heroEyebrow.trim(),
      heroTitle: content.heroTitle.trim(),
      heroDescription: content.heroDescription.trim(),
      heroButtonText: content.heroButtonText.trim(),
      overviewLabel: content.overviewLabel.trim(),
      overviewTitle: content.overviewTitle.trim(),
      overviewDescription: content.overviewDescription.trim(),
      benefitsTitle: content.benefitsTitle.trim(),
      benefitsDescription: content.benefitsDescription.trim(),
      deliverablesTitle: content.deliverablesTitle.trim(),
      deliverablesDescription: content.deliverablesDescription.trim(),
      processTitle: content.processTitle.trim(),
      processDescription: content.processDescription.trim(),
      pricingTitle: content.pricingTitle.trim(),
      pricingDescription: content.pricingDescription.trim(),
      resourcesTitle: content.resourcesTitle.trim(),
      resourcesDescription: content.resourcesDescription.trim(),
      faqsTitle: content.faqsTitle.trim(),
      faqsDescription: content.faqsDescription.trim(),
      requestLabel: content.requestLabel.trim(),
      requestTitle: content.requestTitle.trim(),
      requestDescription: content.requestDescription.trim(),
      requestButtonText: content.requestButtonText.trim(),
      seoTitle: content.seoTitle.trim(),
      seoDescription: content.seoDescription.trim(),
    };
  };

  const handleUpdateService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) {
      setErrorMessage(isArabic ? "لم يتم العثور على معرف الخدمة." : "Service ID not found.");
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");

    try {
      setSaving(true);

      const validationError = validateForm();
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      const [heroBackground, overviewImage, requestImage] = await Promise.all([
        optionalUpload(form.heroBackgroundFile),
        optionalUpload(form.overviewImageFile),
        optionalUpload(form.requestImageFile),
      ]);

      const benefitsWithImages = await Promise.all(
        form.benefits.map(async (benefit) => {
          const icon = await optionalUpload(benefit.iconFile);
          return {
            iconUrl: icon?.url || benefit.iconUrl || "",
            iconPublicId: icon?.publicId || benefit.iconPublicId || "",
            en: {
              title: benefit.en.title.trim(),
              description: benefit.en.description.trim(),
            },
            ar: {
              title: benefit.ar.title.trim(),
              description: benefit.ar.description.trim(),
            },
          };
        })
      );

      const deliverablesWithImages = await Promise.all(
        form.deliverables.map(async (item) => {
          const image = await optionalUpload(item.imageFile);
          return {
            imageUrl: image?.url || item.imageUrl || "",
            imagePublicId: image?.publicId || item.imagePublicId || "",
            en: {
              title: item.en.title.trim(),
              description: item.en.description.trim(),
            },
            ar: {
              title: item.ar.title.trim(),
              description: item.ar.description.trim(),
            },
          };
        })
      );

      const resourcesWithImages = await Promise.all(
        form.resources.map(async (resource) => {
          const image = await optionalUpload(resource.imageFile);
          return {
            imageUrl: image?.url || resource.imageUrl || "",
            imagePublicId: image?.publicId || resource.imagePublicId || "",
            en: {
              type: resource.en.type.trim(),
              date: resource.en.date.trim(),
              title: resource.en.title.trim(),
              description: resource.en.description.trim(),
              fileType: resource.en.fileType.trim(),
              buttonText: resource.en.buttonText.trim(),
            },
            ar: {
              type: resource.ar.type.trim(),
              date: resource.ar.date.trim(),
              title: resource.ar.title.trim(),
              description: resource.ar.description.trim(),
              fileType: resource.ar.fileType.trim(),
              buttonText: resource.ar.buttonText.trim(),
            },
          };
        })
      );

      const processSteps = form.processSteps.map((step) => ({
        en: {
          label: step.en.label.trim(),
          title: step.en.title.trim(),
          description: step.en.description.trim(),
        },
        ar: {
          label: step.ar.label.trim(),
          title: step.ar.title.trim(),
          description: step.ar.description.trim(),
        },
      }));

      const pricingPlans = form.pricingPlans.map((plan) => ({
        en: {
          title: plan.en.title.trim(),
          price: plan.en.price.trim(),
          description: plan.en.description.trim(),
          features: splitFeatures(plan.en.features),
        },
        ar: {
          title: plan.ar.title.trim(),
          price: plan.ar.price.trim(),
          description: plan.ar.description.trim(),
          features: splitFeatures(plan.ar.features),
        },
      }));

      const faqs = form.faqs.map((faq) => ({
        en: {
          question: faq.en.question.trim(),
          answer: faq.en.answer.trim(),
        },
        ar: {
          question: faq.ar.question.trim(),
          answer: faq.ar.answer.trim(),
        },
      }));

      const payload = {
        page: "serviceDetail",
        schemaVersion: 2,

        slug: form.slug.trim(),
        status: form.status,
        serviceType: form.serviceType,
        showPricing: form.showPricing,
        showResources: form.showResources,
        showFaqs: form.showFaqs,

        heroBackgroundUrl: heroBackground?.url || form.heroBackgroundUrl || "",
        heroBackgroundPublicId: heroBackground?.publicId || form.heroBackgroundPublicId || "",

        overviewImageUrl: overviewImage?.url || form.overviewImageUrl || "",
        overviewImagePublicId: overviewImage?.publicId || form.overviewImagePublicId || "",

        requestImageUrl: requestImage?.url || form.requestImageUrl || "",
        requestImagePublicId: requestImage?.publicId || form.requestImagePublicId || "",

        benefits: benefitsWithImages,
        deliverables: deliverablesWithImages,
        processSteps,
        pricingPlans,
        resources: resourcesWithImages,
        faqs,

        // Backward compatibility with older ServiceDetail code.
        guides: resourcesWithImages,
        templates: deliverablesWithImages,

        en: buildLocalizedPayload("en"),
        ar: buildLocalizedPayload("ar"),

        updatedAt: serverTimestamp(),
        publishedAt: form.status === "published" ? serverTimestamp() : null,
      };

      await updateDoc(doc(db, "services", id), payload);

      setSuccessMessage(isArabic ? "تم تعديل الخدمة بنجاح." : "Service updated successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء تعديل الخدمة."
          : "Something went wrong while updating the service."
      );
    } finally {
      setSaving(false);
      window.setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <Card>
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-gray-600">
              {isArabic ? "جاري تحميل الخدمة..." : "Loading service..."}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (errorMessage && !form.slug) {
    return (
      <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <Card>
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate("/services")}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {isArabic ? "العودة إلى الخدمات" : "Back to services"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isArabic ? "تعديل الخدمة" : "Edit Service"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "عدّل محتوى هذه الخدمة، مخرجاتها، باقاتها، مواردها، والأسئلة الشائعة الخاصة بها."
              : "Update this flexible service content, deliverables, packages, resources, and FAQs."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/services"
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {isArabic ? "العودة إلى الخدمات" : "Back to services"}
          </Link>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold text-blue-600">Firebase Collection</p>
            <p className="mt-1 text-lg font-bold text-blue-700">services</p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <Card>
        <form onSubmit={handleUpdateService} className="space-y-8">
          <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-gray-100 bg-white px-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Flexible Service CMS
                </span>
                <p className="mt-2 text-sm text-gray-500">
                  {isArabic
                    ? "اختر نوع الخدمة ثم عدّل النصوص والمخرجات والباقات حسب الحاجة."
                    : "Choose a service type, then customize the content, deliverables, and packages as needed."}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? isArabic
                    ? "جاري التعديل..."
                    : "Updating..."
                  : isArabic
                  ? "حفظ التعديلات"
                  : "Save Changes"}
              </button>
            </div>
          </div>

          <AdminSection title={isArabic ? "المعلومات الأساسية" : "Basic Info"}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {isArabic ? "نوع الخدمة" : "Service type"}
                </label>
                <select
                  value={form.serviceType}
                  onChange={(event) => applyPreset(event.target.value as ServiceType)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">{isArabic ? "خدمة عامة" : "General service"}</option>
                  <option value="social-media-management">
                    {isArabic ? "إدارة مواقع التواصل الاجتماعي" : "Social media management"}
                  </option>
                  <option value="administrative-development">
                    {isArabic ? "التطوير الإداري" : "Administrative development"}
                  </option>
                  <option value="training-packages">
                    {isArabic ? "إعداد الحقائب التدريبية" : "Training packages"}
                  </option>
                  <option value="website-design-management">
                    {isArabic ? "تصميم وإدارة المواقع" : "Website design & management"}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {isArabic ? "الحالة" : "Status"}
                </label>
                <select
                  value={form.status}
                  onChange={(event) => updateRoot("status", event.target.value as ServiceStatus)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">{isArabic ? "مسودة" : "Draft"}</option>
                  <option value="published">{isArabic ? "منشور" : "Published"}</option>
                  <option value="archived">{isArabic ? "مؤرشف" : "Archived"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
              <AdminInput
                label="Slug"
                placeholder="website-design-management"
                value={form.slug}
                onChange={(value) => updateRoot("slug", value)}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={generateSlug}
                  className="h-[42px] rounded-lg border border-blue-600 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  {isArabic ? "توليد من العنوان" : "Generate from title"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ToggleInput
                label={isArabic ? "إظهار الأسعار" : "Show pricing"}
                checked={form.showPricing}
                onChange={(checked) => updateRoot("showPricing", checked)}
              />
              <ToggleInput
                label={isArabic ? "إظهار الموارد" : "Show resources"}
                checked={form.showResources}
                onChange={(checked) => updateRoot("showResources", checked)}
              />
              <ToggleInput
                label={isArabic ? "إظهار الأسئلة" : "Show FAQs"}
                checked={form.showFaqs}
                onChange={(checked) => updateRoot("showFaqs", checked)}
              />
            </div>
          </AdminSection>

          <AdminSection title={isArabic ? "صور الصفحة" : "Page Images"}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ImagePicker
                label={isArabic ? "خلفية Hero" : "Hero background"}
                previewUrl={heroPreview}
                onChange={(file) => updateRoot("heroBackgroundFile", file || null)}
              />
              <ImagePicker
                label={isArabic ? "صورة النظرة العامة" : "Overview image"}
                previewUrl={overviewPreview}
                onChange={(file) => updateRoot("overviewImageFile", file || null)}
              />
              <ImagePicker
                label={isArabic ? "صورة نموذج الطلب" : "Request section image"}
                previewUrl={requestPreview}
                onChange={(file) => updateRoot("requestImageFile", file || null)}
              />
            </div>
          </AdminSection>

          <AdminSection title={isArabic ? "محتوى الخدمة" : "Service Content"}>
            <LanguageSwitch value={editorLang} onChange={setEditorLang} />

            <div
              className="space-y-6 rounded-xl border border-gray-100 bg-white p-4"
              dir={editorLang === "ar" ? "rtl" : "ltr"}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={editorLang === "ar" ? "عنوان Breadcrumb" : "Breadcrumb title"}
                  value={currentContent.breadcrumbTitle}
                  onChange={(value) => updateLocalized("breadcrumbTitle", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "كلمة فوق العنوان" : "Hero eyebrow"}
                  value={currentContent.heroEyebrow}
                  onChange={(value) => updateLocalized("heroEyebrow", value)}
                />
              </div>

              <AdminInput
                label={editorLang === "ar" ? "عنوان Hero" : "Hero title"}
                value={currentContent.heroTitle}
                onChange={(value) => updateLocalized("heroTitle", value)}
              />

              <AdminTextarea
                label={editorLang === "ar" ? "وصف Hero" : "Hero description"}
                rows={3}
                value={currentContent.heroDescription}
                onChange={(value) => updateLocalized("heroDescription", value)}
              />

              <AdminInput
                label={editorLang === "ar" ? "نص زر Hero" : "Hero button text"}
                value={currentContent.heroButtonText}
                onChange={(value) => updateLocalized("heroButtonText", value)}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={editorLang === "ar" ? "Label النظرة العامة" : "Overview label"}
                  value={currentContent.overviewLabel}
                  onChange={(value) => updateLocalized("overviewLabel", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان النظرة العامة" : "Overview title"}
                  value={currentContent.overviewTitle}
                  onChange={(value) => updateLocalized("overviewTitle", value)}
                />
              </div>

              <AdminTextarea
                label={editorLang === "ar" ? "وصف النظرة العامة" : "Overview description"}
                rows={4}
                value={currentContent.overviewDescription}
                onChange={(value) => updateLocalized("overviewDescription", value)}
              />

              <SectionTitle title={editorLang === "ar" ? "عناوين الأقسام" : "Section titles"} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={editorLang === "ar" ? "عنوان المميزات" : "Benefits title"}
                  value={currentContent.benefitsTitle}
                  onChange={(value) => updateLocalized("benefitsTitle", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان المخرجات" : "Deliverables title"}
                  value={currentContent.deliverablesTitle}
                  onChange={(value) => updateLocalized("deliverablesTitle", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان الخطوات" : "Process title"}
                  value={currentContent.processTitle}
                  onChange={(value) => updateLocalized("processTitle", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان الأسعار" : "Pricing title"}
                  value={currentContent.pricingTitle}
                  onChange={(value) => updateLocalized("pricingTitle", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان الموارد" : "Resources title"}
                  value={currentContent.resourcesTitle}
                  onChange={(value) => updateLocalized("resourcesTitle", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان الأسئلة" : "FAQs title"}
                  value={currentContent.faqsTitle}
                  onChange={(value) => updateLocalized("faqsTitle", value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminTextarea
                  label={editorLang === "ar" ? "وصف المميزات" : "Benefits description"}
                  rows={3}
                  value={currentContent.benefitsDescription}
                  onChange={(value) => updateLocalized("benefitsDescription", value)}
                />
                <AdminTextarea
                  label={editorLang === "ar" ? "وصف المخرجات" : "Deliverables description"}
                  rows={3}
                  value={currentContent.deliverablesDescription}
                  onChange={(value) => updateLocalized("deliverablesDescription", value)}
                />
                <AdminTextarea
                  label={editorLang === "ar" ? "وصف الخطوات" : "Process description"}
                  rows={3}
                  value={currentContent.processDescription}
                  onChange={(value) => updateLocalized("processDescription", value)}
                />
                <AdminTextarea
                  label={editorLang === "ar" ? "وصف الأسعار" : "Pricing description"}
                  rows={3}
                  value={currentContent.pricingDescription}
                  onChange={(value) => updateLocalized("pricingDescription", value)}
                />
                <AdminTextarea
                  label={editorLang === "ar" ? "وصف الموارد" : "Resources description"}
                  rows={3}
                  value={currentContent.resourcesDescription}
                  onChange={(value) => updateLocalized("resourcesDescription", value)}
                />
                <AdminTextarea
                  label={editorLang === "ar" ? "وصف الأسئلة" : "FAQs description"}
                  rows={3}
                  value={currentContent.faqsDescription}
                  onChange={(value) => updateLocalized("faqsDescription", value)}
                />
              </div>

              <SectionTitle title={editorLang === "ar" ? "قسم طلب الخدمة" : "Request section"} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={editorLang === "ar" ? "Label الطلب" : "Request label"}
                  value={currentContent.requestLabel}
                  onChange={(value) => updateLocalized("requestLabel", value)}
                />
                <AdminInput
                  label={editorLang === "ar" ? "عنوان الطلب" : "Request title"}
                  value={currentContent.requestTitle}
                  onChange={(value) => updateLocalized("requestTitle", value)}
                />
              </div>

              <AdminTextarea
                label={editorLang === "ar" ? "وصف الطلب" : "Request description"}
                rows={3}
                value={currentContent.requestDescription}
                onChange={(value) => updateLocalized("requestDescription", value)}
              />

              <AdminInput
                label={editorLang === "ar" ? "زر الطلب" : "Request button text"}
                value={currentContent.requestButtonText}
                onChange={(value) => updateLocalized("requestButtonText", value)}
              />

              <SectionTitle title="SEO" />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label="SEO Title"
                  value={currentContent.seoTitle}
                  onChange={(value) => updateLocalized("seoTitle", value)}
                />
                <AdminInput
                  label="SEO Description"
                  value={currentContent.seoDescription}
                  onChange={(value) => updateLocalized("seoDescription", value)}
                />
              </div>
            </div>
          </AdminSection>

          <AdminSection title={isArabic ? "المميزات" : "Benefits"}>
            <BenefitsRepeater
              lang={editorLang}
              items={form.benefits}
              setForm={setForm}
              addText={editorLang === "ar" ? "إضافة ميزة" : "Add benefit"}
            />
          </AdminSection>

          <AdminSection title={isArabic ? "مخرجات الخدمة" : "Service Deliverables"}>
            <DeliverablesRepeater
              lang={editorLang}
              items={form.deliverables}
              setForm={setForm}
              addText={editorLang === "ar" ? "إضافة مخرج" : "Add deliverable"}
            />
          </AdminSection>

          <AdminSection title={isArabic ? "خطوات العمل" : "Process Steps"}>
            <ProcessRepeater
              lang={editorLang}
              items={form.processSteps}
              setForm={setForm}
              addText={editorLang === "ar" ? "إضافة خطوة" : "Add step"}
            />
          </AdminSection>

          {form.showPricing && (
            <AdminSection title={isArabic ? "الباقات والأسعار" : "Pricing Packages"}>
              <PricingRepeater
                lang={editorLang}
                items={form.pricingPlans}
                setForm={setForm}
                addText={editorLang === "ar" ? "إضافة باقة" : "Add package"}
              />
            </AdminSection>
          )}

          {form.showResources && (
            <AdminSection title={isArabic ? "الموارد والملفات" : "Resources and Files"}>
              <ResourcesRepeater
                lang={editorLang}
                items={form.resources}
                setForm={setForm}
                addText={editorLang === "ar" ? "إضافة مورد" : "Add resource"}
              />
            </AdminSection>
          )}

          {form.showFaqs && (
            <AdminSection title={isArabic ? "الأسئلة الشائعة" : "FAQs"}>
              <FaqRepeater
                lang={editorLang}
                items={form.faqs}
                setForm={setForm}
                addText={editorLang === "ar" ? "إضافة سؤال" : "Add question"}
              />
            </AdminSection>
          )}

          <div className="sticky bottom-0 z-20 -mx-6 -mb-6 border-t border-gray-100 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? isArabic
                  ? "جاري التعديل..."
                  : "Updating..."
                : isArabic
                ? "حفظ التعديلات"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function usePreview(file: File | null, existingUrl = "") {
  const preview = useMemo(() => {
    if (!file) return existingUrl;
    return URL.createObjectURL(file);
  }, [file, existingUrl]);

  useEffect(() => {
    return () => {
      if (file && preview) URL.revokeObjectURL(preview);
    };
  }, [file, preview]);

  return preview;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-t border-gray-100 pt-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h3>
    </div>
  );
}

function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function AdminInput({
  label,
  value,
  type = "text",
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function AdminTextarea({
  label,
  value,
  rows = 4,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm leading-6 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function ToggleInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
    </label>
  );
}

function ImagePicker({
  label,
  previewUrl,
  onChange,
}: {
  label: string;
  previewUrl?: string;
  onChange: (file?: File) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <label className="block text-sm font-bold text-gray-900">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0])}
        className="mt-4 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
      />
      {previewUrl && <img src={previewUrl} alt="" className="mt-4 h-44 w-full rounded-lg object-cover" />}
    </div>
  );
}

function LanguageSwitch({ value, onChange }: { value: Lang; onChange: (value: Lang) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
          value === "en" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onChange("ar")}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
          value === "ar" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        العربية
      </button>
    </div>
  );
}

function RepeaterCard({
  index,
  children,
  onRemove,
}: {
  index: number;
  children: React.ReactNode;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Remove
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function BenefitsRepeater({
  lang,
  items,
  setForm,
  addText,
}: {
  lang: Lang;
  items: BenefitItem[];
  setForm: React.Dispatch<React.SetStateAction<EditServiceFormState>>;
  addText: string;
}) {
  const add = () =>
    setForm((previous) => ({
      ...previous,
      benefits: [
        ...previous.benefits,
        { iconFile: null, iconUrl: "", iconPublicId: "", ...emptyLocalizedPair() },
      ],
    }));

  const remove = (index: number) =>
    setForm((previous) => ({
      ...previous,
      benefits: previous.benefits.filter((_, itemIndex) => itemIndex !== index),
    }));

  const updateText = (index: number, key: keyof BenefitItem[Lang], value: string) =>
    setForm((previous) => ({
      ...previous,
      benefits: previous.benefits.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: { ...item[lang], [key]: value } } : item
      ),
    }));

  const updateFile = (index: number, file?: File) =>
    setForm((previous) => ({
      ...previous,
      benefits: previous.benefits.map((item, itemIndex) =>
        itemIndex === index ? { ...item, iconFile: file || null } : item
      ),
    }));

  return (
    <div>
      <button type="button" onClick={add} className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        + {addText}
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={remove}>
            {item.iconUrl && (
              <img src={item.iconUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
            )}
            <input type="file" accept="image/*" onChange={(event) => updateFile(index, event.target.files?.[0])} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <AdminInput label={lang === "ar" ? "العنوان" : "Title"} value={item[lang].title} onChange={(value) => updateText(index, "title", value)} />
            <AdminTextarea label={lang === "ar" ? "الوصف" : "Description"} rows={3} value={item[lang].description} onChange={(value) => updateText(index, "description", value)} />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function DeliverablesRepeater({
  lang,
  items,
  setForm,
  addText,
}: {
  lang: Lang;
  items: ImageLocalizedPair[];
  setForm: React.Dispatch<React.SetStateAction<EditServiceFormState>>;
  addText: string;
}) {
  const add = () =>
    setForm((previous) => ({
      ...previous,
      deliverables: [
        ...previous.deliverables,
        { imageFile: null, imageUrl: "", imagePublicId: "", ...emptyLocalizedPair() },
      ],
    }));

  const remove = (index: number) =>
    setForm((previous) => ({
      ...previous,
      deliverables: previous.deliverables.filter((_, itemIndex) => itemIndex !== index),
    }));

  const updateText = (index: number, key: keyof ImageLocalizedPair[Lang], value: string) =>
    setForm((previous) => ({
      ...previous,
      deliverables: previous.deliverables.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: { ...item[lang], [key]: value } } : item
      ),
    }));

  const updateFile = (index: number, file?: File) =>
    setForm((previous) => ({
      ...previous,
      deliverables: previous.deliverables.map((item, itemIndex) =>
        itemIndex === index ? { ...item, imageFile: file || null } : item
      ),
    }));

  return (
    <div>
      <button type="button" onClick={add} className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        + {addText}
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={remove}>
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="h-36 w-full rounded-lg object-cover" />
            )}
            <input type="file" accept="image/*" onChange={(event) => updateFile(index, event.target.files?.[0])} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <AdminInput label={lang === "ar" ? "العنوان" : "Title"} value={item[lang].title} onChange={(value) => updateText(index, "title", value)} />
            <AdminTextarea label={lang === "ar" ? "الوصف" : "Description"} rows={3} value={item[lang].description} onChange={(value) => updateText(index, "description", value)} />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function ProcessRepeater({
  lang,
  items,
  setForm,
  addText,
}: {
  lang: Lang;
  items: ProcessStepItem[];
  setForm: React.Dispatch<React.SetStateAction<EditServiceFormState>>;
  addText: string;
}) {
  const add = () =>
    setForm((previous) => ({
      ...previous,
      processSteps: [
        ...previous.processSteps,
        {
          en: { label: `Step ${previous.processSteps.length + 1}`, title: "", description: "" },
          ar: { label: `الخطوة ${previous.processSteps.length + 1}`, title: "", description: "" },
        },
      ],
    }));

  const remove = (index: number) =>
    setForm((previous) => ({
      ...previous,
      processSteps: previous.processSteps.filter((_, itemIndex) => itemIndex !== index),
    }));

  const updateText = (index: number, key: keyof ProcessStepItem[Lang], value: string) =>
    setForm((previous) => ({
      ...previous,
      processSteps: previous.processSteps.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: { ...item[lang], [key]: value } } : item
      ),
    }));

  return (
    <div>
      <button type="button" onClick={add} className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        + {addText}
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={remove}>
            <AdminInput label={lang === "ar" ? "تسمية الخطوة" : "Step label"} value={item[lang].label} onChange={(value) => updateText(index, "label", value)} />
            <AdminInput label={lang === "ar" ? "العنوان" : "Title"} value={item[lang].title} onChange={(value) => updateText(index, "title", value)} />
            <AdminTextarea label={lang === "ar" ? "الوصف" : "Description"} rows={3} value={item[lang].description} onChange={(value) => updateText(index, "description", value)} />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function PricingRepeater({
  lang,
  items,
  setForm,
  addText,
}: {
  lang: Lang;
  items: PricingPlanItem[];
  setForm: React.Dispatch<React.SetStateAction<EditServiceFormState>>;
  addText: string;
}) {
  const add = () =>
    setForm((previous) => ({
      ...previous,
      pricingPlans: [
        ...previous.pricingPlans,
        {
          en: { title: "", price: "", description: "", features: "" },
          ar: { title: "", price: "", description: "", features: "" },
        },
      ],
    }));

  const remove = (index: number) =>
    setForm((previous) => ({
      ...previous,
      pricingPlans: previous.pricingPlans.filter((_, itemIndex) => itemIndex !== index),
    }));

  const updateText = (index: number, key: keyof PricingPlanItem[Lang], value: string) =>
    setForm((previous) => ({
      ...previous,
      pricingPlans: previous.pricingPlans.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: { ...item[lang], [key]: value } } : item
      ),
    }));

  return (
    <div>
      <button type="button" onClick={add} className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        + {addText}
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={remove}>
            <AdminInput label={lang === "ar" ? "اسم الباقة" : "Package name"} value={item[lang].title} onChange={(value) => updateText(index, "title", value)} />
            <AdminInput label={lang === "ar" ? "السعر" : "Price"} value={item[lang].price} onChange={(value) => updateText(index, "price", value)} />
            <AdminTextarea label={lang === "ar" ? "الوصف" : "Description"} rows={3} value={item[lang].description} onChange={(value) => updateText(index, "description", value)} />
            <AdminTextarea label={lang === "ar" ? "المميزات، كل سطر ميزة" : "Features, one per line"} rows={5} value={item[lang].features} onChange={(value) => updateText(index, "features", value)} />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function ResourcesRepeater({
  lang,
  items,
  setForm,
  addText,
}: {
  lang: Lang;
  items: ResourceItem[];
  setForm: React.Dispatch<React.SetStateAction<EditServiceFormState>>;
  addText: string;
}) {
  const add = () =>
    setForm((previous) => ({
      ...previous,
      resources: [
        ...previous.resources,
        {
          imageFile: null,
          imageUrl: "",
          imagePublicId: "",
          en: { type: "", date: "", title: "", description: "", fileType: "", buttonText: "Download" },
          ar: { type: "", date: "", title: "", description: "", fileType: "", buttonText: "تحميل" },
        },
      ],
    }));

  const remove = (index: number) =>
    setForm((previous) => ({
      ...previous,
      resources: previous.resources.filter((_, itemIndex) => itemIndex !== index),
    }));

  const updateText = (index: number, key: keyof ResourceItem[Lang], value: string) =>
    setForm((previous) => ({
      ...previous,
      resources: previous.resources.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: { ...item[lang], [key]: value } } : item
      ),
    }));

  const updateFile = (index: number, file?: File) =>
    setForm((previous) => ({
      ...previous,
      resources: previous.resources.map((item, itemIndex) =>
        itemIndex === index ? { ...item, imageFile: file || null } : item
      ),
    }));

  return (
    <div>
      <button type="button" onClick={add} className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        + {addText}
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={remove}>
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="h-36 w-full rounded-lg object-cover" />
            )}
            <input type="file" accept="image/*" onChange={(event) => updateFile(index, event.target.files?.[0])} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AdminInput label={lang === "ar" ? "نوع المورد" : "Resource type"} value={item[lang].type} onChange={(value) => updateText(index, "type", value)} />
              <AdminInput label={lang === "ar" ? "التاريخ" : "Date"} value={item[lang].date} onChange={(value) => updateText(index, "date", value)} />
            </div>
            <AdminInput label={lang === "ar" ? "العنوان" : "Title"} value={item[lang].title} onChange={(value) => updateText(index, "title", value)} />
            <AdminTextarea label={lang === "ar" ? "الوصف" : "Description"} rows={3} value={item[lang].description} onChange={(value) => updateText(index, "description", value)} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AdminInput label={lang === "ar" ? "نوع الملف" : "File type"} value={item[lang].fileType} onChange={(value) => updateText(index, "fileType", value)} />
              <AdminInput label={lang === "ar" ? "نص الزر" : "Button text"} value={item[lang].buttonText} onChange={(value) => updateText(index, "buttonText", value)} />
            </div>
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function FaqRepeater({
  lang,
  items,
  setForm,
  addText,
}: {
  lang: Lang;
  items: FaqItem[];
  setForm: React.Dispatch<React.SetStateAction<EditServiceFormState>>;
  addText: string;
}) {
  const add = () =>
    setForm((previous) => ({
      ...previous,
      faqs: [...previous.faqs, { en: { question: "", answer: "" }, ar: { question: "", answer: "" } }],
    }));

  const remove = (index: number) =>
    setForm((previous) => ({
      ...previous,
      faqs: previous.faqs.filter((_, itemIndex) => itemIndex !== index),
    }));

  const updateText = (index: number, key: keyof FaqItem[Lang], value: string) =>
    setForm((previous) => ({
      ...previous,
      faqs: previous.faqs.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: { ...item[lang], [key]: value } } : item
      ),
    }));

  return (
    <div>
      <button type="button" onClick={add} className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        + {addText}
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={remove}>
            <AdminInput label={lang === "ar" ? "السؤال" : "Question"} value={item[lang].question} onChange={(value) => updateText(index, "question", value)} />
            <AdminTextarea label={lang === "ar" ? "الإجابة" : "Answer"} rows={4} value={item[lang].answer} onChange={(value) => updateText(index, "answer", value)} />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}
