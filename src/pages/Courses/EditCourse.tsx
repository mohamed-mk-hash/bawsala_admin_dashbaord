import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";
import { Card } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

type Lang = "en" | "ar";
type CourseStatus = "draft" | "published" | "archived";

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

type CloudinaryResourceType = "image" | "video" | "raw";

interface CourseCategoryItem {
  id: string;
  slug: string;
  iconUrl: string;
  iconPublicId: string;
  en: { name: string };
  ar: { name: string };
}

interface LocalizedItem {
  en: string;
  ar: string;
}

interface CourseReviewItem {
  avatarFile: File | null;
  avatarUrl: string;
  avatarPublicId: string;
  rating: number;
  en: {
    name: string;
    role: string;
    text: string;
  };
  ar: {
    name: string;
    role: string;
    text: string;
  };
}

interface ProgrammeModuleItem {
  youtubeUrl: string;
  en: {
    module: string;
    title: string;
    start: string;
    end: string;
  };
  ar: {
    module: string;
    title: string;
    start: string;
    end: string;
  };
}

interface AudienceTagItem {
  color: "green" | "blue" | "purple" | "pink";
  en: string;
  ar: string;
}

interface LocalizedCourseContent {
  title: string;
  subtitle: string;
  cardTitle: string;
  cardShortDescription: string;

  courseTypeLabel: string;
  level: string;
  instructorLabel: string;
  instructorName: string;

  duration: string;
  workload: string;
  priceLabel: string;
  oldPriceLabel: string;

  registerButtonText: string;
  addToCartText: string;
  catalogTitle: string;
  catalogDescription: string;

  dateLabel: string;
  dateValue: string;
  scheduleLabel: string;
  scheduleValue: string;
  formatLabel: string;
  formatValue: string;

  aboutTab: string;
  programmeTab: string;
  instructorTab: string;
  reviewsTab: string;
  reviewsTitle: string;

  aboutText: string;
  learningTitle: string;
  requirementsTitle: string;
  programmeTitle: string;

  instructorSectionTitle: string;
  instructorRole: string;
  instructorBio: string;

  audienceTitle: string;

  relatedTitle: string;
  relatedDescription: string;
  relatedButtonText: string;

  seoTitle: string;
  seoDescription: string;
}

interface EditCourseFormState {
  slug: string;
  status: CourseStatus;
  categoryId: string;

  featuredImageFile: File | null;
  instructorAvatarFile: File | null;
  videoImageFile: File | null;
  explanatoryVideoFile: File | null;
  catalogImageFile: File | null;
  catalogPdfFile: File | null;
  instructorFeaturedFile: File | null;

  featuredImageUrl: string;
  featuredImagePublicId: string;
  instructorAvatarUrl: string;
  instructorAvatarPublicId: string;
  videoImageUrl: string;
  videoImagePublicId: string;
  explanatoryVideoUrl: string;
  explanatoryVideoPublicId: string;
  catalogImageUrl: string;
  catalogImagePublicId: string;
  catalogPdfUrl: string;
  catalogPdfPublicId: string;
  instructorFeaturedUrl: string;
  instructorFeaturedPublicId: string;

  badgeColor: "purple" | "blue" | "pink";

  price: number;
  currency: string;

  learningPoints: LocalizedItem[];
  requirements: LocalizedItem[];
  reviews: CourseReviewItem[];
  programmeModules: ProgrammeModuleItem[];
  audienceTags: AudienceTagItem[];

  en: LocalizedCourseContent;
  ar: LocalizedCourseContent;
}

const COURSES_PATH = "/courses";

const emptyLocalizedContent: LocalizedCourseContent = {
  title: "",
  subtitle: "",
  cardTitle: "",
  cardShortDescription: "",
  courseTypeLabel: "",
  level: "",
  instructorLabel: "",
  instructorName: "",
  duration: "",
  workload: "",
  priceLabel: "",
  oldPriceLabel: "",
  registerButtonText: "",
  addToCartText: "",
  catalogTitle: "",
  catalogDescription: "",
  dateLabel: "",
  dateValue: "",
  scheduleLabel: "",
  scheduleValue: "",
  formatLabel: "",
  formatValue: "",
  aboutTab: "",
  programmeTab: "",
  instructorTab: "",
  reviewsTab: "",
  reviewsTitle: "",
  aboutText: "",
  learningTitle: "",
  requirementsTitle: "",
  programmeTitle: "",
  instructorSectionTitle: "",
  instructorRole: "",
  instructorBio: "",
  audienceTitle: "",
  relatedTitle: "",
  relatedDescription: "",
  relatedButtonText: "",
  seoTitle: "",
  seoDescription: "",
};

const initialForm: EditCourseFormState = {
  slug: "",
  status: "draft",
  categoryId: "",

  featuredImageFile: null,
  instructorAvatarFile: null,
  videoImageFile: null,
  explanatoryVideoFile: null,
  catalogImageFile: null,
  catalogPdfFile: null,
  instructorFeaturedFile: null,

  featuredImageUrl: "",
  featuredImagePublicId: "",
  instructorAvatarUrl: "",
  instructorAvatarPublicId: "",
  videoImageUrl: "",
  videoImagePublicId: "",
  explanatoryVideoUrl: "",
  explanatoryVideoPublicId: "",
  catalogImageUrl: "",
  catalogImagePublicId: "",
  catalogPdfUrl: "",
  catalogPdfPublicId: "",
  instructorFeaturedUrl: "",
  instructorFeaturedPublicId: "",

  badgeColor: "purple",
  price: 0,
  currency: "DZD",

  learningPoints: [],
  requirements: [],
  reviews: [],
  programmeModules: [],
  audienceTags: [],

  en: { ...emptyLocalizedContent },
  ar: { ...emptyLocalizedContent },
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

const formatPrice = (price: number, currency: string) => {
  if (!price) return "Free";
  return `${price.toLocaleString("fr-DZ").replace(/\u202f/g, " ")} ${
    currency === "DZD" ? "DA" : currency
  }`;
};

const MAX_CLOUDINARY_VIDEO_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_CLOUDINARY_RAW_SIZE_BYTES = 10 * 1024 * 1024;

const formatFileSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

const validateFileSize = (
  file: File | null,
  maxSizeBytes: number,
  label: string,
  isArabic: boolean,
) => {
  if (!file || file.size <= maxSizeBytes) return "";

  return isArabic
    ? `${label} كبير جداً. الحجم الحالي ${formatFileSize(file.size)}، والحد الأقصى ${formatFileSize(maxSizeBytes)}. يرجى ضغط الملف أو استعمال رابط خارجي.`
    : `${label} is too large. Current size is ${formatFileSize(file.size)}, maximum is ${formatFileSize(maxSizeBytes)}. Please compress it or use an external link.`;
};

const compressImageToLimit = async (
  file: File,
  {
    maxSizeBytes = 10 * 1024 * 1024,
    maxWidth = 1800,
    maxHeight = 1800,
    initialQuality = 0.84,
    minQuality = 0.48,
    outputType = "image/jpeg",
  } = {},
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

const uploadFileToCloudinary = async (
  file: File,
  resourceType: CloudinaryResourceType,
): Promise<CloudinaryUploadResult> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Missing Cloudinary env variables: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const processedFile =
    resourceType === "image" ? await compressImageToLimit(file) : file;

  const body = new FormData();
  body.append("file", processedFile);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body,
    },
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

const uploadImageToCloudinary = (file: File) =>
  uploadFileToCloudinary(file, "image");

const uploadVideoToCloudinary = (file: File) =>
  uploadFileToCloudinary(file, "video");

const uploadRawToCloudinary = (file: File) =>
  uploadFileToCloudinary(file, "raw");

const optionalUpload = async (file: File | null) => {
  if (!file) return null;
  return uploadImageToCloudinary(file);
};

interface EditCourseProps {
  user?: {
    email?: string | null;
    uid?: string | null;
  } | null;
}

export default function EditCourse({ user }: EditCourseProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<EditCourseFormState>(initialForm);
  const [editorLang, setEditorLang] = useState<Lang>("en");
  const [categories, setCategories] = useState<CourseCategoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentContent = form[editorLang];

  const featuredPreview = usePreview(form.featuredImageFile, form.featuredImageUrl);
  const instructorAvatarPreview = usePreview(
    form.instructorAvatarFile,
    form.instructorAvatarUrl,
  );
  const videoPreview = usePreview(form.videoImageFile, form.videoImageUrl);
  const catalogPreview = usePreview(form.catalogImageFile, form.catalogImageUrl);
  const instructorFeaturedPreview = usePreview(
    form.instructorFeaturedFile,
    form.instructorFeaturedUrl,
  );

  const loadCategories = async () => {
    const categoriesQuery = query(
      collection(db, "courseCategories"),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(categoriesQuery);

    const data = snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<CourseCategoryItem, "id">),
    }));

    setCategories(data);
  };

  const mapCourseToForm = (data: any): EditCourseFormState => {
    const normalizeLocalized = (lang: Lang): LocalizedCourseContent => ({
      ...emptyLocalizedContent,
      ...(data?.[lang] || {}),
    });

    const enContent = normalizeLocalized("en");
    const arContent = normalizeLocalized("ar");

    const learningPointsLength = Math.max(
      data?.en?.learningPoints?.length || 0,
      data?.ar?.learningPoints?.length || 0,
    );

    const requirementsLength = Math.max(
      data?.en?.requirements?.length || 0,
      data?.ar?.requirements?.length || 0,
    );

    const audienceTagsLength = Math.max(
      data?.en?.audienceTags?.length || 0,
      data?.ar?.audienceTags?.length || 0,
    );

    return {
      ...initialForm,
      slug: data?.slug || "",
      status: data?.status || "draft",
      categoryId: data?.categoryId || "",
      badgeColor: data?.badgeColor || "purple",
      price: Number(data?.price || 0),
      currency: data?.currency || "DZD",

      featuredImageUrl: data?.featuredImageUrl || "",
      featuredImagePublicId: data?.featuredImagePublicId || "",
      instructorAvatarUrl: data?.instructorAvatarUrl || "",
      instructorAvatarPublicId: data?.instructorAvatarPublicId || "",
      videoImageUrl: data?.videoImageUrl || "",
      videoImagePublicId: data?.videoImagePublicId || "",
      explanatoryVideoUrl: data?.explanatoryVideoUrl || "",
      explanatoryVideoPublicId: data?.explanatoryVideoPublicId || "",
      catalogImageUrl: data?.catalogImageUrl || "",
      catalogImagePublicId: data?.catalogImagePublicId || "",
      catalogPdfUrl: data?.catalogPdfUrl || "",
      catalogPdfPublicId: data?.catalogPdfPublicId || "",
      instructorFeaturedUrl: data?.instructorFeaturedUrl || "",
      instructorFeaturedPublicId: data?.instructorFeaturedPublicId || "",

      learningPoints: Array.from({ length: learningPointsLength }).map((_, index) => ({
        en: data?.en?.learningPoints?.[index] || "",
        ar: data?.ar?.learningPoints?.[index] || "",
      })),

      requirements: Array.from({ length: requirementsLength }).map((_, index) => ({
        en: data?.en?.requirements?.[index] || "",
        ar: data?.ar?.requirements?.[index] || "",
      })),

      reviews: (data?.reviews || []).map((review: any) => ({
        avatarFile: null,
        avatarUrl: review?.avatarUrl || "",
        avatarPublicId: review?.avatarPublicId || "",
        rating: Number(review?.rating || 4),
        en: {
          name: review?.en?.name || "",
          role: review?.en?.role || "",
          text: review?.en?.text || "",
        },
        ar: {
          name: review?.ar?.name || "",
          role: review?.ar?.role || "",
          text: review?.ar?.text || "",
        },
      })),

      programmeModules: (data?.programmeModules || []).map((item: any) => ({
        youtubeUrl: item?.youtubeUrl || "",
        en: {
          module: item?.en?.module || "",
          title: item?.en?.title || "",
          start: item?.en?.start || "",
          end: item?.en?.end || "",
        },
        ar: {
          module: item?.ar?.module || "",
          title: item?.ar?.title || "",
          start: item?.ar?.start || "",
          end: item?.ar?.end || "",
        },
      })),

      audienceTags: Array.from({ length: audienceTagsLength }).map((_, index) => {
        const enTag = data?.en?.audienceTags?.[index];
        const arTag = data?.ar?.audienceTags?.[index];

        return {
          color: enTag?.color || arTag?.color || "green",
          en: enTag?.label || "",
          ar: arTag?.label || "",
        };
      }),

      en: enContent,
      ar: arContent,
    };
  };

  const loadCourse = async () => {
    if (!id) {
      setErrorMessage(isArabic ? "معرف الكورس غير موجود." : "Course id is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      await loadCategories();

      const courseRef = doc(db, "courses", id);
      const courseSnapshot = await getDoc(courseRef);

      if (!courseSnapshot.exists()) {
        setErrorMessage(isArabic ? "لم يتم العثور على الكورس." : "Course not found.");
        return;
      }

      setForm(mapCourseToForm(courseSnapshot.data()));
    } catch (error) {
      console.error(error);
      setErrorMessage(
        isArabic
          ? "حدث خطأ أثناء تحميل بيانات الكورس."
          : "Something went wrong while loading the course.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateRoot = <K extends keyof EditCourseFormState>(
    key: K,
    value: EditCourseFormState[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateLocalized = (
    key: keyof LocalizedCourseContent,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [editorLang]: {
        ...previous[editorLang],
        [key]: value,
      },
    }));
  };

  const generateSlug = () => {
    const source = form.en.title || form.ar.title;

    setForm((previous) => ({
      ...previous,
      slug: createSlug(source),
    }));
  };

  const syncPriceLabels = () => {
    const formatted = formatPrice(form.price, form.currency);

    setForm((previous) => ({
      ...previous,
      en: {
        ...previous.en,
        priceLabel: formatted,
      },
      ar: {
        ...previous.ar,
        priceLabel:
          form.currency === "DZD"
            ? `${form.price.toLocaleString("fr-DZ").replace(/\u202f/g, " ")} دج`
            : formatted,
      },
    }));
  };

  const updateLearningPoint = (index: number, lang: Lang, value: string) => {
    setForm((previous) => ({
      ...previous,
      learningPoints: previous.learningPoints.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: value } : item,
      ),
    }));
  };

  const addLearningPoint = () => {
    setForm((previous) => ({
      ...previous,
      learningPoints: [...previous.learningPoints, { en: "", ar: "" }],
    }));
  };

  const removeLearningPoint = (index: number) => {
    setForm((previous) => ({
      ...previous,
      learningPoints: previous.learningPoints.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const addRequirement = () => {
    setForm((previous) => ({
      ...previous,
      requirements: [...previous.requirements, { en: "", ar: "" }],
    }));
  };

  const updateRequirement = (index: number, lang: Lang, value: string) => {
    setForm((previous) => ({
      ...previous,
      requirements: previous.requirements.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: value } : item,
      ),
    }));
  };

  const removeRequirement = (index: number) => {
    setForm((previous) => ({
      ...previous,
      requirements: previous.requirements.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const addReview = () => {
    setForm((previous) => ({
      ...previous,
      reviews: [
        ...previous.reviews,
        {
          avatarFile: null,
          avatarUrl: "",
          avatarPublicId: "",
          rating: 4,
          en: { name: "", role: "", text: "" },
          ar: { name: "", role: "", text: "" },
        },
      ],
    }));
  };

  const updateReviewText = (
    index: number,
    lang: Lang,
    key: keyof CourseReviewItem["en"],
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      reviews: previous.reviews.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [lang]: { ...item[lang], [key]: value } }
          : item,
      ),
    }));
  };

  const updateReviewRating = (index: number, value: number) => {
    const safeRating = Math.min(5, Math.max(1, Number(value || 1)));

    setForm((previous) => ({
      ...previous,
      reviews: previous.reviews.map((item, itemIndex) =>
        itemIndex === index ? { ...item, rating: safeRating } : item,
      ),
    }));
  };

  const updateReviewAvatar = (index: number, file?: File) => {
    setForm((previous) => ({
      ...previous,
      reviews: previous.reviews.map((item, itemIndex) =>
        itemIndex === index ? { ...item, avatarFile: file || null } : item,
      ),
    }));
  };

  const removeReview = (index: number) => {
    setForm((previous) => ({
      ...previous,
      reviews: previous.reviews.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addProgrammeModule = () => {
    setForm((previous) => ({
      ...previous,
      programmeModules: [
        ...previous.programmeModules,
        {
          youtubeUrl: "",
          en: { module: "", title: "", start: "", end: "" },
          ar: { module: "", title: "", start: "", end: "" },
        },
      ],
    }));
  };

  const updateProgrammeModule = (
    index: number,
    lang: Lang,
    key: keyof ProgrammeModuleItem["en"],
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      programmeModules: previous.programmeModules.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [lang]: { ...item[lang], [key]: value } }
          : item,
      ),
    }));
  };

  const updateProgrammeModuleYoutubeUrl = (index: number, value: string) => {
    setForm((previous) => ({
      ...previous,
      programmeModules: previous.programmeModules.map((item, itemIndex) =>
        itemIndex === index ? { ...item, youtubeUrl: value } : item,
      ),
    }));
  };

  const removeProgrammeModule = (index: number) => {
    setForm((previous) => ({
      ...previous,
      programmeModules: previous.programmeModules.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const addAudienceTag = () => {
    setForm((previous) => ({
      ...previous,
      audienceTags: [
        ...previous.audienceTags,
        { color: "green", en: "", ar: "" },
      ],
    }));
  };

  const updateAudienceTag = (
    index: number,
    key: "en" | "ar" | "color",
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      audienceTags: previous.audienceTags.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const removeAudienceTag = (index: number) => {
    setForm((previous) => ({
      ...previous,
      audienceTags: previous.audienceTags.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const validateCourse = () => {
    if (!form.slug.trim()) {
      return isArabic
        ? "يرجى إدخال slug أو توليده من العنوان."
        : "Please enter or generate a slug.";
    }

    if (!form.categoryId) {
      return isArabic
        ? "يرجى اختيار تصنيف الكورس."
        : "Please choose a course category.";
    }

    if (!form.en.title.trim() && !form.ar.title.trim()) {
      return isArabic
        ? "يرجى إدخال عنوان الكورس."
        : "Please enter the course title.";
    }

    if (!form.featuredImageFile && !form.featuredImageUrl) {
      return isArabic
        ? "يرجى اختيار صورة الكورس الرئيسية."
        : "Please choose the featured course image.";
    }

    return "";
  };

  const buildLocalizedPayload = (lang: Lang) => {
    const content = form[lang];

    return {
      title: content.title.trim(),
      subtitle: content.subtitle.trim(),
      cardTitle: content.cardTitle.trim(),
      cardShortDescription: content.cardShortDescription.trim(),

      courseTypeLabel: content.courseTypeLabel.trim(),
      level: content.level.trim(),
      instructorLabel: content.instructorLabel.trim(),
      instructorName: content.instructorName.trim(),

      duration: content.duration.trim(),
      workload: content.workload.trim(),
      priceLabel: content.priceLabel.trim(),
      oldPriceLabel: content.oldPriceLabel.trim(),

      registerButtonText: content.registerButtonText.trim(),
      addToCartText: content.addToCartText.trim(),
      catalogTitle: content.catalogTitle.trim(),
      catalogDescription: content.catalogDescription.trim(),

      dateLabel: content.dateLabel.trim(),
      dateValue: content.dateValue.trim(),
      scheduleLabel: content.scheduleLabel.trim(),
      scheduleValue: content.scheduleValue.trim(),
      formatLabel: content.formatLabel.trim(),
      formatValue: content.formatValue.trim(),

      aboutTab: content.aboutTab.trim(),
      programmeTab: content.programmeTab.trim(),
      instructorTab: content.instructorTab.trim(),
      reviewsTab: content.reviewsTab.trim(),
      reviewsTitle: content.reviewsTitle.trim(),

      aboutText: content.aboutText.trim(),
      learningTitle: content.learningTitle.trim(),
      requirementsTitle: content.requirementsTitle.trim(),
      programmeTitle: content.programmeTitle.trim(),

      instructorSectionTitle: content.instructorSectionTitle.trim(),
      instructorRole: content.instructorRole.trim(),
      instructorBio: content.instructorBio.trim(),

      audienceTitle: content.audienceTitle.trim(),

      relatedTitle: content.relatedTitle.trim(),
      relatedDescription: content.relatedDescription.trim(),
      relatedButtonText: content.relatedButtonText.trim(),

      seoTitle: content.seoTitle.trim(),
      seoDescription: content.seoDescription.trim(),

      learningPoints: form.learningPoints
        .map((item) => item[lang].trim())
        .filter(Boolean),

      requirements: form.requirements
        .map((item) => item[lang].trim())
        .filter(Boolean),

      reviews: form.reviews
        .map((item) => ({
          name: item[lang].name.trim(),
          role: item[lang].role.trim(),
          text: item[lang].text.trim(),
          rating: item.rating,
        }))
        .filter((item) => item.name || item.role || item.text),

      audienceTags: form.audienceTags
        .map((item) => ({
          label: item[lang].trim(),
          color: item.color,
        }))
        .filter((item) => item.label),
    };
  };

  const handleUpdateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) return;

    setSuccessMessage("");
    setErrorMessage("");

    try {
      setSaving(true);

      const validationError = validateCourse();
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      const explanatoryVideoSizeError = validateFileSize(
        form.explanatoryVideoFile,
        MAX_CLOUDINARY_VIDEO_SIZE_BYTES,
        isArabic ? "الفيديو التوضيحي" : "Explanatory video",
        isArabic,
      );

      if (explanatoryVideoSizeError) {
        setErrorMessage(explanatoryVideoSizeError);
        return;
      }

      const catalogPdfSizeError = validateFileSize(
        form.catalogPdfFile,
        MAX_CLOUDINARY_RAW_SIZE_BYTES,
        isArabic ? "ملف PDF للكتالوج" : "Catalog PDF file",
        isArabic,
      );

      if (catalogPdfSizeError) {
        setErrorMessage(catalogPdfSizeError);
        return;
      }

      const [
        featuredImage,
        instructorAvatar,
        videoImage,
        explanatoryVideo,
        catalogImage,
        catalogPdf,
        instructorFeatured,
      ] = await Promise.all([
        optionalUpload(form.featuredImageFile),
        optionalUpload(form.instructorAvatarFile),
        optionalUpload(form.videoImageFile),
        form.explanatoryVideoFile
          ? uploadVideoToCloudinary(form.explanatoryVideoFile)
          : null,
        optionalUpload(form.catalogImageFile),
        form.catalogPdfFile ? uploadRawToCloudinary(form.catalogPdfFile) : null,
        optionalUpload(form.instructorFeaturedFile),
      ]);

      const reviewsWithImages = await Promise.all(
        form.reviews.map(async (review) => {
          const avatar = await optionalUpload(review.avatarFile);

          return {
            avatarUrl: avatar?.url || review.avatarUrl || "",
            avatarPublicId: avatar?.publicId || review.avatarPublicId || "",
            rating: review.rating,
            en: {
              name: review.en.name.trim(),
              role: review.en.role.trim(),
              text: review.en.text.trim(),
            },
            ar: {
              name: review.ar.name.trim(),
              role: review.ar.role.trim(),
              text: review.ar.text.trim(),
            },
          };
        }),
      );

      const category = categories.find((item) => item.id === form.categoryId);

      const payload = {
        page: "courseDetail",

        slug: form.slug.trim(),
        status: form.status,

        categoryId: category?.id || "",
        categorySlug: category?.slug || "",
        categoryIconUrl: category?.iconUrl || "",
        categoryIconPublicId: category?.iconPublicId || "",
        categoryName: {
          en: category?.en.name || "",
          ar: category?.ar.name || "",
        },

        badgeColor: form.badgeColor,

        price: Number(form.price || 0),
        priceText:
          form.en.priceLabel.trim() || formatPrice(form.price, form.currency),
        currency: form.currency.trim() || "DZD",
        isFree: Number(form.price || 0) === 0,

        featuredImageUrl: featuredImage?.url || form.featuredImageUrl,
        featuredImagePublicId:
          featuredImage?.publicId || form.featuredImagePublicId,

        instructorAvatarUrl: instructorAvatar?.url || form.instructorAvatarUrl,
        instructorAvatarPublicId:
          instructorAvatar?.publicId || form.instructorAvatarPublicId,

        videoImageUrl: videoImage?.url || form.videoImageUrl,
        videoImagePublicId: videoImage?.publicId || form.videoImagePublicId,

        explanatoryVideoUrl: explanatoryVideo?.url || form.explanatoryVideoUrl,
        explanatoryVideoPublicId:
          explanatoryVideo?.publicId || form.explanatoryVideoPublicId,

        catalogImageUrl: catalogImage?.url || form.catalogImageUrl,
        catalogImagePublicId: catalogImage?.publicId || form.catalogImagePublicId,

        catalogPdfUrl: catalogPdf?.url || form.catalogPdfUrl,
        catalogPdfPublicId: catalogPdf?.publicId || form.catalogPdfPublicId,

        instructorFeaturedUrl:
          instructorFeatured?.url || form.instructorFeaturedUrl,
        instructorFeaturedPublicId:
          instructorFeatured?.publicId || form.instructorFeaturedPublicId,

        reviews: reviewsWithImages,

        programmeModules: form.programmeModules.map((item) => ({
          youtubeUrl: item.youtubeUrl.trim(),
          en: {
            module: item.en.module.trim(),
            title: item.en.title.trim(),
            start: item.en.start.trim(),
            end: item.en.end.trim(),
          },
          ar: {
            module: item.ar.module.trim(),
            title: item.ar.title.trim(),
            start: item.ar.start.trim(),
            end: item.ar.end.trim(),
          },
        })),

        en: buildLocalizedPayload("en"),
        ar: buildLocalizedPayload("ar"),

        updatedAt: serverTimestamp(),
        publishedAt: form.status === "published" ? serverTimestamp() : null,

        updatedBy: {
          email: user?.email || null,
          uid: user?.uid || null,
        },
      };

      await updateDoc(doc(db, "courses", id), payload);

      setSuccessMessage(
        isArabic
          ? "تم تحديث الكورس بنجاح."
          : "Course updated successfully.",
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ أثناء تحديث الكورس."
            : "Something went wrong while updating the course.",
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
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-600">
              {isArabic ? "جاري تحميل بيانات الكورس..." : "Loading course data..."}
            </p>
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
            {isArabic ? "تعديل الكورس" : "Edit Course"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "عدّل بيانات الكورس، الصور، المحتوى، البرنامج، التقييمات، والجمهور المستهدف."
              : "Update the course data, images, content, programme, reviews, and audience tags."}
          </p>
        </div>

        <Link
          to={COURSES_PATH}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          {isArabic ? "رجوع للكورسات" : "Back to Courses"}
        </Link>
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
        <form onSubmit={handleUpdateCourse} className="space-y-8">
          <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-gray-100 bg-white px-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Course Detail CMS
                </span>

                <p className="mt-2 text-sm text-gray-500">
                  {isArabic
                    ? "سيتم تحديث هذا الكورس داخل collection: courses."
                    : "This course will be updated inside the courses collection."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(COURSES_PATH)}
                  className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? isArabic
                      ? "جاري التحديث..."
                      : "Updating..."
                    : isArabic
                      ? "تحديث الكورس"
                      : "Update Course"}
                </button>
              </div>
            </div>
          </div>

          <AdminSection title={isArabic ? "المعلومات الأساسية" : "Basic Info"}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
              <AdminInput
                label="Slug"
                placeholder="digital-marketing-for-startups"
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {isArabic ? "تصنيف الكورس" : "Course Category"}
                </label>

                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    updateRoot("categoryId", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {isArabic ? "اختر التصنيف" : "Choose category"}
                  </option>

                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {isArabic ? category.ar.name : category.en.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {isArabic ? "الحالة" : "Status"}
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateRoot("status", event.target.value as CourseStatus)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">{isArabic ? "مسودة" : "Draft"}</option>
                  <option value="published">
                    {isArabic ? "منشور" : "Published"}
                  </option>
                  <option value="archived">
                    {isArabic ? "مؤرشف" : "Archived"}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Badge Color
                </label>

                <select
                  value={form.badgeColor}
                  onChange={(event) =>
                    updateRoot(
                      "badgeColor",
                      event.target.value as EditCourseFormState["badgeColor"],
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="purple">Purple</option>
                  <option value="blue">Blue</option>
                  <option value="pink">Pink</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <AdminInput
                label={isArabic ? "السعر" : "Price"}
                type="number"
                value={String(form.price)}
                onChange={(value) => updateRoot("price", Number(value || 0))}
              />

              <AdminInput
                label={isArabic ? "العملة" : "Currency"}
                value={form.currency}
                onChange={(value) => updateRoot("currency", value)}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={syncPriceLabels}
                  className="h-[42px] rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {isArabic ? "تعبئة السعر" : "Sync price label"}
                </button>
              </div>
            </div>
          </AdminSection>

          <AdminSection title={isArabic ? "صور الكورس" : "Course Images"}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ImagePicker
                label={isArabic ? "الصورة الرئيسية" : "Featured course image"}
                previewUrl={featuredPreview}
                onChange={(file) =>
                  updateRoot("featuredImageFile", file || null)
                }
              />

              <ImagePicker
                label={isArabic ? "صورة المدرب الصغيرة" : "Instructor avatar"}
                previewUrl={instructorAvatarPreview}
                onChange={(file) =>
                  updateRoot("instructorAvatarFile", file || null)
                }
              />

              <ImagePicker
                label={isArabic ? "صورة الفيديو" : "Video image"}
                previewUrl={videoPreview}
                onChange={(file) => updateRoot("videoImageFile", file || null)}
              />

              <FilePicker
                label={isArabic ? "الفيديو التوضيحي MP4" : "Explanatory MP4 video"}
                accept="video/mp4,video/*"
                currentUrl={form.explanatoryVideoUrl}
                maxSizeBytes={MAX_CLOUDINARY_VIDEO_SIZE_BYTES}
                maxSizeLabel="10MB"
                onChange={(file) => updateRoot("explanatoryVideoFile", file || null)}
              />

              <ImagePicker
                label={isArabic ? "صورة الكتالوج" : "Catalog image"}
                previewUrl={catalogPreview}
                onChange={(file) =>
                  updateRoot("catalogImageFile", file || null)
                }
              />

              <FilePicker
                label={isArabic ? "ملف PDF للكتالوج" : "Catalog PDF file"}
                accept="application/pdf"
                currentUrl={form.catalogPdfUrl}
                maxSizeBytes={MAX_CLOUDINARY_RAW_SIZE_BYTES}
                maxSizeLabel="10MB"
                onChange={(file) => updateRoot("catalogPdfFile", file || null)}
              />

              <AdminInput
                label={isArabic ? "رابط PDF خارجي للكتالوج" : "External catalog PDF URL"}
                value={form.catalogPdfUrl}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                onChange={(value) => updateRoot("catalogPdfUrl", value)}
              />

              <ImagePicker
                label={
                  isArabic ? "صورة المدرب الكبيرة" : "Instructor featured image"
                }
                previewUrl={instructorFeaturedPreview}
                onChange={(file) =>
                  updateRoot("instructorFeaturedFile", file || null)
                }
              />
            </div>
          </AdminSection>

          <AdminSection title={isArabic ? "محتوى الكورس" : "Course Content"}>
            <LanguageSwitch value={editorLang} onChange={setEditorLang} />

            <div
              className="space-y-6 rounded-xl border border-gray-100 bg-white p-4"
              dir={editorLang === "ar" ? "rtl" : "ltr"}
            >
              <AdminInput
                label={editorLang === "ar" ? "عنوان الكورس" : "Course title"}
                value={currentContent.title}
                onChange={(value) => updateLocalized("title", value)}
              />

              <AdminTextarea
                label={editorLang === "ar" ? "وصف الكورس" : "Course subtitle"}
                rows={3}
                value={currentContent.subtitle}
                onChange={(value) => updateLocalized("subtitle", value)}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={editorLang === "ar" ? "عنوان البطاقة" : "Card title"}
                  value={currentContent.cardTitle}
                  onChange={(value) => updateLocalized("cardTitle", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "نوع المحتوى" : "Course type label"
                  }
                  value={currentContent.courseTypeLabel}
                  onChange={(value) =>
                    updateLocalized("courseTypeLabel", value)
                  }
                />

                <AdminInput
                  label={editorLang === "ar" ? "المستوى" : "Level"}
                  value={currentContent.level}
                  onChange={(value) => updateLocalized("level", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "اسم المدرب" : "Instructor name"}
                  value={currentContent.instructorName}
                  onChange={(value) => updateLocalized("instructorName", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "المدة" : "Duration"}
                  value={currentContent.duration}
                  onChange={(value) => updateLocalized("duration", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "الوقت الأسبوعي" : "Workload"}
                  value={currentContent.workload}
                  onChange={(value) => updateLocalized("workload", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "نص السعر" : "Price label"}
                  value={currentContent.priceLabel}
                  onChange={(value) => updateLocalized("priceLabel", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "السعر القديم" : "Old price label"
                  }
                  value={currentContent.oldPriceLabel}
                  onChange={(value) => updateLocalized("oldPriceLabel", value)}
                />
              </div>

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "وصف البطاقة القصير"
                    : "Card short description"
                }
                rows={3}
                value={currentContent.cardShortDescription}
                onChange={(value) =>
                  updateLocalized("cardShortDescription", value)
                }
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <AdminInput
                  label={editorLang === "ar" ? "زر التسجيل" : "Register button"}
                  value={currentContent.registerButtonText}
                  onChange={(value) =>
                    updateLocalized("registerButtonText", value)
                  }
                />

                <AdminInput
                  label={editorLang === "ar" ? "زر السلة" : "Add to cart text"}
                  value={currentContent.addToCartText}
                  onChange={(value) => updateLocalized("addToCartText", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "عنوان الكتالوج" : "Catalog title"
                  }
                  value={currentContent.catalogTitle}
                  onChange={(value) => updateLocalized("catalogTitle", value)}
                />
              </div>

              <AdminInput
                label={
                  editorLang === "ar" ? "وصف الكتالوج" : "Catalog description"
                }
                value={currentContent.catalogDescription}
                onChange={(value) =>
                  updateLocalized("catalogDescription", value)
                }
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <AdminInput
                  label={editorLang === "ar" ? "قيمة التاريخ" : "Date value"}
                  value={currentContent.dateValue}
                  onChange={(value) => updateLocalized("dateValue", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "قيمة الوقت" : "Schedule value"}
                  value={currentContent.scheduleValue}
                  onChange={(value) => updateLocalized("scheduleValue", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "قيمة الصيغة" : "Format value"}
                  value={currentContent.formatValue}
                  onChange={(value) => updateLocalized("formatValue", value)}
                />
              </div>

              <AdminTextarea
                label={editorLang === "ar" ? "نص About" : "About text"}
                rows={5}
                value={currentContent.aboutText}
                onChange={(value) => updateLocalized("aboutText", value)}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <AdminInput
                  label={
                    editorLang === "ar" ? "عنوان التعلم" : "Learning title"
                  }
                  value={currentContent.learningTitle}
                  onChange={(value) => updateLocalized("learningTitle", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar"
                      ? "عنوان المتطلبات"
                      : "Requirements title"
                  }
                  value={currentContent.requirementsTitle}
                  onChange={(value) =>
                    updateLocalized("requirementsTitle", value)
                  }
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "عنوان التقييمات" : "Reviews title"
                  }
                  value={currentContent.reviewsTitle}
                  onChange={(value) => updateLocalized("reviewsTitle", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "عنوان البرنامج" : "Programme title"
                  }
                  value={currentContent.programmeTitle}
                  onChange={(value) => updateLocalized("programmeTitle", value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={
                    editorLang === "ar"
                      ? "عنوان المدرب"
                      : "Instructor section title"
                  }
                  value={currentContent.instructorSectionTitle}
                  onChange={(value) =>
                    updateLocalized("instructorSectionTitle", value)
                  }
                />

                <AdminInput
                  label={editorLang === "ar" ? "دور المدرب" : "Instructor role"}
                  value={currentContent.instructorRole}
                  onChange={(value) => updateLocalized("instructorRole", value)}
                />
              </div>

              <AdminTextarea
                label={editorLang === "ar" ? "نبذة المدرب" : "Instructor bio"}
                rows={4}
                value={currentContent.instructorBio}
                onChange={(value) => updateLocalized("instructorBio", value)}
              />

              <AdminInput
                label={editorLang === "ar" ? "عنوان الجمهور" : "Audience title"}
                value={currentContent.audienceTitle}
                onChange={(value) => updateLocalized("audienceTitle", value)}
              />

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "عنوان الكورسات المقترحة"
                    : "Related title"
                }
                rows={2}
                value={currentContent.relatedTitle}
                onChange={(value) => updateLocalized("relatedTitle", value)}
              />

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "وصف الكورسات المقترحة"
                    : "Related description"
                }
                rows={3}
                value={currentContent.relatedDescription}
                onChange={(value) =>
                  updateLocalized("relatedDescription", value)
                }
              />

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

          <AdminSection title={isArabic ? "قسم المدرب" : "Instructor Section"}>
            <LanguageSwitch value={editorLang} onChange={setEditorLang} />

            <div
              className="space-y-5 rounded-xl border border-gray-100 bg-white p-4"
              dir={editorLang === "ar" ? "rtl" : "ltr"}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <AdminInput
                  label={editorLang === "ar" ? "عنوان القسم" : "Section title"}
                  value={currentContent.instructorSectionTitle}
                  onChange={(value) =>
                    updateLocalized("instructorSectionTitle", value)
                  }
                />

                <AdminInput
                  label={editorLang === "ar" ? "اسم المدرب" : "Instructor name"}
                  value={currentContent.instructorName}
                  onChange={(value) => updateLocalized("instructorName", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "دور المدرب" : "Instructor role"}
                  value={currentContent.instructorRole}
                  onChange={(value) => updateLocalized("instructorRole", value)}
                />
              </div>

              <AdminTextarea
                label={editorLang === "ar" ? "نبذة المدرب" : "Instructor bio"}
                rows={4}
                value={currentContent.instructorBio}
                onChange={(value) => updateLocalized("instructorBio", value)}
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <ImagePicker
                  label={isArabic ? "صورة المدرب الصغيرة" : "Instructor avatar"}
                  previewUrl={instructorAvatarPreview}
                  onChange={(file) =>
                    updateRoot("instructorAvatarFile", file || null)
                  }
                />

                <ImagePicker
                  label={
                    isArabic
                      ? "صورة المدرب الكبيرة"
                      : "Instructor featured image"
                  }
                  previewUrl={instructorFeaturedPreview}
                  onChange={(file) =>
                    updateRoot("instructorFeaturedFile", file || null)
                  }
                />
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title={isArabic ? "ماذا سيتعلم الطالب؟" : "Learning Points"}
          >
            <DynamicTextList
              lang={editorLang}
              items={form.learningPoints}
              onAdd={addLearningPoint}
              onRemove={removeLearningPoint}
              onChange={updateLearningPoint}
              addText={editorLang === "ar" ? "إضافة نقطة" : "Add point"}
              placeholder={
                editorLang === "ar"
                  ? "مثال: بناء خطة عمل احترافية"
                  : "Example: Build a complete professional business plan"
              }
            />
          </AdminSection>

          <AdminSection
            title={isArabic ? "متطلبات الكورس" : "Course Requirements"}
          >
            <DynamicTextList
              lang={editorLang}
              items={form.requirements}
              onAdd={addRequirement}
              onRemove={removeRequirement}
              onChange={updateRequirement}
              addText={editorLang === "ar" ? "إضافة متطلب" : "Add requirement"}
              placeholder={
                editorLang === "ar"
                  ? "مثال: لا توجد خبرة سابقة مطلوبة"
                  : "Example: No previous experience required"
              }
            />
          </AdminSection>

          <AdminSection
            title={isArabic ? "التقييمات والآراء" : "Ratings & Reviews"}
          >
            <LanguageSwitch value={editorLang} onChange={setEditorLang} />

            <ReviewsRepeater
              lang={editorLang}
              items={form.reviews}
              onAdd={addReview}
              onRemove={removeReview}
              onTextChange={updateReviewText}
              onRatingChange={updateReviewRating}
              onFileChange={updateReviewAvatar}
              addText={editorLang === "ar" ? "إضافة تقييم" : "Add review"}
            />
          </AdminSection>

          <AdminSection
            title={isArabic ? "برنامج الكورس" : "Programme Modules"}
          >
            <ProgrammeRepeater
              lang={editorLang}
              items={form.programmeModules}
              onAdd={addProgrammeModule}
              onRemove={removeProgrammeModule}
              onTextChange={updateProgrammeModule}
              onYoutubeUrlChange={updateProgrammeModuleYoutubeUrl}
              addText={editorLang === "ar" ? "إضافة وحدة" : "Add module"}
            />
          </AdminSection>

          <AdminSection title={isArabic ? "الجمهور المستهدف" : "Audience Tags"}>
            <AudienceRepeater
              lang={editorLang}
              items={form.audienceTags}
              onAdd={addAudienceTag}
              onRemove={removeAudienceTag}
              onChange={updateAudienceTag}
              addText={editorLang === "ar" ? "إضافة فئة" : "Add audience"}
            />
          </AdminSection>

          <div className="sticky bottom-0 z-20 -mx-6 -mb-6 border-t border-gray-100 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? isArabic
                  ? "جاري التحديث..."
                  : "Updating..."
                : isArabic
                  ? "تحديث الكورس"
                  : "Update Course"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function usePreview(file: File | null, fallbackUrl = "") {
  const preview = useMemo(() => {
    if (!file) return fallbackUrl;
    return URL.createObjectURL(file);
  }, [file, fallbackUrl]);

  useEffect(() => {
    return () => {
      if (file && preview) URL.revokeObjectURL(preview);
    };
  }, [file, preview]);

  return preview;
}

interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function AdminSection({ title, description, children }: AdminSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
        )}
      </div>

      <div className="space-y-5">{children}</div>
    </section>
  );
}

interface AdminInputProps {
  label: string;
  value: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  onChange: (value: string) => void;
}

function AdminInput({
  label,
  value,
  type = "text",
  placeholder,
  onChange,
}: AdminInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

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

interface AdminTextareaProps {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}

function AdminTextarea({
  label,
  value,
  rows = 4,
  onChange,
}: AdminTextareaProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm leading-6 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

interface ImagePickerProps {
  label: string;
  previewUrl?: string;
  onChange: (file?: File) => void;
}

function ImagePicker({ label, previewUrl, onChange }: ImagePickerProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <label className="block text-sm font-bold text-gray-900">{label}</label>

      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0])}
        className="mt-4 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
      />

      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          className="mt-4 h-44 w-full rounded-lg object-cover"
        />
      )}
    </div>
  );
}

interface FilePickerProps {
  label: string;
  accept: string;
  currentUrl?: string;
  maxSizeBytes?: number;
  maxSizeLabel?: string;
  onChange: (file?: File) => void;
}

function FilePicker({
  label,
  accept,
  currentUrl,
  maxSizeBytes,
  maxSizeLabel,
  onChange,
}: FilePickerProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <label className="block text-sm font-bold text-gray-900">{label}</label>

      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file && maxSizeBytes && file.size > maxSizeBytes) {
            alert(
              `File too large. Maximum allowed size is ${
                maxSizeLabel || formatFileSize(maxSizeBytes)
              }.`
            );
            event.target.value = "";
            onChange(undefined);
            return;
          }

          onChange(file);
        }}
        className="mt-4 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
      />

      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Open current file
        </a>
      )}

      <p className="mt-3 text-xs leading-5 text-gray-500">
        {accept.includes("pdf")
          ? `Upload a PDF file under ${maxSizeLabel || "10MB"}, or paste a Google Drive URL in the field below.`
          : `Upload an MP4/video file under ${maxSizeLabel || "10MB"}.`}
      </p>
    </div>
  );
}

interface LanguageSwitchProps {
  value: Lang;
  onChange: (value: Lang) => void;
}

function LanguageSwitch({ value, onChange }: LanguageSwitchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
          value === "en"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        English
      </button>

      <button
        type="button"
        onClick={() => onChange("ar")}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
          value === "ar"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        العربية
      </button>
    </div>
  );
}

function DynamicTextList({
  lang,
  items,
  placeholder,
  addText,
  onAdd,
  onRemove,
  onChange,
}: {
  lang: Lang;
  items: LocalizedItem[];
  placeholder: string;
  addText: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, lang: Lang, value: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onAdd}
        className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
      >
        + {addText}
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                #{index + 1}
              </span>

              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>

            <input
              value={item[lang]}
              placeholder={placeholder}
              onChange={(event) => onChange(index, lang, event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsRepeater({
  lang,
  items,
  onAdd,
  onRemove,
  onTextChange,
  onRatingChange,
  onFileChange,
  addText,
}: {
  lang: Lang;
  items: CourseReviewItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onTextChange: (
    index: number,
    lang: Lang,
    key: keyof CourseReviewItem["en"],
    value: string,
  ) => void;
  onRatingChange: (index: number, value: number) => void;
  onFileChange: (index: number, file?: File) => void;
  addText: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onAdd}
        className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
      >
        + {addText}
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={onRemove}>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onFileChange(index, event.target.files?.[0])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            {item.avatarUrl && !item.avatarFile && (
              <img
                src={item.avatarUrl}
                alt=""
                className="h-24 w-24 rounded-full object-cover"
              />
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AdminInput
                label={lang === "ar" ? "اسم الطالب" : "Reviewer name"}
                value={item[lang].name}
                onChange={(value) => onTextChange(index, lang, "name", value)}
              />

              <AdminInput
                label={lang === "ar" ? "الدور" : "Role"}
                value={item[lang].role}
                onChange={(value) => onTextChange(index, lang, "role", value)}
              />

              <AdminInput
                label={lang === "ar" ? "التقييم من 5" : "Rating / 5"}
                type="number"
                value={String(item.rating)}
                onChange={(value) => onRatingChange(index, Number(value || 1))}
              />
            </div>

            <AdminTextarea
              label={lang === "ar" ? "نص التقييم" : "Review text"}
              rows={4}
              value={item[lang].text}
              onChange={(value) => onTextChange(index, lang, "text", value)}
            />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function ProgrammeRepeater({
  lang,
  items,
  onAdd,
  onRemove,
  onTextChange,
  onYoutubeUrlChange,
  addText,
}: {
  lang: Lang;
  items: ProgrammeModuleItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onTextChange: (
    index: number,
    lang: Lang,
    key: keyof ProgrammeModuleItem["en"],
    value: string,
  ) => void;
  onYoutubeUrlChange: (index: number, value: string) => void;
  addText: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onAdd}
        className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
      >
        + {addText}
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <RepeaterCard key={index} index={index} onRemove={onRemove}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminInput
                label="Module"
                value={item[lang].module}
                onChange={(value) => onTextChange(index, lang, "module", value)}
              />
              <AdminInput
                label="Title"
                value={item[lang].title}
                onChange={(value) => onTextChange(index, lang, "title", value)}
              />
              <AdminInput
                label="Start"
                value={item[lang].start}
                onChange={(value) => onTextChange(index, lang, "start", value)}
              />
              <AdminInput
                label="End"
                value={item[lang].end}
                onChange={(value) => onTextChange(index, lang, "end", value)}
              />
            </div>

            <AdminInput
              label={lang === "ar" ? "رابط فيديو YouTube" : "YouTube video URL"}
              value={item.youtubeUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              onChange={(value) => onYoutubeUrlChange(index, value)}
            />
          </RepeaterCard>
        ))}
      </div>
    </div>
  );
}

function AudienceRepeater({
  lang,
  items,
  onAdd,
  onRemove,
  onChange,
  addText,
}: {
  lang: Lang;
  items: AudienceTagItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, key: "en" | "ar" | "color", value: string) => void;
  addText: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onAdd}
        className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
      >
        + {addText}
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                #{index + 1}
              </span>

              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>

            <input
              value={item[lang]}
              placeholder={
                lang === "ar" ? "مثال: رواد الأعمال" : "Example: Entrepreneurs"
              }
              onChange={(event) => onChange(index, lang, event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={item.color}
              onChange={(event) => onChange(index, "color", event.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
              <option value="pink">Pink</option>
            </select>
          </div>
        ))}
      </div>
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
        <span className="text-xs font-semibold text-gray-500">
          #{index + 1}
        </span>

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
