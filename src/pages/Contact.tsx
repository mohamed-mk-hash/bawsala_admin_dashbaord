import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/Card';
import { useLanguage } from '../i18n/LanguageContext';

interface LocalizedText {
  en: string;
  ar: string;
}

interface ContactFormContent {
  title: LocalizedText;
  subtitle: LocalizedText;
  firstNameLabel: LocalizedText;
  firstNamePlaceholder: LocalizedText;
  lastNameLabel: LocalizedText;
  lastNamePlaceholder: LocalizedText;
  emailLabel: LocalizedText;
  emailPlaceholder: LocalizedText;
  phoneLabel: LocalizedText;
  phonePlaceholder: LocalizedText;
  countryCodeLabel: LocalizedText;
  messageLabel: LocalizedText;
  messagePlaceholder: LocalizedText;
  privacyText: LocalizedText;
  privacyLinkText: LocalizedText;
  privacyUrl: string;
  buttonText: LocalizedText;
  imageUrl: string;
}

interface ContactCard {
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  linkText: LocalizedText;
  linkUrl: string;
}

interface ContactInfoContent {
  kicker: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  cards: ContactCard[];
}

interface ContactContent {
  formSection: ContactFormContent;
  infoSection: ContactInfoContent;
}

type Tab = 'form' | 'info';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const defaultContactContent: ContactContent = {
  formSection: {
    title: {
      en: 'Get in touch',
      ar: 'تواصل معنا',
    },
    subtitle: {
      en: 'Our friendly team would love to hear from you.',
      ar: 'يسعد فريقنا الودود أن يسمع منك.',
    },
    firstNameLabel: {
      en: 'First name',
      ar: 'الاسم الأول',
    },
    firstNamePlaceholder: {
      en: 'First name',
      ar: 'الاسم الأول',
    },
    lastNameLabel: {
      en: 'Last name',
      ar: 'اللقب',
    },
    lastNamePlaceholder: {
      en: 'Last name',
      ar: 'اللقب',
    },
    emailLabel: {
      en: 'Email',
      ar: 'البريد الإلكتروني',
    },
    emailPlaceholder: {
      en: 'you@company.com',
      ar: 'you@company.com',
    },
    phoneLabel: {
      en: 'Phone number',
      ar: 'رقم الهاتف',
    },
    phonePlaceholder: {
      en: '+1 (555) 000-0000',
      ar: '+213 000 000 000',
    },
    countryCodeLabel: {
      en: 'US',
      ar: 'DZ',
    },
    messageLabel: {
      en: 'Message',
      ar: 'الرسالة',
    },
    messagePlaceholder: {
      en: 'Leave us a message...',
      ar: 'اكتب رسالتك هنا...',
    },
    privacyText: {
      en: 'You agree to our friendly',
      ar: 'أنت توافق على',
    },
    privacyLinkText: {
      en: 'privacy policy.',
      ar: 'سياسة الخصوصية.',
    },
    privacyUrl: '/privacy-policy',
    buttonText: {
      en: 'Send message',
      ar: 'إرسال الرسالة',
    },
    imageUrl: '',
  },

  infoSection: {
    kicker: {
      en: 'Contact us',
      ar: 'تواصل معنا',
    },
    title: {
      en: 'We’d love to hear from you',
      ar: 'يسعدنا أن نسمع منك',
    },
    subtitle: {
      en: 'Our friendly team is always here to chat.',
      ar: 'فريقنا الودود متواجد دائمًا لمساعدتك.',
    },
    cards: [
      {
        icon: 'chat',
        title: {
          en: 'Chat to sales',
          ar: 'تحدث مع فريق المبيعات',
        },
        description: {
          en: 'Speak to our friendly team.',
          ar: 'تواصل مع فريقنا الودود.',
        },
        linkText: {
          en: 'sales@Bwssala.com',
          ar: 'sales@Bwssala.com',
        },
        linkUrl: 'mailto:sales@Bwssala.com',
      },
      {
        icon: 'support',
        title: {
          en: 'Chat to support',
          ar: 'تحدث مع الدعم',
        },
        description: {
          en: 'We’re here to help.',
          ar: 'نحن هنا لمساعدتك.',
        },
        linkText: {
          en: 'support@Bwssala.com',
          ar: 'support@Bwssala.com',
        },
        linkUrl: 'mailto:support@Bwssala.com',
      },
      {
        icon: 'location',
        title: {
          en: 'Visit us',
          ar: 'زرنا',
        },
        description: {
          en: 'Visit our office HQ.',
          ar: 'زر مقر مكتبنا.',
        },
        linkText: {
          en: '100 Smith Street\nCollingwood VIC 3066 AU',
          ar: '100 Smith Street\nCollingwood VIC 3066 AU',
        },
        linkUrl: '',
      },
      {
        icon: 'phone',
        title: {
          en: 'Call us',
          ar: 'اتصل بنا',
        },
        description: {
          en: 'Mon–Fri from 8am to 5pm.',
          ar: 'من الاثنين إلى الجمعة من 8 صباحًا إلى 5 مساءً.',
        },
        linkText: {
          en: '+1 (555) 000-0000',
          ar: '+213 000 000 000',
        },
        linkUrl: 'tel:+15550000000',
      },
    ],
  },
};

const emptyContactCard: ContactCard = {
  icon: '',
  title: {
    en: '',
    ar: '',
  },
  description: {
    en: '',
    ar: '',
  },
  linkText: {
    en: '',
    ar: '',
  },
  linkUrl: '',
};

const getTabLabels = (isArabic: boolean): Record<Tab, string> => ({
  form: isArabic ? 'نموذج التواصل' : 'Contact Form',
  info: isArabic ? 'معلومات التواصل' : 'Contact Info',
});

export const Contact: React.FC = () => {
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<ContactContent>(defaultContactContent);
  const [activeTab, setActiveTab] = useState<Tab>('form');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tabLabels = getTabLabels(isArabic);

  useEffect(() => {
    const fetchContactContent = async () => {
      try {
        const docRef = doc(db, 'siteContent', 'contact');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.formSection && data.infoSection) {
            setForm({
              ...defaultContactContent,
              ...(data as Partial<ContactContent>),
            } as ContactContent);
          } else {
            setForm(defaultContactContent);
          }
        } else {
          setForm(defaultContactContent);
        }
      } catch (err) {
        console.error(err);
        setError(isArabic ? 'حدث خطأ أثناء جلب البيانات' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchContactContent();
  }, [isArabic]);

  const updateLocalized = (
    path: string[],
    language: 'en' | 'ar',
    value: string
  ) => {
    setForm((prev) => {
      const copy: ContactContent = clone(prev);
      let target: any = copy;

      path.forEach((key) => {
        target = target[key];
      });

      target[language] = value;

      return copy;
    });
  };

  const updateField = (path: string[], value: string) => {
    setForm((prev) => {
      const copy: ContactContent = clone(prev);
      let target: any = copy;

      path.slice(0, -1).forEach((key) => {
        target = target[key];
      });

      target[path[path.length - 1]] = value;

      return copy;
    });
  };

  const addCard = () => {
    setForm((prev) => ({
      ...prev,
      infoSection: {
        ...prev.infoSection,
        cards: [...prev.infoSection.cards, clone(emptyContactCard)],
      },
    }));
  };

  const removeCard = (index: number) => {
    setForm((prev) => ({
      ...prev,
      infoSection: {
        ...prev.infoSection,
        cards: prev.infoSection.cards.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage('');
    setError('');

    try {
      setSaving(true);

      await setDoc(doc(db, 'siteContent', 'contact'), form, { merge: true });

      setMessage(
        isArabic
          ? 'تم حفظ محتوى صفحة التواصل بنجاح'
          : 'Contact page content saved successfully'
      );
    } catch (err) {
      console.error(err);
      setError(isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <h1 className="text-2xl font-bold">
          {isArabic ? 'صفحة التواصل' : 'Contact Page'}
        </h1>

        <Card>
          <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold">
        {isArabic ? 'تعديل صفحة التواصل' : 'Edit Contact Page'}
      </h1>

      <Card>
        {message && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="sticky top-0 z-10 -mx-6 -mt-6 border-b bg-white px-6 pt-6">
            <div className="flex flex-wrap gap-2 pb-4">
              {(Object.keys(tabLabels) as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'form' && (
            <Section
              title={isArabic ? 'قسم نموذج التواصل' : 'Contact Form Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في العنوان، الحقول، الزر، والصورة بجانب نموذج التواصل.'
                  : 'This section controls the title, fields, button, and image beside the contact form.'
              }
            >
              <TwoColumn>
                <LocalizedInput
                  label={isArabic ? 'عنوان النموذج' : 'Form Title'}
                  value={form.formSection.title}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'title'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'وصف النموذج' : 'Form Subtitle'}
                  value={form.formSection.subtitle}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'subtitle'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'عنوان حقل الاسم الأول' : 'First Name Label'}
                  value={form.formSection.firstNameLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'firstNameLabel'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'Placeholder الاسم الأول' : 'First Name Placeholder'}
                  value={form.formSection.firstNamePlaceholder}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(
                      ['formSection', 'firstNamePlaceholder'],
                      language,
                      value
                    )
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'عنوان حقل اللقب' : 'Last Name Label'}
                  value={form.formSection.lastNameLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'lastNameLabel'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'Placeholder اللقب' : 'Last Name Placeholder'}
                  value={form.formSection.lastNamePlaceholder}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(
                      ['formSection', 'lastNamePlaceholder'],
                      language,
                      value
                    )
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'عنوان البريد الإلكتروني' : 'Email Label'}
                  value={form.formSection.emailLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'emailLabel'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'Placeholder البريد الإلكتروني' : 'Email Placeholder'}
                  value={form.formSection.emailPlaceholder}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'emailPlaceholder'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'عنوان رقم الهاتف' : 'Phone Label'}
                  value={form.formSection.phoneLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'phoneLabel'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'Placeholder رقم الهاتف' : 'Phone Placeholder'}
                  value={form.formSection.phonePlaceholder}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'phonePlaceholder'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'رمز الدولة' : 'Country Code'}
                  value={form.formSection.countryCodeLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'countryCodeLabel'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'عنوان الرسالة' : 'Message Label'}
                  value={form.formSection.messageLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'messageLabel'], language, value)
                  }
                />

                <LocalizedTextarea
                  label={isArabic ? 'Placeholder الرسالة' : 'Message Placeholder'}
                  value={form.formSection.messagePlaceholder}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'messagePlaceholder'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'نص الموافقة على الخصوصية' : 'Privacy Text'}
                  value={form.formSection.privacyText}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'privacyText'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'نص رابط الخصوصية' : 'Privacy Link Text'}
                  value={form.formSection.privacyLinkText}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'privacyLinkText'], language, value)
                  }
                />

                <Input
                  label={isArabic ? 'رابط صفحة الخصوصية' : 'Privacy URL'}
                  value={form.formSection.privacyUrl}
                  onChange={(value) => updateField(['formSection', 'privacyUrl'], value)}
                />

                <LocalizedInput
                  label={isArabic ? 'نص زر الإرسال' : 'Submit Button Text'}
                  value={form.formSection.buttonText}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['formSection', 'buttonText'], language, value)
                  }
                />

                <Input
                  label={isArabic ? 'رابط صورة النموذج' : 'Form Image URL'}
                  value={form.formSection.imageUrl}
                  onChange={(value) => updateField(['formSection', 'imageUrl'], value)}
                />
              </TwoColumn>
            </Section>
          )}

          {activeTab === 'info' && (
            <Section
              title={isArabic ? 'قسم معلومات التواصل' : 'Contact Info Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في العنوان الرئيسي وبطاقات التواصل الأربعة.'
                  : 'This section controls the main heading and the contact information cards.'
              }
            >
              <TwoColumn>
                <LocalizedInput
                  label={isArabic ? 'النص الصغير' : 'Kicker'}
                  value={form.infoSection.kicker}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['infoSection', 'kicker'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'العنوان الرئيسي' : 'Main Title'}
                  value={form.infoSection.title}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['infoSection', 'title'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'الوصف' : 'Subtitle'}
                  value={form.infoSection.subtitle}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['infoSection', 'subtitle'], language, value)
                  }
                />
              </TwoColumn>

              <SubSectionHeader
                title={isArabic ? 'بطاقات معلومات التواصل' : 'Contact Cards'}
                actionLabel={isArabic ? 'إضافة بطاقة' : 'Add Card'}
                onAction={addCard}
              />

              <div className="space-y-4">
                {form.infoSection.cards.map((card, index) => (
                  <ItemBox
                    key={index}
                    title={
                      isArabic
                        ? `بطاقة التواصل ${index + 1}`
                        : `Contact Card ${index + 1}`
                    }
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeCard(index)}
                  >
                    <TwoColumn>
                      <Input
                        label={
                          isArabic
                            ? 'الأيقونة chat / support / location / phone'
                            : 'Icon chat / support / location / phone'
                        }
                        value={card.icon}
                        onChange={(value) =>
                          updateField(['infoSection', 'cards', String(index), 'icon'], value)
                        }
                      />

                      <LocalizedInput
                        label={isArabic ? 'عنوان البطاقة' : 'Card Title'}
                        value={card.title}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['infoSection', 'cards', String(index), 'title'],
                            language,
                            value
                          )
                        }
                      />

                      <LocalizedInput
                        label={isArabic ? 'وصف البطاقة' : 'Card Description'}
                        value={card.description}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['infoSection', 'cards', String(index), 'description'],
                            language,
                            value
                          )
                        }
                      />

                      <LocalizedTextarea
                        label={isArabic ? 'نص الرابط / المعلومة' : 'Link Text / Info'}
                        value={card.linkText}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['infoSection', 'cards', String(index), 'linkText'],
                            language,
                            value
                          )
                        }
                      />

                      <Input
                        label={isArabic ? 'رابط البطاقة' : 'Card Link URL'}
                        value={card.linkUrl}
                        onChange={(value) =>
                          updateField(
                            ['infoSection', 'cards', String(index), 'linkUrl'],
                            value
                          )
                        }
                      />
                    </TwoColumn>
                  </ItemBox>
                ))}
              </div>
            </Section>
          )}

          <div className="sticky bottom-0 -mx-6 -mb-6 border-t bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? isArabic
                  ? 'جاري الحفظ...'
                  : 'Saving...'
                : isArabic
                ? 'حفظ التغييرات'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, description, children }) => {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>

      <div className="space-y-6">{children}</div>
    </section>
  );
};

interface SubSectionHeaderProps {
  title: string;
  actionLabel: string;
  onAction: () => void;
}

const SubSectionHeader: React.FC<SubSectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

      <button
        type="button"
        onClick={onAction}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
      >
        {actionLabel}
      </button>
    </div>
  );
};

interface ItemBoxProps {
  title: string;
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}

const ItemBox: React.FC<ItemBoxProps> = ({
  title,
  children,
  onRemove,
  removeLabel,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
        >
          {removeLabel}
        </button>
      </div>

      {children}
    </div>
  );
};

interface TwoColumnProps {
  children: React.ReactNode;
}

const TwoColumn: React.FC<TwoColumnProps> = ({ children }) => {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>;
};

interface LocalizedInputProps {
  label: string;
  value: LocalizedText;
  isArabic: boolean;
  onChange: (language: 'en' | 'ar', value: string) => void;
}

const LocalizedInput: React.FC<LocalizedInputProps> = ({
  label,
  value,
  isArabic,
  onChange,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">{label}</h4>

      <div className="space-y-3">
        <Input
          label={isArabic ? 'الإنجليزية' : 'English'}
          value={value.en}
          onChange={(newValue) => onChange('en', newValue)}
        />

        <div dir="rtl">
          <Input
            label={isArabic ? 'العربية' : 'Arabic'}
            value={value.ar}
            onChange={(newValue) => onChange('ar', newValue)}
          />
        </div>
      </div>
    </div>
  );
};

interface LocalizedTextareaProps {
  label: string;
  value: LocalizedText;
  isArabic: boolean;
  onChange: (language: 'en' | 'ar', value: string) => void;
}

const LocalizedTextarea: React.FC<LocalizedTextareaProps> = ({
  label,
  value,
  isArabic,
  onChange,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">{label}</h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Textarea
          label={isArabic ? 'الإنجليزية' : 'English'}
          value={value.en}
          onChange={(newValue) => onChange('en', newValue)}
        />

        <div dir="rtl">
          <Textarea
            label={isArabic ? 'العربية' : 'Arabic'}
            value={value.ar}
            onChange={(newValue) => onChange('ar', newValue)}
          />
        </div>
      </div>
    </div>
  );
};

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const Input: React.FC<InputProps> = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const Textarea: React.FC<TextareaProps> = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};