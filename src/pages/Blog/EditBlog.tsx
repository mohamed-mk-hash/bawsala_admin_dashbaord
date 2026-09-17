import React, { useEffect, useMemo, useState } from "react";
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
import { useNavigate, useParams } from "react-router-dom";

import { db } from "../../firebase";
import { Card } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

type Lang = "en" | "ar";
type BlogStatus = "draft" | "published" | "archived";

interface BlogCategoryItem {
  id: string;
  slug: string;
  iconUrl?: string;
  iconPublicId?: string;
  en: { name: string };
  ar: { name: string };
}

interface LocalizedBlogDetailContent {
  metaDateText: string;
  readTimeText: string;

  title: string;
  subtitle: string;

  authorLabel: string;
  authorName: string;
  publishedOnLabel: string;
  publishedOnText: string;

  heroImageAlt: string;
  contentImageAlt: string;
  imageCaption: string;

  articleHtml: string;

  latestSectionTitle: string;

  seoTitle: string;
  seoDescription: string;
}

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

interface EditBlogFormState {
  slug: string;
  status: BlogStatus;
  categoryId: string;
  tagsInput: string;

  publishedDate: string;
  readTimeMinutes: number;

  featuredImageFile: File | null;
  contentImageFile: File | null;

  heroImageUrl: string;
  heroImagePublicId: string;

  contentImageUrl: string;
  contentImagePublicId: string;

  en: LocalizedBlogDetailContent;
  ar: LocalizedBlogDetailContent;
}

const emptyEnglishContent: LocalizedBlogDetailContent = {
  metaDateText: "",
  readTimeText: "",

  title: "",
  subtitle: "",

  authorLabel: "Written by",
  authorName: "",
  publishedOnLabel: "Published on",
  publishedOnText: "",

  heroImageAlt: "",
  contentImageAlt: "",
  imageCaption: "",

  articleHtml: "",

  latestSectionTitle: "Latest articles",

  seoTitle: "",
  seoDescription: "",
};

const emptyArabicContent: LocalizedBlogDetailContent = {
  metaDateText: "",
  readTimeText: "",

  title: "",
  subtitle: "",

  authorLabel: "كتبه",
  authorName: "",
  publishedOnLabel: "نشر في",
  publishedOnText: "",

  heroImageAlt: "",
  contentImageAlt: "",
  imageCaption: "",

  articleHtml: "",

  latestSectionTitle: "أحدث المقالات",

  seoTitle: "",
  seoDescription: "",
};

const initialForm: EditBlogFormState = {
  slug: "",
  status: "draft",
  categoryId: "",
  tagsInput: "",

  publishedDate: "",
  readTimeMinutes: 8,

  featuredImageFile: null,
  contentImageFile: null,

  heroImageUrl: "",
  heroImagePublicId: "",

  contentImageUrl: "",
  contentImagePublicId: "",

  en: { ...emptyEnglishContent },
  ar: { ...emptyArabicContent },
};

const defaultArticleTemplates: Record<Lang, string> = {
  en: `<h2>Introduction</h2>

<p>Write your introduction paragraph here. Explain the main idea of the article and why it matters to the reader.</p>

<p>Add another paragraph here to give more context, background, or a practical example.</p>

<blockquote>
  “Write a strong quote here that supports the main message of the article.”
</blockquote>

<h3>Software and tools</h3>

<p>Write this section in the same rhythm as the blog detail page. Keep paragraphs short, clear, and useful.</p>

<h3>Other resources</h3>

<p>Add extra resources, recommendations, or practical notes here.</p>

<ol>
  <li>First important point.</li>
  <li>Second important point.</li>
  <li>Third important point.</li>
</ol>

<p>Write the closing paragraph here.</p>`,

  ar: `<h2>المقدمة</h2>

<p>اكتب فقرة المقدمة هنا. اشرح الفكرة الأساسية للمقال ولماذا هي مهمة للقارئ.</p>

<p>أضف فقرة ثانية تعطي سياقاً أو مثالاً عملياً أو خلفية عن الموضوع.</p>

<blockquote>
  “اكتب اقتباساً قوياً يدعم الرسالة الأساسية للمقال.”
</blockquote>

<h3>الأدوات والأنظمة</h3>

<p>اكتب هذا الجزء بنفس أسلوب صفحة تفاصيل المقال. اجعل الفقرات قصيرة وواضحة ومفيدة.</p>

<h3>موارد أخرى</h3>

<p>أضف هنا موارد إضافية أو توصيات أو ملاحظات عملية.</p>

<ol>
  <li>النقطة المهمة الأولى.</li>
  <li>النقطة المهمة الثانية.</li>
  <li>النقطة المهمة الثالثة.</li>
</ol>

<p>اكتب فقرة الخاتمة هنا.</p>`,
};

const createSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
};

const toDateTimeLocalValue = (value: any) => {
  if (!value) return "";

  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const pad = (number: number) => String(number).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return "";
  }
};

const getDateText = (dateValue: string, lang: Lang) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(lang === "ar" ? "ar-DZ" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

export default function EditBlog() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<EditBlogFormState>(initialForm);
  const [editorLang, setEditorLang] = useState<Lang>("en");

  const [categories, setCategories] = useState<BlogCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentContent = form[editorLang];

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId
  );

  const featuredPreview = useMemo(() => {
    if (!form.featuredImageFile) return "";
    return URL.createObjectURL(form.featuredImageFile);
  }, [form.featuredImageFile]);

  const contentPreview = useMemo(() => {
    if (!form.contentImageFile) return "";
    return URL.createObjectURL(form.contentImageFile);
  }, [form.contentImageFile]);

  useEffect(() => {
    return () => {
      if (featuredPreview) URL.revokeObjectURL(featuredPreview);
    };
  }, [featuredPreview]);

  useEffect(() => {
    return () => {
      if (contentPreview) URL.revokeObjectURL(contentPreview);
    };
  }, [contentPreview]);

  const ui = {
    pageTitle: isArabic ? "تعديل المقال" : "Edit Blog",
    pageSubtitle: isArabic
      ? "عدّل بيانات المقال المحفوظ داخل Firebase."
      : "Update an existing blog saved in Firebase.",
    save: isArabic ? "حفظ التعديلات" : "Save Changes",
    saving: isArabic ? "جاري الحفظ..." : "Saving...",
    back: isArabic ? "العودة إلى المقالات" : "Back to Blogs",
    settings: isArabic ? "إعدادات المقال" : "Blog Settings",
    images: isArabic ? "صور المقال" : "Blog Images",
    content: isArabic ? "محتوى المقال" : "Blog Content",
    currentImage: isArabic ? "الصورة الحالية" : "Current image",
    newImage: isArabic ? "رفع صورة جديدة" : "Upload new image",
    loading: isArabic ? "جاري تحميل المقال..." : "Loading blog...",
    updated: isArabic ? "تم تحديث المقال بنجاح." : "Blog updated successfully.",
    notFound: isArabic ? "لم يتم العثور على المقال." : "Blog not found.",
  };

  const loadCategories = async () => {
    const categoriesQuery = query(
      collection(db, "blogCategories"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(categoriesQuery);

    const data = snapshot.docs.map((categoryDoc) => ({
      id: categoryDoc.id,
      ...(categoryDoc.data() as Omit<BlogCategoryItem, "id">),
    }));

    setCategories(data);
  };

  const loadBlog = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setErrorMessage("");

      await loadCategories();

      const blogSnapshot = await getDoc(doc(db, "blogs", id));

      if (!blogSnapshot.exists()) {
        setErrorMessage(ui.notFound);
        return;
      }

      const blog = blogSnapshot.data() as any;

      setForm({
        slug: blog.slug || "",
        status: blog.status || "draft",
        categoryId: blog.categoryId || "",
        tagsInput: Array.isArray(blog.tags) ? blog.tags.join(", ") : "",

        publishedDate: toDateTimeLocalValue(blog.publishedDate),
        readTimeMinutes: Number(blog.readTimeMinutes || 0),

        featuredImageFile: null,
        contentImageFile: null,

        heroImageUrl: blog.heroImageUrl || "",
        heroImagePublicId: blog.heroImagePublicId || "",

        contentImageUrl: blog.contentImageUrl || "",
        contentImagePublicId: blog.contentImagePublicId || "",

        en: {
          ...emptyEnglishContent,
          ...(blog.en || {}),
        },
        ar: {
          ...emptyArabicContent,
          ...(blog.ar || {}),
        },
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
          ? "تعذر تحميل المقال."
          : "Could not load blog."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateRoot = <K extends keyof EditBlogFormState>(
    key: K,
    value: EditBlogFormState[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateLocalized = (
    key: keyof LocalizedBlogDetailContent,
    value: string
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

  const syncDateTexts = () => {
    const englishDate = getDateText(form.publishedDate, "en");
    const arabicDate = getDateText(form.publishedDate, "ar");

    setForm((previous) => ({
      ...previous,
      en: {
        ...previous.en,
        metaDateText: englishDate ? `Published on ${englishDate}` : "",
        publishedOnText: englishDate,
        readTimeText: `${previous.readTimeMinutes || 0} min read`,
      },
      ar: {
        ...previous.ar,
        metaDateText: arabicDate ? `نشر في ${arabicDate}` : "",
        publishedOnText: arabicDate,
        readTimeText: `${previous.readTimeMinutes || 0} دقائق قراءة`,
      },
    }));
  };

  const insertArticleTemplate = () => {
    setForm((previous) => ({
      ...previous,
      [editorLang]: {
        ...previous[editorLang],
        articleHtml: defaultArticleTemplates[editorLang],
      },
    }));
  };

  const validateForm = () => {
    if (!form.slug.trim()) {
      return isArabic
        ? "يرجى إدخال slug أو توليده من العنوان."
        : "Please enter a slug or generate one from the title.";
    }

    if (!form.categoryId) {
      return isArabic
        ? "يرجى اختيار تصنيف المقال."
        : "Please choose a blog category.";
    }

    if (!form.en.title.trim() && !form.ar.title.trim()) {
      return isArabic
        ? "يرجى إدخال عنوان المقال بالعربية أو الإنجليزية."
        : "Please enter at least one blog title in Arabic or English.";
    }

    if (!form.featuredImageFile && !form.heroImageUrl) {
      return isArabic
        ? "يرجى اختيار الصورة الرئيسية للمقال."
        : "Please choose the blog featured image.";
    }

    if (!form.contentImageFile && !form.contentImageUrl) {
      return isArabic
        ? "يرجى اختيار صورة محتوى المقال."
        : "Please choose the blog content image.";
    }

    return "";
  };

  const buildLocalizedPayload = (lang: Lang) => {
    const content = form[lang];

    return {
      metaDateText: content.metaDateText.trim(),
      readTimeText: content.readTimeText.trim(),

      title: content.title.trim(),
      subtitle: content.subtitle.trim(),

      authorLabel: content.authorLabel.trim(),
      authorName: content.authorName.trim(),
      publishedOnLabel: content.publishedOnLabel.trim(),
      publishedOnText: content.publishedOnText.trim(),

      heroImageAlt: content.heroImageAlt.trim(),
      contentImageAlt: content.contentImageAlt.trim(),
      imageCaption: content.imageCaption.trim(),

      articleHtml: content.articleHtml,

      latestSectionTitle: content.latestSectionTitle.trim(),

      seoTitle: content.seoTitle.trim(),
      seoDescription: content.seoDescription.trim(),
    };
  };

  const handleSaveBlog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) return;

    setSuccessMessage("");
    setErrorMessage("");

    try {
      setSaving(true);

      const validationError = validateForm();

      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      let featuredImage = {
        url: form.heroImageUrl,
        publicId: form.heroImagePublicId,
      };

      let contentImage = {
        url: form.contentImageUrl,
        publicId: form.contentImagePublicId,
      };

      if (form.featuredImageFile) {
        featuredImage = await uploadImageToCloudinary(form.featuredImageFile);
      }

      if (form.contentImageFile) {
        contentImage = await uploadImageToCloudinary(form.contentImageFile);
      }

      const categoryNameEn =
        selectedCategory?.en?.name || selectedCategory?.slug || "";
      const categoryNameAr =
        selectedCategory?.ar?.name || selectedCategory?.en?.name || "";

      const payload = {
        page: "blogDetail",

        slug: form.slug.trim(),
        status: form.status,

        categoryId: selectedCategory?.id || "",
        categorySlug: selectedCategory?.slug || "",
        category: categoryNameEn,
        categoryName: {
          en: categoryNameEn,
          ar: categoryNameAr,
        },

        tags: form.tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),

        publishedDate: form.publishedDate ? new Date(form.publishedDate) : null,
        readTimeMinutes: Number(form.readTimeMinutes || 0),

        heroImageUrl: featuredImage.url,
        heroImagePublicId: featuredImage.publicId,

        contentImageUrl: contentImage.url,
        contentImagePublicId: contentImage.publicId,

        en: buildLocalizedPayload("en"),
        ar: buildLocalizedPayload("ar"),

        updatedAt: serverTimestamp(),
        publishedAt: form.status === "published" ? serverTimestamp() : null,
      };

      await updateDoc(doc(db, "blogs", id), payload);

      setForm((previous) => ({
        ...previous,
        featuredImageFile: null,
        contentImageFile: null,
        heroImageUrl: featuredImage.url,
        heroImagePublicId: featuredImage.publicId,
        contentImageUrl: contentImage.url,
        contentImagePublicId: contentImage.publicId,
      }));

      setSuccessMessage(ui.updated);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء تحديث المقال."
          : "Something went wrong while updating the blog."
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
          <p className="text-sm font-semibold text-gray-500">{ui.loading}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ui.pageTitle}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {ui.pageSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/blog")}
          className="rounded-lg border border-blue-600 px-5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          {ui.back}
        </button>
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
        <form onSubmit={handleSaveBlog} className="space-y-8">
          <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-gray-100 bg-white px-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Blog Edit CMS
                </span>
                <p className="mt-2 text-sm text-gray-500">
                  {isArabic
                    ? "عدّل بيانات المقال والصور والتصنيف."
                    : "Update the blog content, images, and category."}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? ui.saving : ui.save}
              </button>
            </div>
          </div>

          <AdminSection
            title={ui.settings}
            description={
              isArabic
                ? "هذه البيانات تتحكم في حالة المقال، التصنيف، مدة القراءة، والرابط."
                : "Control the blog status, category, read time, date, and slug."
            }
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <AdminSelect
                label={isArabic ? "الحالة" : "Status"}
                value={form.status}
                options={[
                  { label: isArabic ? "مسودة" : "Draft", value: "draft" },
                  {
                    label: isArabic ? "منشور" : "Published",
                    value: "published",
                  },
                  {
                    label: isArabic ? "مؤرشف" : "Archived",
                    value: "archived",
                  },
                ]}
                onChange={(value) => updateRoot("status", value as BlogStatus)}
              />

              <AdminSelect
                label={isArabic ? "التصنيف" : "Category"}
                value={form.categoryId}
                options={[
                  {
                    label: isArabic ? "اختر التصنيف" : "Choose category",
                    value: "",
                  },
                  ...categories.map((category) => ({
                    label: isArabic
                      ? category.ar?.name || category.en?.name || category.slug
                      : category.en?.name || category.ar?.name || category.slug,
                    value: category.id,
                  })),
                ]}
                onChange={(value) => updateRoot("categoryId", value)}
              />

              <AdminInput
                label={isArabic ? "مدة القراءة" : "Read time minutes"}
                type="number"
                value={String(form.readTimeMinutes)}
                onChange={(value) =>
                  updateRoot("readTimeMinutes", Number(value || 0))
                }
              />

              <AdminInput
                label={isArabic ? "تاريخ النشر" : "Published date"}
                type="datetime-local"
                value={form.publishedDate}
                onChange={(value) => updateRoot("publishedDate", value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
              <AdminInput
                label="Slug"
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
              <AdminInput
                label={isArabic ? "الوسوم" : "Tags"}
                value={form.tagsInput}
                onChange={(value) => updateRoot("tagsInput", value)}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={syncDateTexts}
                  className="h-[42px] rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {isArabic
                    ? "تعبئة نصوص التاريخ تلقائياً"
                    : "Auto-fill date labels"}
                </button>
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title={ui.images}
            description={
              isArabic
                ? "يمكنك الاحتفاظ بالصور الحالية أو رفع صور جديدة."
                : "You can keep the current images or upload new ones."
            }
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ImagePicker
                label={isArabic ? "الصورة الرئيسية" : "Hero / featured image"}
                helper={ui.newImage}
                previewUrl={featuredPreview || form.heroImageUrl}
                onChange={(file) =>
                  updateRoot("featuredImageFile", file || null)
                }
              />

              <ImagePicker
                label={isArabic ? "صورة داخل المقال" : "Article content image"}
                helper={ui.newImage}
                previewUrl={contentPreview || form.contentImageUrl}
                onChange={(file) =>
                  updateRoot("contentImageFile", file || null)
                }
              />
            </div>
          </AdminSection>

          <AdminSection
            title={ui.content}
            description={
              isArabic
                ? "كل لغة لها نصوصها الخاصة، وستظهر في نفس تصميم صفحة التفاصيل."
                : "Each language has its own content and will render inside the same Blog Detail layout."
            }
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditorLang("en")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  editorLang === "en"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                English
              </button>

              <button
                type="button"
                onClick={() => setEditorLang("ar")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  editorLang === "ar"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                العربية
              </button>
            </div>

            <div
              className="space-y-6 rounded-xl border border-gray-100 bg-white p-4"
              dir={editorLang === "ar" ? "rtl" : "ltr"}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={
                    editorLang === "ar"
                      ? "نص التاريخ في الشارة"
                      : "Meta date text"
                  }
                  value={currentContent.metaDateText}
                  onChange={(value) => updateLocalized("metaDateText", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "نص مدة القراءة" : "Read time text"
                  }
                  value={currentContent.readTimeText}
                  onChange={(value) => updateLocalized("readTimeText", value)}
                />
              </div>

              <AdminInput
                label={editorLang === "ar" ? "عنوان المقال" : "Blog title"}
                value={currentContent.title}
                onChange={(value) => updateLocalized("title", value)}
              />

              <AdminTextarea
                label={editorLang === "ar" ? "العنوان الفرعي" : "Subtitle"}
                rows={3}
                value={currentContent.subtitle}
                onChange={(value) => updateLocalized("subtitle", value)}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={
                    editorLang === "ar" ? "Label الكاتب" : "Author label"
                  }
                  value={currentContent.authorLabel}
                  onChange={(value) => updateLocalized("authorLabel", value)}
                />

                <AdminInput
                  label={editorLang === "ar" ? "اسم الكاتب" : "Author name"}
                  value={currentContent.authorName}
                  onChange={(value) => updateLocalized("authorName", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "Label تاريخ النشر" : "Published label"
                  }
                  value={currentContent.publishedOnLabel}
                  onChange={(value) =>
                    updateLocalized("publishedOnLabel", value)
                  }
                />

                <AdminInput
                  label={
                    editorLang === "ar" ? "نص تاريخ النشر" : "Published on text"
                  }
                  value={currentContent.publishedOnText}
                  onChange={(value) => updateLocalized("publishedOnText", value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AdminInput
                  label={
                    editorLang === "ar" ? "Alt الصورة الرئيسية" : "Hero image alt"
                  }
                  value={currentContent.heroImageAlt}
                  onChange={(value) => updateLocalized("heroImageAlt", value)}
                />

                <AdminInput
                  label={
                    editorLang === "ar"
                      ? "Alt صورة داخل المقال"
                      : "Content image alt"
                  }
                  value={currentContent.contentImageAlt}
                  onChange={(value) => updateLocalized("contentImageAlt", value)}
                />
              </div>

              <AdminInput
                label={
                  editorLang === "ar" ? "وصف صورة داخل المقال" : "Image caption"
                }
                value={currentContent.imageCaption}
                onChange={(value) => updateLocalized("imageCaption", value)}
              />

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-700">
                      {editorLang === "ar" ? "محتوى المقال HTML" : "Article HTML"}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-blue-700/80">
                      {editorLang === "ar"
                        ? "اكتب هنا نفس محتوى article الموجود في صفحة BlogDetail."
                        : "Write the same article content that appears inside BlogDetail."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={insertArticleTemplate}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    {editorLang === "ar" ? "إدراج قالب" : "Insert template"}
                  </button>
                </div>
              </div>

              <textarea
                value={currentContent.articleHtml}
                onChange={(event) =>
                  updateLocalized("articleHtml", event.target.value)
                }
                rows={18}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />

              <AdminInput
                label={
                  editorLang === "ar"
                    ? "عنوان قسم أحدث المقالات"
                    : "Latest section title"
                }
                value={currentContent.latestSectionTitle}
                onChange={(value) =>
                  updateLocalized("latestSectionTitle", value)
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

          <div className="sticky bottom-0 z-20 -mx-6 -mb-6 border-t border-gray-100 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? ui.saving : ui.save}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
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
  placeholder?: string;
  onChange: (value: string) => void;
}

function AdminTextarea({
  label,
  value,
  rows = 4,
  placeholder,
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
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm leading-6 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

interface AdminSelectOption {
  label: string;
  value: string;
}

interface AdminSelectProps {
  label: string;
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
}

function AdminSelect({ label, value, options, onChange }: AdminSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ImagePickerProps {
  label: string;
  helper?: string;
  previewUrl: string;
  onChange: (file?: File) => void;
}

function ImagePicker({ label, helper, previewUrl, onChange }: ImagePickerProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <label className="block text-sm font-bold text-gray-900">{label}</label>

      {helper && <p className="mt-1 text-xs leading-5 text-gray-500">{helper}</p>}

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
          className="mt-4 h-56 w-full rounded-lg object-cover"
        />
      )}
    </div>
  );
}
