import React, { useEffect, useMemo, useState } from "react";
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

type CourseStatus = "draft" | "published" | "archived";

interface LocalizedCourseContent {
  title?: string;
  subtitle?: string;
  cardTitle?: string;
  cardShortDescription?: string;
  courseTypeLabel?: string;
  level?: string;
  instructorLabel?: string;
  instructorName?: string;
  duration?: string;
  workload?: string;
  priceLabel?: string;
  oldPriceLabel?: string;
  registerButtonText?: string;
  addToCartText?: string;
  catalogTitle?: string;
  catalogDescription?: string;
  dateLabel?: string;
  dateValue?: string;
  scheduleLabel?: string;
  scheduleValue?: string;
  formatLabel?: string;
  formatValue?: string;
  aboutTab?: string;
  programmeTab?: string;
  instructorTab?: string;
  reviewsTab?: string;
  reviewsTitle?: string;
  aboutText?: string;
  learningTitle?: string;
  requirementsTitle?: string;
  programmeTitle?: string;
  instructorSectionTitle?: string;
  instructorRole?: string;
  instructorBio?: string;
  audienceTitle?: string;
  relatedTitle?: string;
  relatedDescription?: string;
  relatedButtonText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface CourseItem {
  id: string;
  slug?: string;
  status?: CourseStatus;

  categoryId?: string;
  categorySlug?: string;
  categoryName?: {
    en?: string;
    ar?: string;
  };

  badgeColor?: "purple" | "blue" | "pink";

  price?: number;
  priceText?: string;
  currency?: string;
  isFree?: boolean;

  featuredImageUrl?: string;
  instructorAvatarUrl?: string;
  videoImageUrl?: string;
  catalogImageUrl?: string;
  instructorFeaturedUrl?: string;

  en?: LocalizedCourseContent;
  ar?: LocalizedCourseContent;
}

const ADD_COURSE_PATH = "/addcourse";
const EDIT_COURSE_PATH = "/courses/edit";

export default function Courses() {
  const { isArabic } = useLanguage();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CourseStatus>("all");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCourses = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const coursesQuery = query(
        collection(db, "courses"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(coursesQuery);

      const coursesData = snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<CourseItem, "id">),
      }));

      setCourses(coursesData);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        isArabic
          ? "حدث خطأ أثناء تحميل الكورسات."
          : "Something went wrong while loading courses."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      const titleEn = course.en?.title || "";
      const titleAr = course.ar?.title || "";
      const slug = course.slug || "";
      const categoryEn = course.categoryName?.en || "";
      const categoryAr = course.categoryName?.ar || "";
      const instructorEn = course.en?.instructorName || "";
      const instructorAr = course.ar?.instructorName || "";

      const matchesSearch =
        !normalizedSearch ||
        titleEn.toLowerCase().includes(normalizedSearch) ||
        titleAr.toLowerCase().includes(normalizedSearch) ||
        slug.toLowerCase().includes(normalizedSearch) ||
        categoryEn.toLowerCase().includes(normalizedSearch) ||
        categoryAr.toLowerCase().includes(normalizedSearch) ||
        instructorEn.toLowerCase().includes(normalizedSearch) ||
        instructorAr.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || course.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [courses, searchTerm, statusFilter]);

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

  const handleDeleteCourse = async (course: CourseItem) => {
    const courseTitle =
      course[isArabic ? "ar" : "en"]?.title ||
      course.en?.title ||
      course.ar?.title ||
      course.slug ||
      "this course";

    const confirmed = window.confirm(
      isArabic
        ? `هل أنت متأكد أنك تريد حذف الكورس: ${courseTitle}؟`
        : `Are you sure you want to delete: ${courseTitle}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(course.id);

      await deleteDoc(doc(db, "courses", course.id));

      setCourses((previous) =>
        previous.filter((item) => item.id !== course.id)
      );

      showTemporaryMessage(
        "success",
        isArabic ? "تم حذف الكورس بنجاح." : "Course deleted successfully."
      );
    } catch (error) {
      console.error(error);
      showTemporaryMessage(
        "error",
        isArabic
          ? "حدث خطأ أثناء حذف الكورس."
          : "Something went wrong while deleting the course."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleStatusChange = async (
    courseId: string,
    newStatus: CourseStatus
  ) => {
    try {
      setUpdatingId(courseId);

      await updateDoc(doc(db, "courses", courseId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        publishedAt: newStatus === "published" ? serverTimestamp() : null,
      });

      setCourses((previous) =>
        previous.map((course) =>
          course.id === courseId
            ? {
                ...course,
                status: newStatus,
              }
            : course
        )
      );

      showTemporaryMessage(
        "success",
        isArabic
          ? "تم تحديث حالة الكورس بنجاح."
          : "Course status updated successfully."
      );
    } catch (error) {
      console.error(error);
      showTemporaryMessage(
        "error",
        isArabic
          ? "حدث خطأ أثناء تحديث حالة الكورس."
          : "Something went wrong while updating the course status."
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
            {isArabic ? "الكورسات" : "Courses"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {isArabic
              ? "هنا يمكنك عرض كل الكورسات، تعديلها، حذفها، أو إضافة كورس جديد."
              : "Here you can view, update, delete, or add new courses."}
          </p>
        </div>

        <Link
          to={ADD_COURSE_PATH}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + {isArabic ? "إضافة كورس" : "Add Course"}
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
                  ? "ابحث بالعنوان أو التصنيف أو المدرب أو slug..."
                  : "Search by title, category, instructor, or slug..."
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
                setStatusFilter(event.target.value as "all" | CourseStatus)
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
              {isArabic ? "جاري تحميل الكورسات..." : "Loading courses..."}
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-gray-700">
              {isArabic ? "لا توجد كورسات حاليا." : "No courses found."}
            </p>

            <Link
              to={ADD_COURSE_PATH}
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + {isArabic ? "إضافة كورس" : "Add Course"}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="hidden grid-cols-[90px_1.4fr_1fr_130px_150px_260px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 xl:grid">
              <div>{isArabic ? "الصورة" : "Image"}</div>
              <div>{isArabic ? "الكورس" : "Course"}</div>
              <div>{isArabic ? "التصنيف" : "Category"}</div>
              <div>{isArabic ? "السعر" : "Price"}</div>
              <div>{isArabic ? "الحالة" : "Status"}</div>
              <div className="text-center">
                {isArabic ? "الإجراءات" : "Actions"}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredCourses.map((course) => {
                const localizedContent = isArabic ? course.ar : course.en;

                const courseTitle =
                  localizedContent?.title ||
                  course.en?.title ||
                  course.ar?.title ||
                  (isArabic ? "بدون عنوان" : "Untitled course");

                const courseDescription =
                  localizedContent?.subtitle ||
                  course.en?.subtitle ||
                  course.ar?.subtitle ||
                  localizedContent?.cardShortDescription ||
                  "";

                const categoryLabel =
                  course.categoryName?.[isArabic ? "ar" : "en"] ||
                  course.categoryName?.en ||
                  course.categoryName?.ar ||
                  "-";

                const priceLabel =
                  localizedContent?.priceLabel ||
                  course.priceText ||
                  String(course.price || "-");

                return (
                  <div
                    key={course.id}
                    className="grid grid-cols-1 gap-4 px-4 py-4 transition hover:bg-gray-50 xl:grid-cols-[90px_1.4fr_1fr_130px_150px_260px] xl:items-center"
                  >
                    <div>
                      {course.featuredImageUrl ? (
                        <img
                          src={course.featuredImageUrl}
                          alt={courseTitle}
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
                        {courseTitle}
                      </h3>

                      {courseDescription && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">
                          {courseDescription}
                        </p>
                      )}

                      <p className="mt-2 break-all rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 xl:hidden">
                        {course.slug || "-"}
                      </p>

                      <div className="mt-2 xl:hidden">
                        <StatusBadge status={course.status || "draft"} />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {categoryLabel}
                      </p>
                      <p className="mt-1 break-all text-xs text-gray-400">
                        {course.slug || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                        {priceLabel}
                      </p>
                    </div>

                    <div className="hidden xl:block">
                      <StatusBadge status={course.status || "draft"} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-center">
                      <select
                        value={course.status || "draft"}
                        disabled={updatingId === course.id}
                        onChange={(event) =>
                          handleStatusChange(
                            course.id,
                            event.target.value as CourseStatus
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
                        to={`${EDIT_COURSE_PATH}/${course.id}`}
                        className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                      >
                        {isArabic ? "تعديل" : "Update"}
                      </Link>

                      <button
                        type="button"
                        disabled={deletingId === course.id}
                        onClick={() => handleDeleteCourse(course)}
                        className="rounded-lg border border-red-600 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === course.id
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

function StatusBadge({ status }: { status: CourseStatus }) {
  const statusClasses: Record<CourseStatus, string> = {
    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
    published: "bg-green-50 text-green-700 border-green-200",
    archived: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const statusLabel: Record<CourseStatus, string> = {
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