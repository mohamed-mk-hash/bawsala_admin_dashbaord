import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";
import { Card } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

type Lang = "en" | "ar";

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

interface CategoryItem {
  id: string;
  slug: string;
  iconUrl: string;
  iconPublicId: string;
  en: {
    name: string;
  };
  ar: {
    name: string;
  };
}

interface LocalizedProductContent {
  title: string;
  categoryLabel: string;
  heroDescriptionOne: string;
  heroDescriptionTwo: string;
  priceLabel: string;

  aboutTitle: string;
  aboutParagraphOne: string;
  aboutParagraphTwo: string;

  audienceTitle: string;
  relatedTitle: string;

  seoTitle: string;
  seoDescription: string;
}

interface LocalizedItem {
  en: string;
  ar: string;
}

interface AddProductFormState {
  slug: string;
  categoryId: string;

  badge: string;
  price: number;
  currency: string;

  rating: number;
  downloads: number;

  mainImageFile: File | null;
  thumbnailOneFile: File | null;
  thumbnailTwoFile: File | null;
  thumbnailThreeFile: File | null;
  aboutImageOneFile: File | null;
  aboutImageTwoFile: File | null;

  features: LocalizedItem[];
  audienceItems: LocalizedItem[];

  en: LocalizedProductContent;
  ar: LocalizedProductContent;
}

interface CategoryFormState {
  slug: string;
  iconFile: File | null;
  en: {
    name: string;
  };
  ar: {
    name: string;
  };
}

const initialCategoryForm: CategoryFormState = {
  slug: "",
  iconFile: null,
  en: {
    name: "",
  },
  ar: {
    name: "",
  },
};

const initialForm: AddProductFormState = {
  slug: "",
  categoryId: "",

  badge: "New",
  price: 6000,
  currency: "DZD",

  rating: 4.5,
  downloads: 120,

  mainImageFile: null,
  thumbnailOneFile: null,
  thumbnailTwoFile: null,
  thumbnailThreeFile: null,
  aboutImageOneFile: null,
  aboutImageTwoFile: null,

  features: [
    { en: "Instant Download", ar: "تحميل فوري" },
    { en: "Easy to Customize", ar: "سهل التعديل" },
    {
      en: "Works with Notion / Excel / PDF",
      ar: "يعمل مع Notion / Excel / PDF",
    },
    { en: "Beginner Friendly", ar: "مناسب للمبتدئين" },
  ],

  audienceItems: [
    { en: "Startup Founders", ar: "مؤسسو الشركات الناشئة" },
    { en: "Product Managers", ar: "مديرو المنتجات" },
    { en: "Team Leaders", ar: "قادة الفرق" },
    { en: "Consultants & Freelancers", ar: "المستشارون والمستقلون" },
    { en: "Students & Educators", ar: "الطلاب والمعلمون" },
  ],

  en: {
    title: "",
    categoryLabel: "",
    heroDescriptionOne:
      "A ready-to-use strategic planning template designed to help you define goals, align priorities, and structure your roadmap with clarity.....",
    heroDescriptionTwo:
      "Build smarter strategies, align your team, and turn ideas into actionable plans.",
    priceLabel: "6 000 DA",

    aboutTitle: "About This Template",
    aboutParagraphOne:
      "The Strategic Planning Template is a structured framework that helps you turn your vision into actionable plans. It guides you through goal setting, strategic alignment, and execution planning — all in one place.",
    aboutParagraphTwo:
      "Whether you're a startup founder, a product manager, or leading a team, this template helps you think strategically and act with clarity.",

    audienceTitle: "Who Is This For?",
    relatedTitle: "You may also like",

    seoTitle: "",
    seoDescription: "",
  },

  ar: {
    title: "",
    categoryLabel: "",
    heroDescriptionOne:
      "قالب تخطيط استراتيجي جاهز يساعدك على تحديد الأهداف، ترتيب الأولويات، وبناء خارطة طريق واضحة.",
    heroDescriptionTwo:
      "ابنِ استراتيجيات أوضح، ونسّق فريقك، وحوّل الأفكار إلى خطط قابلة للتنفيذ.",
    priceLabel: "6 000 دج",

    aboutTitle: "حول هذا القالب",
    aboutParagraphOne:
      "قالب التخطيط الاستراتيجي هو إطار عملي يساعدك على تحويل الرؤية إلى خطط قابلة للتنفيذ من خلال تحديد الأهداف، المواءمة الاستراتيجية، وتخطيط التنفيذ.",
    aboutParagraphTwo:
      "سواء كنت مؤسس شركة ناشئة، مدير منتج، أو قائد فريق، فهذا القالب يساعدك على التفكير بوضوح والعمل بطريقة منظمة.",

    audienceTitle: "لمن هذا القالب؟",
    relatedTitle: "قد يعجبك أيضاً",

    seoTitle: "",
    seoDescription: "",
  },
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

interface AddProductProps {
  user?: {
    email?: string | null;
    uid?: string | null;
  } | null;
}

export default function AddProduct({ user }: AddProductProps) {
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<AddProductFormState>(initialForm);
  const [editorLang, setEditorLang] = useState<Lang>("en");

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(initialCategoryForm);
  const [savingCategory, setSavingCategory] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentContent = form[editorLang];

  const mainPreview = usePreview(form.mainImageFile);
  const thumbOnePreview = usePreview(form.thumbnailOneFile);
  const thumbTwoPreview = usePreview(form.thumbnailTwoFile);
  const thumbThreePreview = usePreview(form.thumbnailThreeFile);
  const aboutOnePreview = usePreview(form.aboutImageOneFile);
  const aboutTwoPreview = usePreview(form.aboutImageTwoFile);
  const categoryIconPreview = usePreview(categoryForm.iconFile);

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId
  );

  const loadCategories = async () => {
    const categoriesQuery = query(
      collection(db, "productCategories"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(categoriesQuery);

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<CategoryItem, "id">),
    }));

    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    setForm((previous) => ({
      ...previous,
      en: {
        ...previous.en,
        categoryLabel: selectedCategory.en.name,
      },
      ar: {
        ...previous.ar,
        categoryLabel: selectedCategory.ar.name,
      },
    }));
  }, [selectedCategory?.id]);

  const updateRoot = <K extends keyof AddProductFormState>(
    key: K,
    value: AddProductFormState[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateLocalized = (key: keyof LocalizedProductContent, value: string) => {
    setForm((previous) => ({
      ...previous,
      [editorLang]: {
        ...previous[editorLang],
        [key]: value,
      },
    }));
  };

  const updateFeature = (index: number, lang: Lang, value: string) => {
    setForm((previous) => ({
      ...previous,
      features: previous.features.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: value } : item
      ),
    }));
  };

  const addFeature = () => {
    setForm((previous) => ({
      ...previous,
      features: [...previous.features, { en: "", ar: "" }],
    }));
  };

  const removeFeature = (index: number) => {
    setForm((previous) => ({
      ...previous,
      features: previous.features.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateAudienceItem = (index: number, lang: Lang, value: string) => {
    setForm((previous) => ({
      ...previous,
      audienceItems: previous.audienceItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [lang]: value } : item
      ),
    }));
  };

  const addAudienceItem = () => {
    setForm((previous) => ({
      ...previous,
      audienceItems: [...previous.audienceItems, { en: "", ar: "" }],
    }));
  };

  const removeAudienceItem = (index: number) => {
    setForm((previous) => ({
      ...previous,
      audienceItems: previous.audienceItems.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const generateSlug = () => {
    const source = form.en.title || form.ar.title;

    setForm((previous) => ({
      ...previous,
      slug: createSlug(source),
    }));
  };

  const generateCategorySlug = () => {
    const source = categoryForm.en.name || categoryForm.ar.name;

    setCategoryForm((previous) => ({
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

  const validateProduct = () => {
    if (!form.slug.trim()) {
      return isArabic
        ? "يرجى إدخال slug أو توليده من العنوان."
        : "Please enter or generate a slug.";
    }

    if (!form.categoryId) {
      return isArabic
        ? "يرجى اختيار تصنيف المنتج."
        : "Please choose a product category.";
    }

    if (!form.en.title.trim() && !form.ar.title.trim()) {
      return isArabic
        ? "يرجى إدخال اسم المنتج بالعربية أو الإنجليزية."
        : "Please enter the product title in Arabic or English.";
    }

    if (!form.mainImageFile) {
      return isArabic
        ? "يرجى اختيار صورة المنتج الرئيسية."
        : "Please choose the main product image.";
    }

    return "";
  };

  const validateCategory = () => {
    if (!categoryForm.slug.trim()) {
      return isArabic
        ? "يرجى إدخال slug للتصنيف."
        : "Please enter a category slug.";
    }

    if (!categoryForm.en.name.trim() && !categoryForm.ar.name.trim()) {
      return isArabic
        ? "يرجى إدخال اسم التصنيف."
        : "Please enter the category name.";
    }

    if (!categoryForm.iconFile) {
      return isArabic
        ? "يرجى اختيار أيقونة التصنيف."
        : "Please choose the category icon.";
    }

    return "";
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
      en: { ...initialForm.en },
      ar: { ...initialForm.ar },
      features: [...initialForm.features],
      audienceItems: [...initialForm.audienceItems],
    });
    setEditorLang("en");
  };

  const buildLocalizedPayload = (lang: Lang) => {
    const content = form[lang];

    return {
      title: content.title.trim(),
      categoryLabel: content.categoryLabel.trim(),
      heroDescriptionOne: content.heroDescriptionOne.trim(),
      heroDescriptionTwo: content.heroDescriptionTwo.trim(),
      priceLabel: content.priceLabel.trim(),

      aboutTitle: content.aboutTitle.trim(),
      aboutParagraphOne: content.aboutParagraphOne.trim(),
      aboutParagraphTwo: content.aboutParagraphTwo.trim(),

      audienceTitle: content.audienceTitle.trim(),

      relatedTitle: content.relatedTitle.trim(),

      features: form.features
        .map((item) => item[lang].trim())
        .filter(Boolean),

      audienceItems: form.audienceItems
        .map((item) => item[lang].trim())
        .filter(Boolean),

      seoTitle: content.seoTitle.trim(),
      seoDescription: content.seoDescription.trim(),
    };
  };

  const handleSaveCategory = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setSavingCategory(true);

      const validationError = validateCategory();

      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      const icon = await uploadImageToCloudinary(categoryForm.iconFile as File);

      const payload = {
        slug: categoryForm.slug.trim(),
        iconUrl: icon.url,
        iconPublicId: icon.publicId,

        en: {
          name: categoryForm.en.name.trim(),
        },

        ar: {
          name: categoryForm.ar.name.trim(),
        },

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        createdBy: {
          email: user?.email || null,
          uid: user?.uid || null,
        },
      };

      const createdCategoryRef = await addDoc(
        collection(db, "productCategories"),
        payload
      );

      await loadCategories();

      setForm((previous) => ({
        ...previous,
        categoryId: createdCategoryRef.id,
      }));

      setCategoryForm(initialCategoryForm);
      setCategoryModalOpen(false);

      setSuccessMessage(
        isArabic
          ? "تم إنشاء التصنيف بنجاح."
          : "Category created successfully."
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء إنشاء التصنيف."
          : "Something went wrong while creating the category."
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    try {
      setSaving(true);

      const validationError = validateProduct();

      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      const [
        mainImage,
        thumbnailOne,
        thumbnailTwo,
        thumbnailThree,
        aboutImageOne,
        aboutImageTwo,
      ] = await Promise.all([
        uploadImageToCloudinary(form.mainImageFile as File),
        optionalUpload(form.thumbnailOneFile),
        optionalUpload(form.thumbnailTwoFile),
        optionalUpload(form.thumbnailThreeFile),
        optionalUpload(form.aboutImageOneFile),
        optionalUpload(form.aboutImageTwoFile),
      ]);

      const galleryImages = [
        mainImage,
        thumbnailOne,
        thumbnailTwo,
        thumbnailThree,
      ].filter(Boolean) as CloudinaryUploadResult[];

      const category = categories.find((item) => item.id === form.categoryId);

      const payload = {
        page: "productDetail",

        slug: form.slug.trim(),

        status: "published",

        categoryId: category?.id || "",
        categorySlug: category?.slug || "",
        categoryIconUrl: category?.iconUrl || "",
        categoryIconPublicId: category?.iconPublicId || "",
        categoryName: {
          en: category?.en.name || form.en.categoryLabel,
          ar: category?.ar.name || form.ar.categoryLabel,
        },

        badge: form.badge.trim() || "New",
        badgeType: "green",

        rating: Number(form.rating || 4.5),
        downloads: Number(form.downloads || 0),

        price: Number(form.price || 0),
        priceText: form.en.priceLabel.trim() || formatPrice(form.price, form.currency),
        currency: form.currency.trim() || "DZD",
        isFree: Number(form.price || 0) === 0,

        mainImageUrl: mainImage.url,
        mainImagePublicId: mainImage.publicId,

        galleryImages: galleryImages.map((image) => ({
          url: image.url,
          publicId: image.publicId,
        })),

        aboutImageOneUrl: aboutImageOne?.url || "",
        aboutImageOnePublicId: aboutImageOne?.publicId || "",

        aboutImageTwoUrl: aboutImageTwo?.url || "",
        aboutImageTwoPublicId: aboutImageTwo?.publicId || "",

        en: buildLocalizedPayload("en"),
        ar: buildLocalizedPayload("ar"),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),

        createdBy: {
          email: user?.email || null,
          uid: user?.uid || null,
        },
      };

      await addDoc(collection(db, "products"), payload);

      setSuccessMessage(
        isArabic
          ? "تم حفظ المنتج داخل products بنجاح."
          : "Product saved successfully inside products."
      );

      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء حفظ المنتج."
          : "Something went wrong while saving the product."
      );
    } finally {
      setSaving(false);

      window.setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 5000);
    }
  };

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isArabic ? "إضافة منتج جديد" : "Add New Product"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "أضف منتجاً مع تصنيف حقيقي من productCategories."
              : "Add a product with a real category from productCategories."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            + {isArabic ? "تصنيف جديد" : "New Category"}
          </button>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold text-blue-600">
              Firebase Collections
            </p>
            <p className="mt-1 text-lg font-bold text-blue-700">
              products / productCategories
            </p>
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
        <form onSubmit={handleSaveProduct} className="space-y-8">
          <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-gray-100 bg-white px-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Product Detail CMS
                </span>
                <p className="mt-2 text-sm text-gray-500">
                  {isArabic
                    ? "اختر تصنيف المنتج من القائمة أو أنشئ تصنيفاً جديداً."
                    : "Choose a product category or create a new one."}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                  ? "حفظ المنتج"
                  : "Save Product"}
              </button>
            </div>
          </div>

          <AdminSection title={isArabic ? "المعلومات الأساسية" : "Basic Info"}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
              <AdminInput
                label="Slug"
                placeholder="strategic-planning-template"
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
                  {isArabic ? "تصنيف المنتج" : "Product Category"}
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

              <AdminInput
                label={isArabic ? "الشارة" : "Badge"}
                value={form.badge}
                onChange={(value) => updateRoot("badge", value)}
              />

              <AdminInput
                label={isArabic ? "السعر" : "Price"}
                type="number"
                value={String(form.price)}
                onChange={(value) => updateRoot("price", Number(value || 0))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
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

          <AdminSection title={isArabic ? "صور المنتج" : "Product Images"}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ImagePicker
                label={isArabic ? "الصورة الرئيسية" : "Main image"}
                previewUrl={mainPreview}
                onChange={(file) => updateRoot("mainImageFile", file || null)}
              />

              <ImagePicker
                label="Thumbnail 1"
                previewUrl={thumbOnePreview}
                onChange={(file) =>
                  updateRoot("thumbnailOneFile", file || null)
                }
              />

              <ImagePicker
                label="Thumbnail 2"
                previewUrl={thumbTwoPreview}
                onChange={(file) =>
                  updateRoot("thumbnailTwoFile", file || null)
                }
              />

              <ImagePicker
                label="Thumbnail 3"
                previewUrl={thumbThreePreview}
                onChange={(file) =>
                  updateRoot("thumbnailThreeFile", file || null)
                }
              />

              <ImagePicker
                label={isArabic ? "صورة About الأولى" : "About image one"}
                previewUrl={aboutOnePreview}
                onChange={(file) =>
                  updateRoot("aboutImageOneFile", file || null)
                }
              />

              <ImagePicker
                label={isArabic ? "صورة About الثانية" : "About image two"}
                previewUrl={aboutTwoPreview}
                onChange={(file) =>
                  updateRoot("aboutImageTwoFile", file || null)
                }
              />
            </div>
          </AdminSection>

          <AdminSection title={isArabic ? "محتوى المنتج" : "Product Content"}>
            <LanguageSwitch value={editorLang} onChange={setEditorLang} />

            <div
              className="space-y-6 rounded-xl border border-gray-100 bg-white p-4"
              dir={editorLang === "ar" ? "rtl" : "ltr"}
            >
              <AdminInput
                label={editorLang === "ar" ? "اسم المنتج" : "Product title"}
                value={currentContent.title}
                onChange={(value) => updateLocalized("title", value)}
              />

              <AdminInput
                label={editorLang === "ar" ? "تصنيف المنتج" : "Category label"}
                value={currentContent.categoryLabel}
                onChange={(value) => updateLocalized("categoryLabel", value)}
              />

              <AdminInput
                label={editorLang === "ar" ? "نص السعر" : "Price label"}
                value={currentContent.priceLabel}
                onChange={(value) => updateLocalized("priceLabel", value)}
              />

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "وصف المنتج الأول"
                    : "Hero description one"
                }
                rows={3}
                value={currentContent.heroDescriptionOne}
                onChange={(value) =>
                  updateLocalized("heroDescriptionOne", value)
                }
              />

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "وصف المنتج الثاني"
                    : "Hero description two"
                }
                rows={3}
                value={currentContent.heroDescriptionTwo}
                onChange={(value) =>
                  updateLocalized("heroDescriptionTwo", value)
                }
              />

              <DynamicListEditor
                title={editorLang === "ar" ? "مميزات المنتج" : "Product Features"}
                subtitle={
                  editorLang === "ar"
                    ? "أضف أي عدد من المميزات التي تظهر تحت وصف المنتج."
                    : "Add as many feature rows as you want under the product description."
                }
                lang={editorLang}
                items={form.features}
                onAdd={addFeature}
                onRemove={removeFeature}
                onChange={updateFeature}
                addText={editorLang === "ar" ? "إضافة ميزة" : "Add feature"}
                placeholder={
                  editorLang === "ar"
                    ? "مثال: تحميل فوري"
                    : "Example: Instant Download"
                }
              />

              <AdminInput
                label={editorLang === "ar" ? "عنوان About" : "About title"}
                value={currentContent.aboutTitle}
                onChange={(value) => updateLocalized("aboutTitle", value)}
              />

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "فقرة About الأولى"
                    : "About paragraph one"
                }
                rows={4}
                value={currentContent.aboutParagraphOne}
                onChange={(value) =>
                  updateLocalized("aboutParagraphOne", value)
                }
              />

              <AdminTextarea
                label={
                  editorLang === "ar"
                    ? "فقرة About الثانية"
                    : "About paragraph two"
                }
                rows={4}
                value={currentContent.aboutParagraphTwo}
                onChange={(value) =>
                  updateLocalized("aboutParagraphTwo", value)
                }
              />

              <AdminInput
                label={
                  editorLang === "ar"
                    ? "عنوان الجمهور"
                    : "Audience section title"
                }
                value={currentContent.audienceTitle}
                onChange={(value) => updateLocalized("audienceTitle", value)}
              />

              <DynamicListEditor
                title={
                  editorLang === "ar" ? "الجمهور المستهدف" : "Target Audience"
                }
                subtitle={
                  editorLang === "ar"
                    ? "أضف الفئات التي يظهر لها المنتج مناسباً."
                    : "Add the audience items shown in the Who Is This For section."
                }
                lang={editorLang}
                items={form.audienceItems}
                onAdd={addAudienceItem}
                onRemove={removeAudienceItem}
                onChange={updateAudienceItem}
                addText={
                  editorLang === "ar" ? "إضافة فئة" : "Add audience item"
                }
                placeholder={
                  editorLang === "ar"
                    ? "مثال: مؤسسو الشركات الناشئة"
                    : "Example: Startup Founders"
                }
              />

              <AdminInput
                label={
                  editorLang === "ar"
                    ? "عنوان المنتجات المشابهة"
                    : "Related products title"
                }
                value={currentContent.relatedTitle}
                onChange={(value) => updateLocalized("relatedTitle", value)}
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
              {saving
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                ? "حفظ المنتج"
                : "Save Product"}
            </button>
          </div>
        </form>
      </Card>

      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isArabic ? "إنشاء تصنيف جديد" : "Create New Category"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isArabic
                    ? "سيتم حفظ التصنيف داخل productCategories."
                    : "This category will be saved inside productCategories."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AdminInput
                  label={isArabic ? "اسم التصنيف بالإنجليزية" : "English name"}
                  value={categoryForm.en.name}
                  onChange={(value) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      en: { name: value },
                    }))
                  }
                />

                <AdminInput
                  label={isArabic ? "اسم التصنيف بالعربية" : "Arabic name"}
                  value={categoryForm.ar.name}
                  onChange={(value) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      ar: { name: value },
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                <AdminInput
                  label="Slug"
                  value={categoryForm.slug}
                  placeholder="strategic-planning"
                  onChange={(value) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      slug: value,
                    }))
                  }
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={generateCategorySlug}
                    className="h-[42px] rounded-lg border border-blue-600 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    {isArabic ? "توليد" : "Generate"}
                  </button>
                </div>
              </div>

              <ImagePicker
                label={isArabic ? "أيقونة التصنيف" : "Category icon"}
                previewUrl={categoryIconPreview}
                onChange={(file) =>
                  setCategoryForm((previous) => ({
                    ...previous,
                    iconFile: file || null,
                  }))
                }
              />

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={savingCategory}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCategory
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isArabic
                    ? "حفظ التصنيف"
                    : "Save Category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function usePreview(file: File | null) {
  const preview = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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
  previewUrl: string;
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
          className="mt-4 h-56 w-full rounded-lg object-cover"
        />
      )}
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

interface DynamicListEditorProps {
  title: string;
  subtitle: string;
  lang: Lang;
  items: LocalizedItem[];
  placeholder: string;
  addText: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, lang: Lang, value: string) => void;
}

function DynamicListEditor({
  title,
  subtitle,
  lang,
  items,
  placeholder,
  addText,
  onAdd,
  onRemove,
  onChange,
}: DynamicListEditorProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          + {addText}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={`${lang}-${index}`}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500">
                #{index + 1}
              </span>

              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>

            <input
              type="text"
              value={item[lang]}
              placeholder={placeholder}
              onChange={(event) => onChange(index, lang, event.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}