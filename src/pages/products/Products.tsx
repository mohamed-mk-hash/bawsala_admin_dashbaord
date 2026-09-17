import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";

import { db } from "../../firebase";
import { Card } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

type ProductStatus = "draft" | "published" | "archived";

interface LocalizedProductContent {
  title?: string;
  categoryLabel?: string;
  heroDescriptionOne?: string;
  heroDescriptionTwo?: string;
  priceLabel?: string;
  aboutTitle?: string;
  aboutParagraphOne?: string;
  aboutParagraphTwo?: string;
  audienceTitle?: string;
  relatedTitle?: string;
  seoTitle?: string;
  seoDescription?: string;
  features?: string[];
  audienceItems?: string[];
}

interface ProductItem {
  id: string;
  slug?: string;
  status?: ProductStatus;

  categoryId?: string;
  categorySlug?: string;
  categoryName?: {
    en?: string;
    ar?: string;
  };

  badge?: string;
  rating?: number;
  downloads?: number;
  price?: number;
  priceText?: string;
  currency?: string;
  isFree?: boolean;

  mainImageUrl?: string;
  mainImagePublicId?: string;

  galleryImages?: {
    url: string;
    publicId: string;
  }[];

  aboutImageOneUrl?: string;
  aboutImageTwoUrl?: string;

  en?: LocalizedProductContent;
  ar?: LocalizedProductContent;
}

const ADD_PRODUCT_PATH = "/products/add";
const EDIT_PRODUCT_PATH = "/products/edit";

export default function Products() {
  const { isArabic } = useLanguage();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>(
    "all"
  );

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const productsQuery = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(productsQuery);

      const productsData = snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<ProductItem, "id">),
      }));

      setProducts(productsData);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        isArabic
          ? "حدث خطأ أثناء تحميل المنتجات."
          : "Something went wrong while loading products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const titleEn = product.en?.title || "";
      const titleAr = product.ar?.title || "";
      const slug = product.slug || "";
      const categoryEn =
        product.categoryName?.en || product.en?.categoryLabel || "";
      const categoryAr =
        product.categoryName?.ar || product.ar?.categoryLabel || "";

      const matchesSearch =
        !normalizedSearch ||
        titleEn.toLowerCase().includes(normalizedSearch) ||
        titleAr.toLowerCase().includes(normalizedSearch) ||
        slug.toLowerCase().includes(normalizedSearch) ||
        categoryEn.toLowerCase().includes(normalizedSearch) ||
        categoryAr.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const showTemporaryMessage = (
    type: "success" | "error",
    message: string
  ) => {
    if (type === "success") {
      setSuccessMessage(message);
      setErrorMessage("");
    } else {
      setErrorMessage(message);
      setSuccessMessage("");
    }

    window.setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 4500);
  };

  const handleDeleteProduct = async (product: ProductItem) => {
    const productTitle =
      product[isArabic ? "ar" : "en"]?.title ||
      product.en?.title ||
      product.ar?.title ||
      product.slug ||
      "this product";

    const confirmed = window.confirm(
      isArabic
        ? `هل أنت متأكد أنك تريد حذف المنتج: ${productTitle}؟`
        : `Are you sure you want to delete: ${productTitle}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);

      await deleteDoc(doc(db, "products", product.id));

      setProducts((previous) =>
        previous.filter((item) => item.id !== product.id)
      );

      showTemporaryMessage(
        "success",
        isArabic ? "تم حذف المنتج بنجاح." : "Product deleted successfully."
      );
    } catch (error) {
      console.error(error);
      showTemporaryMessage(
        "error",
        isArabic
          ? "حدث خطأ أثناء حذف المنتج."
          : "Something went wrong while deleting the product."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleStatusChange = async (
    productId: string,
    newStatus: ProductStatus
  ) => {
    try {
      setUpdatingId(productId);

      await updateDoc(doc(db, "products", productId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        publishedAt: newStatus === "published" ? serverTimestamp() : null,
      });

      setProducts((previous) =>
        previous.map((product) =>
          product.id === productId
            ? {
                ...product,
                status: newStatus,
              }
            : product
        )
      );

      showTemporaryMessage(
        "success",
        isArabic
          ? "تم تحديث حالة المنتج بنجاح."
          : "Product status updated successfully."
      );
    } catch (error) {
      console.error(error);
      showTemporaryMessage(
        "error",
        isArabic
          ? "حدث خطأ أثناء تحديث حالة المنتج."
          : "Something went wrong while updating the product status."
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isArabic ? "المنتجات" : "Products"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "هنا يمكنك عرض كل المنتجات، تعديلها، حذفها، أو إضافة منتج جديد."
              : "Here you can view, update, delete, or add new products."}
          </p>
        </div>

        <Link
          to={ADD_PRODUCT_PATH}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + {isArabic ? "إضافة منتج" : "Add Product"}
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
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {isArabic ? "البحث" : "Search"}
            </label>

            <input
              type="text"
              value={searchTerm}
              placeholder={
                isArabic
                  ? "ابحث بالعنوان أو التصنيف أو slug..."
                  : "Search by title, category, or slug..."
              }
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full lg:max-w-xs">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {isArabic ? "فلترة حسب الحالة" : "Filter by status"}
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | ProductStatus)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isArabic ? "الكل" : "All"}</option>
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

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-600">
              {isArabic ? "جاري تحميل المنتجات..." : "Loading products..."}
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-700">
              {isArabic ? "لا توجد منتجات حاليا." : "No products found."}
            </p>

            <Link
              to={ADD_PRODUCT_PATH}
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + {isArabic ? "إضافة منتج" : "Add Product"}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="hidden grid-cols-[90px_1.4fr_1fr_130px_150px_260px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 xl:grid">
              <div>{isArabic ? "الصورة" : "Image"}</div>
              <div>{isArabic ? "المنتج" : "Product"}</div>
              <div>{isArabic ? "التصنيف" : "Category"}</div>
              <div>{isArabic ? "السعر" : "Price"}</div>
              <div>{isArabic ? "الحالة" : "Status"}</div>
              <div className="text-center">
                {isArabic ? "الإجراءات" : "Actions"}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const localizedContent = isArabic ? product.ar : product.en;

                const productTitle =
                  localizedContent?.title ||
                  product.en?.title ||
                  product.ar?.title ||
                  (isArabic ? "بدون عنوان" : "Untitled product");

                const productDescription =
                  localizedContent?.heroDescriptionOne ||
                  product.en?.heroDescriptionOne ||
                  product.ar?.heroDescriptionOne ||
                  "";

                const categoryLabel =
                  product.categoryName?.[isArabic ? "ar" : "en"] ||
                  localizedContent?.categoryLabel ||
                  product.en?.categoryLabel ||
                  product.ar?.categoryLabel ||
                  "-";

                const priceLabel =
                  localizedContent?.priceLabel ||
                  product.priceText ||
                  String(product.price || "-");

                return (
                  <div
                    key={product.id}
                    className="grid grid-cols-1 gap-4 px-4 py-4 transition hover:bg-gray-50 xl:grid-cols-[90px_1.4fr_1fr_130px_150px_260px] xl:items-center"
                  >
                    <div>
                      {product.mainImageUrl ? (
                        <img
                          src={product.mainImageUrl}
                          alt={productTitle}
                          className="h-20 w-24 rounded-lg object-cover xl:h-16 xl:w-20"
                        />
                      ) : (
                        <div className="flex h-20 w-24 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-400 xl:h-16 xl:w-20">
                          {isArabic ? "لا صورة" : "No image"}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {productTitle}
                      </h3>

                      {productDescription && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">
                          {productDescription}
                        </p>
                      )}

                      <p className="mt-2 break-all rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 xl:hidden">
                        {product.slug || "-"}
                      </p>

                      <div className="mt-2 xl:hidden">
                        <StatusBadge status={product.status || "published"} />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {categoryLabel}
                      </p>
                      <p className="mt-1 break-all text-xs text-gray-400">
                        {product.slug || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                        {priceLabel}
                      </p>
                    </div>

                    <div className="hidden xl:block">
                      <StatusBadge status={product.status || "published"} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-center">
                      <select
                        value={product.status || "published"}
                        disabled={updatingId === product.id}
                        onChange={(event) =>
                          handleStatusChange(
                            product.id,
                            event.target.value as ProductStatus
                          )
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="draft">
                          {isArabic ? "مسودة" : "Draft"}
                        </option>
                        <option value="published">
                          {isArabic ? "منشور" : "Published"}
                        </option>
                        <option value="archived">
                          {isArabic ? "مؤرشف" : "Archived"}
                        </option>
                      </select>

                      <Link
                        to={`${EDIT_PRODUCT_PATH}/${product.id}`}
                        className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                      >
                        {isArabic ? "تعديل" : "Update"}
                      </Link>

                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => handleDeleteProduct(product)}
                        className="rounded-lg border border-red-600 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === product.id
                          ? isArabic
                            ? "حذف..."
                            : "Deleting..."
                          : isArabic
                          ? "حذف"
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const statusClasses: Record<ProductStatus, string> = {
    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
    published: "bg-green-50 text-green-700 border-green-200",
    archived: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const statusLabel: Record<ProductStatus, string> = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}