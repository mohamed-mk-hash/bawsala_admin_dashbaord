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

type ServiceStatus = "draft" | "published" | "archived";

interface LocalizedServiceContent {
  breadcrumbTitle?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroButtonText?: string;
  benefitsTitle?: string;
  guidesTitle?: string;
  guidesDescription?: string;
  templatesTitle?: string;
  templatesDescription?: string;
  requestLabel?: string;
  requestTitle?: string;
  requestDescription?: string;
  requestButtonText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface ServiceItem {
  id: string;
  slug?: string;
  status?: ServiceStatus;
  heroBackgroundUrl?: string;
  requestImageUrl?: string;
  en?: LocalizedServiceContent;
  ar?: LocalizedServiceContent;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const ADD_SERVICE_PATH = "/addservice";
const EDIT_SERVICE_PATH = "edit";

export default function Service() {
  const { isArabic } = useLanguage();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadServices = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const servicesQuery = query(
        collection(db, "services"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(servicesQuery);

      const servicesData = snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<ServiceItem, "id">),
      }));

      setServices(servicesData);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        isArabic
          ? "حدث خطأ أثناء تحميل الخدمات."
          : "Something went wrong while loading services."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return services.filter((service) => {
      const titleEn = service.en?.heroTitle || "";
      const titleAr = service.ar?.heroTitle || "";
      const slug = service.slug || "";

      const matchesSearch =
        !normalizedSearch ||
        titleEn.toLowerCase().includes(normalizedSearch) ||
        titleAr.toLowerCase().includes(normalizedSearch) ||
        slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || service.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, statusFilter]);

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

  const handleDeleteService = async (service: ServiceItem) => {
    const serviceTitle =
      service[isArabic ? "ar" : "en"]?.heroTitle ||
      service.en?.heroTitle ||
      service.ar?.heroTitle ||
      service.slug ||
      "this service";

    const confirmed = window.confirm(
      isArabic
        ? `هل أنت متأكد أنك تريد حذف الخدمة: ${serviceTitle}؟`
        : `Are you sure you want to delete: ${serviceTitle}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(service.id);

      await deleteDoc(doc(db, "services", service.id));

      setServices((previous) =>
        previous.filter((item) => item.id !== service.id)
      );

      showTemporaryMessage(
        "success",
        isArabic ? "تم حذف الخدمة بنجاح." : "Service deleted successfully."
      );
    } catch (error) {
      console.error(error);
      showTemporaryMessage(
        "error",
        isArabic
          ? "حدث خطأ أثناء حذف الخدمة."
          : "Something went wrong while deleting the service."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleStatusChange = async (
    serviceId: string,
    newStatus: ServiceStatus
  ) => {
    try {
      setUpdatingId(serviceId);

      await updateDoc(doc(db, "services", serviceId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        publishedAt: newStatus === "published" ? serverTimestamp() : null,
      });

      setServices((previous) =>
        previous.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                status: newStatus,
              }
            : service
        )
      );

      showTemporaryMessage(
        "success",
        isArabic
          ? "تم تحديث حالة الخدمة بنجاح."
          : "Service status updated successfully."
      );
    } catch (error) {
      console.error(error);
      showTemporaryMessage(
        "error",
        isArabic
          ? "حدث خطأ أثناء تحديث حالة الخدمة."
          : "Something went wrong while updating the service status."
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
            {isArabic ? "الخدمات" : "Services"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "هنا يمكنك عرض كل الخدمات، تعديلها، حذفها، أو إضافة خدمة جديدة."
              : "Here you can view, update, delete, or add new services."}
          </p>
        </div>

        <Link
          to={ADD_SERVICE_PATH}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + {isArabic ? "إضافة خدمة" : "Add Service"}
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
                  ? "ابحث بالعنوان أو slug..."
                  : "Search by title or slug..."
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
                setStatusFilter(event.target.value as "all" | ServiceStatus)
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
              {isArabic ? "جاري تحميل الخدمات..." : "Loading services..."}
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-700">
              {isArabic ? "لا توجد خدمات حاليا." : "No services found."}
            </p>

            <Link
              to={ADD_SERVICE_PATH}
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + {isArabic ? "إضافة خدمة" : "Add Service"}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="hidden grid-cols-[90px_1.5fr_1fr_160px_260px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 lg:grid">
              <div>{isArabic ? "الصورة" : "Image"}</div>
              <div>{isArabic ? "الخدمة" : "Service"}</div>
              <div>Slug</div>
              <div>{isArabic ? "الحالة" : "Status"}</div>
              <div className="text-center">
                {isArabic ? "الإجراءات" : "Actions"}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredServices.map((service) => {
                const localizedContent = isArabic ? service.ar : service.en;

               
const serviceTitle =
  localizedContent?.heroTitle ||
  service.en?.heroTitle ||
  service.ar?.heroTitle ||
  (isArabic ? "بدون عنوان" : "Untitled service");

                const serviceDescription =
                  localizedContent?.heroDescription ||
                  service.en?.heroDescription ||
                  service.ar?.heroDescription ||
                  "";

                return (
                  <div
                    key={service.id}
                    className="grid grid-cols-1 gap-4 px-4 py-4 transition hover:bg-gray-50 lg:grid-cols-[90px_1.5fr_1fr_160px_260px] lg:items-center"
                  >
                    <div>
                      {service.heroBackgroundUrl ? (
                        <img
                          src={service.heroBackgroundUrl}
                          alt={serviceTitle}
                          className="h-20 w-24 rounded-lg object-cover lg:h-16 lg:w-20"
                        />
                      ) : (
                        <div className="flex h-20 w-24 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-400 lg:h-16 lg:w-20">
                          {isArabic ? "لا صورة" : "No image"}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {serviceTitle}
                      </h3>

                      {serviceDescription && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">
                          {serviceDescription}
                        </p>
                      )}

                      <div className="mt-2 lg:hidden">
                        <StatusBadge status={service.status || "draft"} />
                      </div>
                    </div>

                    <div>
                      <p className="break-all rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600">
                        {service.slug || "-"}
                      </p>
                    </div>

                    <div className="hidden lg:block">
                      <StatusBadge status={service.status || "draft"} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-center">
                      <select
                        value={service.status || "draft"}
                        disabled={updatingId === service.id}
                        onChange={(event) =>
                          handleStatusChange(
                            service.id,
                            event.target.value as ServiceStatus
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
                        to={`${EDIT_SERVICE_PATH}/${service.id}`}
                        className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                      >
                        {isArabic ? "تعديل" : "Update"}
                      </Link>

                      <button
                        type="button"
                        disabled={deletingId === service.id}
                        onClick={() => handleDeleteService(service)}
                        className="rounded-lg border border-red-600 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === service.id
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

function StatusBadge({ status }: { status: ServiceStatus }) {
  const statusClasses: Record<ServiceStatus, string> = {
    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
    published: "bg-green-50 text-green-700 border-green-200",
    archived: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const statusLabel: Record<ServiceStatus, string> = {
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