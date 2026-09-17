import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../../firebase";
import { Card } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

type Lang = "en" | "ar";
type BlogStatus = "draft" | "published" | "archived";

interface BlogCategoryName {
  en?: string;
  ar?: string;
}

interface BlogLocalizedContent {
  title?: string;
  subtitle?: string;
  authorName?: string;
  readTimeText?: string;
  publishedOnText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface BlogItem {
  id: string;
  slug?: string;
  status?: BlogStatus;
  category?: string;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: BlogCategoryName;
  tags?: string[];
  readTimeMinutes?: number;
  publishedDate?: any;
  createdAt?: any;
  updatedAt?: any;
  heroImageUrl?: string;
  contentImageUrl?: string;
  en?: BlogLocalizedContent;
  ar?: BlogLocalizedContent;
}

const formatDate = (value: any) => {
  if (!value) return "-";

  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
};

export default function Blog() {
  const { isArabic } = useLanguage();

  const lang: Lang = isArabic ? "ar" : "en";

  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const ui = {
    pageTitle: isArabic ? "إدارة المقالات" : "Manage Blogs",
    pageSubtitle: isArabic
      ? "اعرض كل المقالات، عدّلها، أو احذف المقالات غير المطلوبة."
      : "View all blogs, edit existing content, or delete old articles.",
    addBlog: isArabic ? "إضافة مقال جديد" : "Add New Blog",
    search: isArabic ? "ابحث عن مقال..." : "Search blogs...",
    all: isArabic ? "كل الحالات" : "All statuses",
    draft: isArabic ? "مسودة" : "Draft",
    published: isArabic ? "منشور" : "Published",
    archived: isArabic ? "مؤرشف" : "Archived",
    loading: isArabic ? "جاري تحميل المقالات..." : "Loading blogs...",
    empty: isArabic ? "لا توجد مقالات حالياً." : "No blogs found.",
    edit: isArabic ? "تعديل" : "Edit",
    delete: isArabic ? "حذف" : "Delete",
    deleting: isArabic ? "جاري الحذف..." : "Deleting...",
    status: isArabic ? "الحالة" : "Status",
    category: isArabic ? "التصنيف" : "Category",
    readTime: isArabic ? "مدة القراءة" : "Read time",
    publishedDate: isArabic ? "تاريخ النشر" : "Published date",
    slug: "Slug",
    confirmDelete: isArabic
      ? "هل أنت متأكد أنك تريد حذف هذا المقال؟"
      : "Are you sure you want to delete this blog?",
    deleted: isArabic ? "تم حذف المقال بنجاح." : "Blog deleted successfully.",
    loadError: isArabic
      ? "تعذر تحميل المقالات."
      : "Could not load blogs.",
    deleteError: isArabic
      ? "تعذر حذف المقال."
      : "Could not delete blog.",
  };

  const filteredBlogs = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return blogs.filter((blog) => {
      const localized = blog[lang] || blog.en || blog.ar || {};
      const title = localized.title || "";
      const subtitle = localized.subtitle || "";
      const slug = blog.slug || "";
      const category =
        blog.categoryName?.[lang] ||
        blog.categoryName?.en ||
        blog.category ||
        "";

      const matchesSearch =
        !cleanSearch ||
        title.toLowerCase().includes(cleanSearch) ||
        subtitle.toLowerCase().includes(cleanSearch) ||
        slug.toLowerCase().includes(cleanSearch) ||
        category.toLowerCase().includes(cleanSearch);

      const matchesStatus =
        statusFilter === "all" || blog.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [blogs, lang, search, statusFilter]);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError("");

      const blogsQuery = query(
        collection(db, "blogs"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(blogsQuery);

      const data = snapshot.docs.map((blogDoc) => ({
        id: blogDoc.id,
        ...(blogDoc.data() as Omit<BlogItem, "id">),
      }));

      setBlogs(data);
    } catch (err) {
      console.error(err);
      setError(ui.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (blogId: string) => {
    const confirmed = window.confirm(ui.confirmDelete);

    if (!confirmed) return;

    try {
      setDeletingId(blogId);
      setError("");
      setMessage("");

      await deleteDoc(doc(db, "blogs", blogId));

      setBlogs((previous) => previous.filter((blog) => blog.id !== blogId));
      setMessage(ui.deleted);
    } catch (err) {
      console.error(err);
      setError(ui.deleteError);
    } finally {
      setDeletingId("");

      window.setTimeout(() => {
        setMessage("");
        setError("");
      }, 4000);
    }
  };

  const goToAddBlog = () => {
    window.location.href = "/addblog";
  };

  const goToEditBlog = (blogId: string) => {
    window.location.href = `/editblog/${blogId}`;
  };

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
          onClick={goToAddBlog}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {ui.addBlog}
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={search}
              placeholder={ui.search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-[42px] flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-[42px] rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 lg:w-56"
            >
              <option value="all">{ui.all}</option>
              <option value="draft">{ui.draft}</option>
              <option value="published">{ui.published}</option>
              <option value="archived">{ui.archived}</option>
            </select>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm font-semibold text-gray-500">
              {ui.loading}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm font-semibold text-gray-500">
              {ui.empty}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredBlogs.map((blog) => {
                const localized = blog[lang] || blog.en || blog.ar || {};
                const title = localized.title || blog.slug || "Untitled";
                const subtitle = localized.subtitle || "";
                const category =
                  blog.categoryName?.[lang] ||
                  blog.categoryName?.en ||
                  blog.category ||
                  "-";

                return (
                  <article
                    key={blog.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]">
                      <div className="h-56 bg-gray-100 lg:h-full">
                        {blog.heroImageUrl ? (
                          <img
                            src={blog.heroImageUrl}
                            alt={title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                              {category}
                            </span>

                            <h2 className="mt-3 text-xl font-bold text-gray-900">
                              {title}
                            </h2>

                            {subtitle && (
                              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                                {subtitle}
                              </p>
                            )}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              blog.status === "published"
                                ? "bg-green-50 text-green-700"
                                : blog.status === "archived"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {blog.status === "published"
                              ? ui.published
                              : blog.status === "archived"
                              ? ui.archived
                              : ui.draft}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 lg:grid-cols-4">
                          <div>
                            <strong className="block text-xs text-gray-400">
                              {ui.slug}
                            </strong>
                            <span>{blog.slug || "-"}</span>
                          </div>

                          <div>
                            <strong className="block text-xs text-gray-400">
                              {ui.readTime}
                            </strong>
                            <span>{blog.readTimeMinutes || 0} min</span>
                          </div>

                          <div>
                            <strong className="block text-xs text-gray-400">
                              {ui.publishedDate}
                            </strong>
                            <span>{formatDate(blog.publishedDate)}</span>
                          </div>

                          <div>
                            <strong className="block text-xs text-gray-400">
                              {ui.status}
                            </strong>
                            <span>{blog.status || "draft"}</span>
                          </div>
                        </div>

                        {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {blog.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => goToEditBlog(blog.id)}
                            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                          >
                            {ui.edit}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(blog.id)}
                            disabled={deletingId === blog.id}
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === blog.id ? ui.deleting : ui.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
