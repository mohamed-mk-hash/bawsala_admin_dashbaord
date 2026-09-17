const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      process.env.DASHBOARD_URL,
    ].filter(Boolean),
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5001;

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getLocalizedBlog(blog, language = "en") {
  return blog?.[language] || blog?.en || blog?.ar || {};
}

function getBlogUrl(blog) {
  const siteUrl = process.env.PUBLIC_SITE_URL || "http://localhost:5173";
  const slug = blog.slug || blog.en?.slug || blog.ar?.slug || "";
  return `${siteUrl.replace(/\/$/, "")}/blog/${slug}`;
}

function requireAdminApiKey(req, res, next) {
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return next();
  }

  const receivedKey = req.headers["x-admin-api-key"];

  if (receivedKey !== expectedKey) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized newsletter request.",
    });
  }

  return next();
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Bawsala dashboard backend is running.",
  });
});

app.post("/api/blogs/send-newsletter", requireAdminApiKey, async (req, res) => {
  try {
    const { blogId } = req.body;

    if (!blogId) {
      return res.status(400).json({
        ok: false,
        message: "Missing blogId.",
      });
    }

    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      return res.status(500).json({
        ok: false,
        message: "SMTP configuration is missing in .env.",
      });
    }

    const blogRef = db.collection("blogs").doc(blogId);
    const blogSnapshot = await blogRef.get();

    if (!blogSnapshot.exists) {
      return res.status(404).json({
        ok: false,
        message: "Blog not found.",
      });
    }

    const blog = {
      id: blogSnapshot.id,
      ...blogSnapshot.data(),
    };

    if (blog.status !== "published") {
      return res.status(400).json({
        ok: false,
        message: "Only published blogs can be sent to newsletter subscribers.",
      });
    }

    if (blog.newsletterSentAt) {
      return res.json({
        ok: true,
        skipped: true,
        message: "Newsletter was already sent for this blog.",
      });
    }

    const subscribersSnapshot = await db
      .collection("newsletterSubscribers")
      .where("subscribed", "==", true)
      .get();

    const subscribers = subscribersSnapshot.docs
      .map((subscriberDoc) => subscriberDoc.data())
      .filter((subscriber) => subscriber.email);

    if (subscribers.length === 0) {
      await blogRef.set(
        {
          newsletterSentAt: admin.firestore.FieldValue.serverTimestamp(),
          newsletterRecipientsCount: 0,
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        sent: 0,
        message: "No newsletter subscribers found.",
      });
    }

    const englishBlog = getLocalizedBlog(blog, "en");
    const arabicBlog = getLocalizedBlog(blog, "ar");
    const blogUrl = getBlogUrl(blog);

    const title = englishBlog.title || arabicBlog.title || "New Bawsala blog";
    const subtitle =
      englishBlog.subtitle ||
      englishBlog.seoDescription ||
      arabicBlog.subtitle ||
      arabicBlog.seoDescription ||
      "";

    const subject = `New from Bawsala: ${title}`;

    let sent = 0;
    let failed = 0;
    const failures = [];

    for (const subscriber of subscribers) {
      try {
        const preferredLanguage = subscriber.language === "ar" ? "ar" : "en";
        const localizedBlog =
          preferredLanguage === "ar" ? arabicBlog || englishBlog : englishBlog || arabicBlog;

        const localizedTitle = localizedBlog.title || title;
        const localizedSubtitle = localizedBlog.subtitle || subtitle;

        await emailTransporter.sendMail({
          from: `"Bawsala Newsletter" <${process.env.SMTP_USER}>`,
          to: subscriber.email,
          subject:
            preferredLanguage === "ar"
              ? `مقال جديد من بوصلة: ${localizedTitle}`
              : subject,
         html: `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#101828;">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:22px;padding:36px;border:1px solid #e5e7eb;box-shadow:0 18px 45px rgba(16,24,40,0.08);">
        <p style="margin:0 0 12px;color:#1570ef;font-size:14px;font-weight:700;">
          ${preferredLanguage === "ar" ? "مقال جديد من بوصلة" : "New from Bawsala"}
        </p>

        <h1 style="margin:0;font-size:28px;line-height:1.25;color:#101828;">
          ${localizedTitle}
        </h1>

        ${
          localizedSubtitle
            ? `<p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#667085;">${localizedSubtitle}</p>`
            : ""
        }

        <div style="margin-top:28px;">
          <a href="${blogUrl}" style="display:inline-block;background:#258cfb;color:#ffffff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
            ${preferredLanguage === "ar" ? "قراءة المقال" : "Read the article"}
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #eaecf0;margin:32px 0 20px;" />

        <p style="margin:0;font-size:13px;line-height:1.7;color:#98a2b3;">
          ${
            preferredLanguage === "ar"
              ? "تلقيت هذه الرسالة لأنك مشترك في نشرة بوصلة البريدية."
              : "You received this email because you subscribed to the Bawsala newsletter."
          }
        </p>
      </div>

      <p style="text-align:center;color:#98a2b3;font-size:12px;margin-top:18px;">
        © Bawsala
      </p>
    </div>
  </div>
`,
          text:
            preferredLanguage === "ar"
              ? `${localizedTitle}\n\n${localizedSubtitle}\n\nاقرأ المقال: ${blogUrl}`
              : `${localizedTitle}\n\n${localizedSubtitle}\n\nRead the article: ${blogUrl}`,
        });

        sent += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          email: subscriber.email,
          error: error?.message || "Unknown error",
        });
      }
    }

    await blogRef.set(
      {
        newsletterSentAt: admin.firestore.FieldValue.serverTimestamp(),
        newsletterRecipientsCount: sent,
        newsletterFailedCount: failed,
        newsletterFailures: failures.slice(0, 20),
      },
      { merge: true }
    );

    return res.json({
      ok: true,
      sent,
      failed,
      message: `Newsletter sent to ${sent} subscriber(s).`,
    });
  } catch (error) {
    console.error("Send blog newsletter error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "Could not send newsletter.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard backend running on http://localhost:${PORT}`);
});

