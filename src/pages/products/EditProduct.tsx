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
import { Link, useNavigate, useParams } from "react-router-dom";

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

interface GalleryImageItem {
  url: string;
  publicId: string;
}

interface EditProductFormState {
  slug: string;
  status: "draft" | "published" | "archived";

  categoryId: string;

  badge: string;
  price: number;
  currency: string;

  rating: number;
  downloads: number;

  mainImageFile: File | null;
  mainImageUrl: string;
  mainImagePublicId: string;

  thumbnailOneFile: File | null;
  thumbnailOneUrl: string;
  thumbnailOnePublicId: string;

  thumbnailTwoFile: File | null;
  thumbnailTwoUrl: string;
  thumbnailTwoPublicId: string;

  thumbnailThreeFile: File | null;
  thumbnailThreeUrl: string;
  thumbnailThreePublicId: string;

  aboutImageOneFile: File | null;
  aboutImageOneUrl: string;
  aboutImageOnePublicId: string;

  aboutImageTwoFile: File | null;
  aboutImageTwoUrl: string;
  aboutImageTwoPublicId: string;

  features: LocalizedItem[];
  audienceItems: LocalizedItem[];

  en: LocalizedProductContent;
  ar: LocalizedProductContent;
}

const emptyLocalizedContent: LocalizedProductContent = {
  title: "",
  categoryLabel: "",
  heroDescriptionOne: "",
  heroDescriptionTwo: "",
  priceLabel: "",

  aboutTitle: "",
  aboutParagraphOne: "",
  aboutParagraphTwo: "",

  audienceTitle: "",
  relatedTitle: "",

  seoTitle: "",
  seoDescription: "",
};

const initialForm: EditProductFormState = {
  slug: "",
  status: "published",

  categoryId: "",

  badge: "New",
  price: 0,
  currency: "DZD",

  rating: 4.5,
  downloads: 0,

  mainImageFile: null,
  mainImageUrl: "",
  mainImagePublicId: "",

  thumbnailOneFile: null,
  thumbnailOneUrl: "",
  thumbnailOnePublicId: "",

  thumbnailTwoFile: null,
  thumbnailTwoUrl: "",
  thumbnailTwoPublicId: "",

  thumbnailThreeFile: null,
  thumbnailThreeUrl: "",
  thumbnailThreePublicId: "",

  aboutImageOneFile: null,
  aboutImageOneUrl: "",
  aboutImageOnePublicId: "",

  aboutImageTwoFile: null,
  aboutImageTwoUrl: "",
  aboutImageTwoPublicId: "",

  features: [],
  audienceItems: [],

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

const normalizeLocalizedContent = (
  content?: Partial<LocalizedProductContent>
): LocalizedProductContent => ({
  title: content?.title || "",
  categoryLabel: content?.categoryLabel || "",
  heroDescriptionOne: content?.heroDescriptionOne || "",
  heroDescriptionTwo: content?.heroDescriptionTwo || "",
  priceLabel: content?.priceLabel || "",

  aboutTitle: content?.aboutTitle || "",
  aboutParagraphOne: content?.aboutParagraphOne || "",
  aboutParagraphTwo: content?.aboutParagraphTwo || "",

  audienceTitle: content?.audienceTitle || "",
  relatedTitle: content?.relatedTitle || "",

  seoTitle: content?.seoTitle || "",
  seoDescription: content?.seoDescription || "",
});

const mergeLocalizedArrays = (
  enItems: string[] = [],
  arItems: string[] = []
): LocalizedItem[] => {
  const length = Math.max(enItems.length, arItems.length);

  return Array.from({ length }).map((_, index) => ({
    en: enItems[index] || "",
    ar: arItems[index] || "",
  }));
};

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<EditProductFormState>(initialForm);
  const [editorLang, setEditorLang] = useState<Lang>("en");

  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentContent = form[editorLang];

  const mainPreview = usePreview(form.mainImageFile, form.mainImageUrl);
  const thumbOnePreview = usePreview(
    form.thumbnailOneFile,
    form.thumbnailOneUrl
  );
  const thumbTwoPreview = usePreview(
    form.thumbnailTwoFile,
    form.thumbnailTwoUrl
  );
  const thumbThreePreview = usePreview(
    form.thumbnailThreeFile,
    form.thumbnailThreeUrl
  );
  const aboutOnePreview = usePreview(
    form.aboutImageOneFile,
    form.aboutImageOneUrl
  );
  const aboutTwoPreview = usePreview(
    form.aboutImageTwoFile,
    form.aboutImageTwoUrl
  );

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId
  );

  const loadCategories = async () => {
    const categoriesQuery = query(
      collection(db, "productCategories"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(categoriesQuery);

    const data = snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<CategoryItem, "id">),
    }));

    setCategories(data);
  };

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setErrorMessage(
          isArabic ? "لم يتم العثور على معرف المنتج." : "Product ID not found."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        await loadCategories();

        const productRef = doc(db, "products", id);
        const productSnapshot = await getDoc(productRef);

        if (!productSnapshot.exists()) {
          setErrorMessage(
            isArabic
              ? "هذا المنتج غير موجود."
              : "This product does not exist."
          );
          setLoading(false);
          return;
        }

        const data = productSnapshot.data();

        const galleryImages: GalleryImageItem[] = Array.isArray(
          data.galleryImages
        )
          ? data.galleryImages
          : [];

        setForm({
          slug: data.slug || "",
          status: data.status || "published",

          categoryId: data.categoryId || "",

          badge: data.badge || "New",
          price: Number(data.price || 0),
          currency: data.currency || "DZD",

          rating: Number(data.rating || 4.5),
          downloads: Number(data.downloads || 0),

          mainImageFile: null,
          mainImageUrl: data.mainImageUrl || galleryImages[0]?.url || "",
          mainImagePublicId:
            data.mainImagePublicId || galleryImages[0]?.publicId || "",

          thumbnailOneFile: null,
          thumbnailOneUrl: galleryImages[1]?.url || "",
          thumbnailOnePublicId: galleryImages[1]?.publicId || "",

          thumbnailTwoFile: null,
          thumbnailTwoUrl: galleryImages[2]?.url || "",
          thumbnailTwoPublicId: galleryImages[2]?.publicId || "",

          thumbnailThreeFile: null,
          thumbnailThreeUrl: galleryImages[3]?.url || "",
          thumbnailThreePublicId: galleryImages[3]?.publicId || "",

          aboutImageOneFile: null,
          aboutImageOneUrl: data.aboutImageOneUrl || "",
          aboutImageOnePublicId: data.aboutImageOnePublicId || "",

          aboutImageTwoFile: null,
          aboutImageTwoUrl: data.aboutImageTwoUrl || "",
          aboutImageTwoPublicId: data.aboutImageTwoPublicId || "",

          features: mergeLocalizedArrays(
            Array.isArray(data.en?.features) ? data.en.features : [],
            Array.isArray(data.ar?.features) ? data.ar.features : []
          ),

          audienceItems: mergeLocalizedArrays(
            Array.isArray(data.en?.audienceItems) ? data.en.audienceItems : [],
            Array.isArray(data.ar?.audienceItems)
              ? data.ar.audienceItems
              : []
          ),

          en: normalizeLocalizedContent(data.en),
          ar: normalizeLocalizedContent(data.ar),
        });
      } catch (error) {
        console.error(error);
        setErrorMessage(
          isArabic
            ? "حدث خطأ أثناء تحميل المنتج."
            : "Something went wrong while loading the product."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isArabic]);

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

  const updateRoot = <K extends keyof EditProductFormState>(
    key: K,
    value: EditProductFormState[K]
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

    if (!form.mainImageFile && !form.mainImageUrl) {
      return isArabic
        ? "يرجى اختيار صورة المنتج الرئيسية."
        : "Please choose the main product image.";
    }

    return "";
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

  const handleUpdateProduct = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!id) {
      setErrorMessage(
        isArabic ? "لم يتم العثور على معرف المنتج." : "Product ID not found."
      );
      return;
    }

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
        uploadedMainImage,
        uploadedThumbnailOne,
        uploadedThumbnailTwo,
        uploadedThumbnailThree,
        uploadedAboutImageOne,
        uploadedAboutImageTwo,
      ] = await Promise.all([
        form.mainImageFile ? uploadImageToCloudinary(form.mainImageFile) : null,
        optionalUpload(form.thumbnailOneFile),
        optionalUpload(form.thumbnailTwoFile),
        optionalUpload(form.thumbnailThreeFile),
        optionalUpload(form.aboutImageOneFile),
        optionalUpload(form.aboutImageTwoFile),
      ]);

      const mainImage = {
        url: uploadedMainImage?.url || form.mainImageUrl || "",
        publicId:
          uploadedMainImage?.publicId || form.mainImagePublicId || "",
      };

      const thumbnailOne = {
        url: uploadedThumbnailOne?.url || form.thumbnailOneUrl || "",
        publicId:
          uploadedThumbnailOne?.publicId || form.thumbnailOnePublicId || "",
      };

      const thumbnailTwo = {
        url: uploadedThumbnailTwo?.url || form.thumbnailTwoUrl || "",
        publicId:
          uploadedThumbnailTwo?.publicId || form.thumbnailTwoPublicId || "",
      };

      const thumbnailThree = {
        url: uploadedThumbnailThree?.url || form.thumbnailThreeUrl || "",
        publicId:
          uploadedThumbnailThree?.publicId || form.thumbnailThreePublicId || "",
      };

      const galleryImages = [
        mainImage,
        thumbnailOne,
        thumbnailTwo,
        thumbnailThree,
      ].filter((image) => image.url);

      const aboutImageOne = {
        url: uploadedAboutImageOne?.url || form.aboutImageOneUrl || "",
        publicId:
          uploadedAboutImageOne?.publicId || form.aboutImageOnePublicId || "",
      };

      const aboutImageTwo = {
        url: uploadedAboutImageTwo?.url || form.aboutImageTwoUrl || "",
        publicId:
          uploadedAboutImageTwo?.publicId || form.aboutImageTwoPublicId || "",
      };

      const category = categories.find((item) => item.id === form.categoryId);

      const payload = {
        page: "productDetail",

        slug: form.slug.trim(),
        status: form.status,

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
        priceText:
          form.en.priceLabel.trim() || formatPrice(form.price, form.currency),
        currency: form.currency.trim() || "DZD",
        isFree: Number(form.price || 0) === 0,

        mainImageUrl: mainImage.url,
        mainImagePublicId: mainImage.publicId,

        galleryImages,

        aboutImageOneUrl: aboutImageOne.url,
        aboutImageOnePublicId: aboutImageOne.publicId,

        aboutImageTwoUrl: aboutImageTwo.url,
        aboutImageTwoPublicId: aboutImageTwo.publicId,

        en: buildLocalizedPayload("en"),
        ar: buildLocalizedPayload("ar"),

        updatedAt: serverTimestamp(),
        publishedAt: form.status === "published" ? serverTimestamp() : null,
      };

      await updateDoc(doc(db, "products", id), payload);

      setSuccessMessage(
        isArabic ? "تم تعديل المنتج بنجاح." : "Product updated successfully."
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء تعديل المنتج."
          : "Something went wrong while updating the product."
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
              {isArabic ? "جاري تحميل المنتج..." : "Loading product..."}
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
            <p className="text-sm font-semibold text-red-600">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => navigate("/products")}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {isArabic ? "العودة إلى المنتجات" : "Back to products"}
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
            {isArabic ? "تعديل المنتج" : "Edit Product"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "هذه الصفحة تعدل نفس المنتج الذي اخترته من قائمة المنتجات."
              : "This page updates the exact product selected from the products list."}
          </p>
        </div>

        <Link
          to="/products"
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          {isArabic ? "العودة إلى المنتجات" : "Back to products"}
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
        <form onSubmit={handleUpdateProduct} className="space-y-8">
          <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-gray-100 bg-white px-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Product Detail CMS
                </span>

                <p className="mt-2 text-sm text-gray-500">
                  {isArabic
                    ? "يمكنك تعديل النصوص والصور والتصنيف والحالة الخاصة بهذا المنتج."
                    : "You can update texts, images, category, and status for this product."}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {isArabic ? "الحالة" : "Status"}
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateRoot(
                      "status",
                      event.target.value as EditProductFormState["status"]
                    )
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
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
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

              <AdminInput
                label={isArabic ? "التقييم" : "Rating"}
                type="number"
                value={String(form.rating)}
                onChange={(value) => updateRoot("rating", Number(value || 0))}
              />

              <AdminInput
                label={isArabic ? "عدد التحميلات" : "Downloads"}
                type="number"
                value={String(form.downloads)}
                onChange={(value) =>
                  updateRoot("downloads", Number(value || 0))
                }
              />
            </div>

            <button
              type="button"
              onClick={syncPriceLabels}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {isArabic ? "تعبئة نص السعر" : "Sync price label"}
            </button>
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
                title={
                  editorLang === "ar" ? "مميزات المنتج" : "Product Features"
                }
                subtitle={
                  editorLang === "ar"
                    ? "أضف المميزات التي تظهر تحت وصف المنتج."
                    : "Add feature rows shown under the product description."
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