import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { Card } from '../components/Card';
import { useLanguage } from '../i18n/LanguageContext';

interface LocalizedText {
  en: string;
  ar: string;
}

interface StatItem {
  value: string;
  label: LocalizedText;
}

interface HeroSection {
  kicker: LocalizedText;
  title: LocalizedText;
  highlightedTitle: LocalizedText;
  subtitle: LocalizedText;
  videoImageUrl: string;
  videoUrl: string;
  stats: StatItem[];
}

interface IntroSection {
  headline: LocalizedText;
  imageUrl: string;
  logoUrl: string;
  paragraphOne: LocalizedText;
  paragraphTwo: LocalizedText;
  secondImageUrl: string;
}

interface PrincipleItem {
  title: LocalizedText;
  description: LocalizedText;
}

interface ApproachItem {
  dot: string;
  title: LocalizedText;
  description: LocalizedText;
}

interface ApproachSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  items: ApproachItem[];
}

interface ValueItem {
  title: LocalizedText;
  description: LocalizedText;
}

interface MissionValuesSection {
  missionLabel: LocalizedText;
  missionText: LocalizedText;
  valuesLabel: LocalizedText;
  values: ValueItem[];
}

interface ImpactStep {
  number: string;
  title: LocalizedText;
  description: LocalizedText;
}

interface ImpactSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  steps: ImpactStep[];
}

interface TeamMember {
  name: string;
  role: LocalizedText;
  imageUrl: string;
  xUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
}

interface TeamSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  members: TeamMember[];
}

interface AboutContent {
  hero: HeroSection;
  intro: IntroSection;
  principles: PrincipleItem[];
  approach: ApproachSection;
  missionValues: MissionValuesSection;
  impact: ImpactSection;
  team: TeamSection;
}

type Tab =
  | 'hero'
  | 'intro'
  | 'principles'
  | 'approach'
  | 'missionValues'
  | 'impact'
  | 'team';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const aboutDefaultContent: AboutContent = {
  hero: {
    kicker: {
      en: 'About us',
      ar: 'من نحن',
    },
    title: {
      en: 'Empowering Entrepreneurs. Building Sustainable Growth.',
      ar: 'تمكين رواد الأعمال. بناء نمو مستدام.',
    },
    highlightedTitle: {
      en: 'Entrepreneurs.',
      ar: 'رواد الأعمال.',
    },
    subtitle: {
      en: 'Bawsala is a leading business acceleration platform in Algeria, supporting startups, organizations, and entrepreneurs through consulting, training, and structured development programs.',
      ar: 'بوصلة هي منصة رائدة لتسريع الأعمال في الجزائر، تدعم الشركات الناشئة والمؤسسات ورواد الأعمال من خلال الاستشارات والتدريب وبرامج التطوير المنظمة.',
    },
    videoImageUrl: '',
    videoUrl: '',
    stats: [
      {
        value: '466+',
        label: {
          en: 'Projects Developed',
          ar: 'مشروع مطوّر',
        },
      },
      {
        value: '366+',
        label: {
          en: 'Startups Supported',
          ar: 'شركة ناشئة مدعومة',
        },
      },
      {
        value: '46+',
        label: {
          en: 'Partner Organizations',
          ar: 'منظمة شريكة',
        },
      },
    ],
  },

  intro: {
    headline: {
      en: 'At Bawsala, we empower entrepreneurs and organizations to build structured, scalable businesses through practical guidance, strategic support, and real-world expertise.',
      ar: 'في بوصلة، نمكّن رواد الأعمال والمؤسسات من بناء أعمال منظمة وقابلة للتوسع من خلال الإرشاد العملي والدعم الاستراتيجي والخبرة الواقعية.',
    },
    imageUrl: '',
    logoUrl: '',
    paragraphOne: {
      en: 'Bawsala operates across Algeria, supporting startups, organizations, and business leaders through consulting, training programs, and development solutions.',
      ar: 'تعمل بوصلة عبر الجزائر لدعم الشركات الناشئة والمؤسسات وقادة الأعمال من خلال الاستشارات وبرامج التدريب وحلول التطوير.',
    },
    paragraphTwo: {
      en: 'Since our founding, we have worked with hundreds of projects, helping transform ideas into actionable strategies and measurable results. Our approach combines local ecosystem understanding with global expertise to deliver practical, high-impact solutions.',
      ar: 'منذ تأسيسنا، عملنا مع مئات المشاريع وساعدنا في تحويل الأفكار إلى استراتيجيات قابلة للتنفيذ ونتائج قابلة للقياس. تجمع منهجيتنا بين فهم البيئة المحلية والخبرة العالمية لتقديم حلول عملية عالية الأثر.',
    },
    secondImageUrl: '',
  },

  principles: [
    {
      title: {
        en: 'Commitment to Results',
        ar: 'الالتزام بالنتائج',
      },
      description: {
        en: 'We commit only to what can be achieved and measured.',
        ar: 'نلتزم فقط بما يمكن تحقيقه وقياسه.',
      },
    },
    {
      title: {
        en: 'Unrestricted Partnership',
        ar: 'شراكة بلا قيود',
      },
      description: {
        en: 'Clients are partners in decision-making and execution.',
        ar: 'العملاء شركاء في اتخاذ القرار والتنفيذ.',
      },
    },
    {
      title: {
        en: 'Transparency and Trust',
        ar: 'الشفافية والثقة',
      },
      description: {
        en: 'Full clarity from day one.',
        ar: 'وضوح كامل منذ اليوم الأول.',
      },
    },
    {
      title: {
        en: 'Long-term Impact',
        ar: 'أثر طويل المدى',
      },
      description: {
        en: 'We build solutions that last beyond the engagement.',
        ar: 'نبني حلولًا تستمر بعد انتهاء فترة العمل.',
      },
    },
  ],

  approach: {
    title: {
      en: 'Our Approach',
      ar: 'منهجيتنا',
    },
    subtitle: {
      en: 'Bawsala’s approach is built on six interconnected stages designed to deliver clarity, execution, and measurable impact.',
      ar: 'تعتمد منهجية بوصلة على ست مراحل مترابطة مصممة لتقديم الوضوح والتنفيذ والأثر القابل للقياس.',
    },
    items: [
      {
        dot: 'blue',
        title: {
          en: 'Understanding the Reality',
          ar: 'فهم الواقع',
        },
        description: {
          en: 'We begin with a deep analysis of the organization’s environment, challenges, and capabilities, to establish a realistic baseline.',
          ar: 'نبدأ بتحليل عميق لبيئة المؤسسة وتحدياتها وقدراتها من أجل بناء نقطة انطلاق واقعية.',
        },
      },
      {
        dot: 'red',
        title: {
          en: 'Defining Direction and Objectives',
          ar: 'تحديد الاتجاه والأهداف',
        },
        description: {
          en: 'We align with leadership to clarify priorities, define success criteria, and translate vision into clear, measurable objectives.',
          ar: 'نعمل مع القيادة لتوضيح الأولويات وتحديد معايير النجاح وتحويل الرؤية إلى أهداف واضحة وقابلة للقياس.',
        },
      },
      {
        dot: 'green',
        title: {
          en: 'Designing the Solution',
          ar: 'تصميم الحل',
        },
        description: {
          en: 'We develop tailored, practical solutions aligned with organizational goals, operational realities, and performance indicators.',
          ar: 'نطوّر حلولًا عملية ومخصصة تتماشى مع أهداف المؤسسة وواقعها التشغيلي ومؤشرات الأداء.',
        },
      },
      {
        dot: 'teal',
        title: {
          en: 'Planning the Roadmap',
          ar: 'تخطيط خارطة الطريق',
        },
        description: {
          en: 'We break down the solution into actionable steps, milestones, responsibilities, and timelines to ensure smooth execution.',
          ar: 'نحوّل الحل إلى خطوات عملية ومحطات واضحة ومسؤوليات محددة وجدول زمني يضمن تنفيذًا سلسًا.',
        },
      },
      {
        dot: 'orange',
        title: {
          en: 'Executing with Teams',
          ar: 'التنفيذ مع الفرق',
        },
        description: {
          en: 'We work side-by-side with teams to implement initiatives, remove blockers, and keep momentum through structured follow-up.',
          ar: 'نعمل جنبًا إلى جنب مع الفرق لتنفيذ المبادرات وإزالة العوائق والحفاظ على الزخم من خلال متابعة منظمة.',
        },
      },
      {
        dot: 'purple',
        title: {
          en: 'Measuring and Improving',
          ar: 'القياس والتحسين',
        },
        description: {
          en: 'We track results, refine what’s not working, and institutionalize learning to ensure sustainable, measurable impact.',
          ar: 'نتابع النتائج ونحسّن ما يحتاج إلى تطوير ونحوّل التعلم إلى ممارسة مستدامة لضمان أثر قابل للقياس.',
        },
      },
    ],
  },

  missionValues: {
    missionLabel: {
      en: 'OUR MISSION',
      ar: 'مهمتنا',
    },
    missionText: {
      en: 'We accelerate the growth of startups and organizations by providing strategic guidance, training, and access to opportunities.',
      ar: 'نسرّع نمو الشركات الناشئة والمؤسسات من خلال تقديم الإرشاد الاستراتيجي والتدريب والوصول إلى الفرص.',
    },
    valuesLabel: {
      en: 'OUR VALUES',
      ar: 'قيمنا',
    },
    values: [
      {
        title: {
          en: 'Build with Purpose',
          ar: 'نبني بهدف',
        },
        description: {
          en: 'We focus on creating real value — not just delivering services, but building solutions that make a difference.',
          ar: 'نركز على خلق قيمة حقيقية، وليس فقط تقديم الخدمات، بل بناء حلول تصنع فرقًا ملموسًا.',
        },
      },
      {
        title: {
          en: 'Think like entrepreneurs',
          ar: 'نفكر بعقلية رواد الأعمال',
        },
        description: {
          en: 'We approach every challenge with ownership, creativity, and a mindset focused on growth.',
          ar: 'نتعامل مع كل تحدٍ بروح المسؤولية والإبداع وعقلية تركّز على النمو.',
        },
      },
      {
        title: {
          en: 'Stay Ahead',
          ar: 'نبقى في المقدمة',
        },
        description: {
          en: 'We approach every challenge with ownership, creativity, and a mindset focused on growth.',
          ar: 'نواكب التغيير باستمرار ونبحث دائمًا عن طرق أفضل للتطوير وصناعة الأثر.',
        },
      },
      {
        title: {
          en: 'Deliver real impact',
          ar: 'نحقق أثرًا حقيقيًا',
        },
        description: {
          en: 'Success is measured by results — tangible, measurable, and meaningful outcomes.',
          ar: 'نقيس النجاح بالنتائج: مخرجات ملموسة، قابلة للقياس، وذات معنى.',
        },
      },
      {
        title: {
          en: 'Grow Together',
          ar: 'ننمو معًا',
        },
        description: {
          en: 'We build strong partnerships and believe that success is always a shared journey.',
          ar: 'نبني شراكات قوية ونؤمن أن النجاح رحلة مشتركة دائمًا.',
        },
      },
    ],
  },

  impact: {
    title: {
      en: 'How we create impact',
      ar: 'كيف نصنع الأثر',
    },
    subtitle: {
      en: 'At Bawsala, values are not slogans. They are practical principles that shape our approach, strengthen partnerships, and ensure measurable impact.',
      ar: 'في بوصلة، القيم ليست مجرد شعارات. إنها مبادئ عملية تشكل منهجيتنا، وتعزز الشراكات، وتضمن أثرًا قابلًا للقياس.',
    },
    steps: [
      {
        number: '01',
        title: {
          en: 'Understand',
          ar: 'نفهم',
        },
        description: {
          en: 'We analyze your needs, challenges, and opportunities.',
          ar: 'نحلل احتياجاتك وتحدياتك وفرصك.',
        },
      },
      {
        number: '02',
        title: {
          en: 'Design',
          ar: 'نصمم',
        },
        description: {
          en: 'We build tailored strategies and structured plans.',
          ar: 'نبني استراتيجيات مخصصة وخططًا منظمة.',
        },
      },
      {
        number: '03',
        title: {
          en: 'Execute',
          ar: 'ننفذ',
        },
        description: {
          en: 'We implement solutions with precision.',
          ar: 'ننفذ الحلول بدقة.',
        },
      },
      {
        number: '04',
        title: {
          en: 'Measure',
          ar: 'نقيس',
        },
        description: {
          en: 'We track performance and optimize results.',
          ar: 'نتابع الأداء ونحسن النتائج.',
        },
      },
      {
        number: '05',
        title: {
          en: 'Grow',
          ar: 'ننمو',
        },
        description: {
          en: 'We support long-term development and scaling.',
          ar: 'ندعم التطوير والتوسع على المدى الطويل.',
        },
      },
    ],
  },

  team: {
    title: {
      en: 'Meet the People Behind Bawsala',
      ar: 'تعرف على الأشخاص خلف بوصلة',
    },
    subtitle: {
      en: 'A multidisciplinary team of consultants, trainers, and builders committed to helping organizations grow.',
      ar: 'فريق متعدد التخصصات من المستشارين والمدربين والبنّائين ملتزم بمساعدة المؤسسات على النمو.',
    },
    members: Array.from({ length: 8 }, () => ({
      name: 'Olivia Rhye',
      role: {
        en: 'Founder & CEO',
        ar: 'المؤسس والرئيس التنفيذي',
      },
      imageUrl: '',
      xUrl: '',
      linkedinUrl: '',
      websiteUrl: '',
    })),
  },
};

const emptyStat: StatItem = {
  value: '',
  label: {
    en: '',
    ar: '',
  },
};

const emptyPrincipleItem: PrincipleItem = {
  title: {
    en: '',
    ar: '',
  },
  description: {
    en: '',
    ar: '',
  },
};

const emptyApproachItem: ApproachItem = {
  dot: '',
  title: {
    en: '',
    ar: '',
  },
  description: {
    en: '',
    ar: '',
  },
};

const emptyValueItem: ValueItem = {
  title: {
    en: '',
    ar: '',
  },
  description: {
    en: '',
    ar: '',
  },
};

const emptyImpactStep: ImpactStep = {
  number: '',
  title: {
    en: '',
    ar: '',
  },
  description: {
    en: '',
    ar: '',
  },
};

const emptyTeamMember: TeamMember = {
  name: '',
  role: {
    en: '',
    ar: '',
  },
  imageUrl: '',
  xUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
};

const getTabLabels = (isArabic: boolean): Record<Tab, string> => ({
  hero: isArabic ? 'القسم الرئيسي' : 'Hero',
  intro: isArabic ? 'المقدمة / القصة' : 'Intro / Story',
  principles: isArabic ? 'المبادئ' : 'Principles',
  approach: isArabic ? 'المنهجية' : 'Approach',
  missionValues: isArabic ? 'المهمة والقيم' : 'Mission & Values',
  impact: isArabic ? 'الأثر' : 'Impact',
  team: isArabic ? 'الفريق' : 'Team',
});

export const About: React.FC = () => {
  const { isArabic } = useLanguage();

  const [form, setForm] = useState<AboutContent>(aboutDefaultContent);
  const [activeTab, setActiveTab] = useState<Tab>('hero');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tabLabels = getTabLabels(isArabic);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        const docRef = doc(db, 'siteContent', 'About');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setForm({
            ...aboutDefaultContent,
            ...(data as Partial<AboutContent>),
            hero: {
              ...aboutDefaultContent.hero,
              ...(data.hero || {}),
              stats: Array.isArray(data.hero?.stats)
                ? data.hero.stats
                : aboutDefaultContent.hero.stats,
            },
            intro: {
              ...aboutDefaultContent.intro,
              ...(data.intro || {}),
            },
            principles: Array.isArray(data.principles)
              ? data.principles
              : aboutDefaultContent.principles,
            approach: {
              ...aboutDefaultContent.approach,
              ...(data.approach || {}),
              items: Array.isArray(data.approach?.items)
                ? data.approach.items
                : aboutDefaultContent.approach.items,
            },
            missionValues: {
              ...aboutDefaultContent.missionValues,
              ...(data.missionValues || {}),
              values: Array.isArray(data.missionValues?.values)
                ? data.missionValues.values
                : aboutDefaultContent.missionValues.values,
            },
            impact: {
              ...aboutDefaultContent.impact,
              ...(data.impact || {}),
              steps: Array.isArray(data.impact?.steps)
                ? data.impact.steps
                : aboutDefaultContent.impact.steps,
            },
            team: {
              ...aboutDefaultContent.team,
              ...(data.team || {}),
              members: Array.isArray(data.team?.members)
                ? data.team.members
                : aboutDefaultContent.team.members,
            },
          } as AboutContent);
        } else {
          setForm(aboutDefaultContent);
        }
      } catch (err) {
        console.error(err);
        setError(isArabic ? 'حدث خطأ أثناء جلب البيانات' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutContent();
  }, [isArabic]);

  const updateLocalized = (
    path: string[],
    language: 'en' | 'ar',
    value: string
  ) => {
    setForm((prev) => {
      const copy: AboutContent = clone(prev);
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
      const copy: AboutContent = clone(prev);
      let target: any = copy;

      path.slice(0, -1).forEach((key) => {
        target = target[key];
      });

      target[path[path.length - 1]] = value;

      return copy;
    });
  };

  const addArrayItem = <T,>(path: string[], item: T) => {
    setForm((prev) => {
      const copy: AboutContent = clone(prev);
      let target: any = copy;

      path.forEach((key) => {
        target = target[key];
      });

      target.push(item);

      return copy;
    });
  };

  const removeArrayItem = (path: string[], index: number) => {
    setForm((prev) => {
      const copy: AboutContent = clone(prev);
      let target: any = copy;

      path.forEach((key) => {
        target = target[key];
      });

      target.splice(index, 1);

      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage('');
    setError('');

    try {
      setSaving(true);

      await setDoc(doc(db, 'siteContent', 'About'), form, { merge: true });

      setMessage(
        isArabic
          ? 'تم حفظ محتوى صفحة من نحن بنجاح'
          : 'About page content saved successfully'
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
          {isArabic ? 'صفحة من نحن' : 'About Page'}
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
        {isArabic ? 'تعديل صفحة من نحن' : 'Edit About Page'}
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

          {activeTab === 'hero' && (
            <Section
              title={isArabic ? 'القسم الرئيسي' : 'Hero Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في أول جزء أزرق يظهر في أعلى صفحة من نحن.'
                  : 'This controls the first blue section at the top of the About page.'
              }
            >
              <TwoColumn>
                <LocalizedInput
                  label={isArabic ? 'النص الصغير فوق العنوان' : 'Kicker'}
                  value={form.hero.kicker}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['hero', 'kicker'], language, value)
                  }
                />

                <LocalizedTextarea
                  label={isArabic ? 'العنوان الرئيسي' : 'Main Title'}
                  value={form.hero.title}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['hero', 'title'], language, value)
                  }
                />

                <LocalizedInput
                  label={
                    isArabic
                      ? 'النص المميز داخل العنوان'
                      : 'Highlighted Word / Text'
                  }
                  value={form.hero.highlightedTitle}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['hero', 'highlightedTitle'], language, value)
                  }
                />

                <LocalizedTextarea
                  label={isArabic ? 'وصف القسم الرئيسي' : 'Subtitle'}
                  value={form.hero.subtitle}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['hero', 'subtitle'], language, value)
                  }
                />

                <Input
                  label={isArabic ? 'رابط صورة الفيديو' : 'Video Image URL'}
                  value={form.hero.videoImageUrl}
                  onChange={(value) => updateField(['hero', 'videoImageUrl'], value)}
                />

                <Input
                  label={isArabic ? 'رابط الفيديو' : 'Video URL'}
                  value={form.hero.videoUrl}
                  onChange={(value) => updateField(['hero', 'videoUrl'], value)}
                />
              </TwoColumn>

              <SubSectionHeader
                title={isArabic ? 'إحصائيات القسم الرئيسي' : 'Hero Statistics'}
                actionLabel={isArabic ? 'إضافة إحصائية' : 'Add Stat'}
                onAction={() => addArrayItem(['hero', 'stats'], clone(emptyStat))}
              />

              <div className="space-y-4">
                {form.hero.stats.map((stat, index) => (
                  <ItemBox
                    key={index}
                    title={
                      isArabic
                        ? `الإحصائية ${index + 1}`
                        : `Statistic ${index + 1}`
                    }
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeArrayItem(['hero', 'stats'], index)}
                  >
                    <TwoColumn>
                      <Input
                        label={isArabic ? 'القيمة' : 'Value'}
                        value={stat.value}
                        onChange={(value) =>
                          updateField(['hero', 'stats', String(index), 'value'], value)
                        }
                      />

                      <LocalizedInput
                        label={isArabic ? 'عنوان الإحصائية' : 'Label'}
                        value={stat.label}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['hero', 'stats', String(index), 'label'],
                            language,
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

          {activeTab === 'intro' && (
            <Section
              title={isArabic ? 'قسم المقدمة والقصة' : 'Intro / Story Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في النص الأوسط، والصور، والفقرات التعريفية.'
                  : 'This controls the centered intro text and the image/text block below it.'
              }
            >
              <LocalizedTextarea
                label={isArabic ? 'النص الأوسط الكبير' : 'Centered Headline'}
                value={form.intro.headline}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['intro', 'headline'], language, value)
                }
              />

              <TwoColumn>
                <Input
                  label={isArabic ? 'رابط الصورة الرئيسية' : 'Main Image URL'}
                  value={form.intro.imageUrl}
                  onChange={(value) => updateField(['intro', 'imageUrl'], value)}
                />

                <Input
                  label={isArabic ? 'رابط الشعار' : 'Logo URL'}
                  value={form.intro.logoUrl}
                  onChange={(value) => updateField(['intro', 'logoUrl'], value)}
                />

                <LocalizedTextarea
                  label={isArabic ? 'الفقرة الأولى' : 'Paragraph One'}
                  value={form.intro.paragraphOne}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['intro', 'paragraphOne'], language, value)
                  }
                />

                <LocalizedTextarea
                  label={isArabic ? 'الفقرة الثانية' : 'Paragraph Two'}
                  value={form.intro.paragraphTwo}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['intro', 'paragraphTwo'], language, value)
                  }
                />

                <Input
                  label={isArabic ? 'رابط الصورة الثانية' : 'Second Image URL'}
                  value={form.intro.secondImageUrl}
                  onChange={(value) => updateField(['intro', 'secondImageUrl'], value)}
                />
              </TwoColumn>
            </Section>
          )}

          {activeTab === 'principles' && (
            <Section
              title={isArabic ? 'قسم المبادئ' : 'Principles Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في القائمة الموجودة تحت صورة المقدمة مثل Commitment to Results.'
                  : 'This controls the list under the intro images, such as Commitment to Results.'
              }
            >
              <SubSectionHeader
                title={isArabic ? 'عناصر المبادئ' : 'Principle Items'}
                actionLabel={isArabic ? 'إضافة مبدأ' : 'Add Principle'}
                onAction={() =>
                  addArrayItem(['principles'], clone(emptyPrincipleItem))
                }
              />

              <div className="space-y-4">
                {form.principles.map((principle, index) => (
                  <ItemBox
                    key={index}
                    title={
                      isArabic
                        ? `المبدأ ${index + 1}`
                        : `Principle ${index + 1}`
                    }
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeArrayItem(['principles'], index)}
                  >
                    <TwoColumn>
                      <LocalizedInput
                        label={isArabic ? 'عنوان المبدأ' : 'Principle Title'}
                        value={principle.title}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['principles', String(index), 'title'],
                            language,
                            value
                          )
                        }
                      />

                      <LocalizedTextarea
                        label={isArabic ? 'وصف المبدأ' : 'Principle Description'}
                        value={principle.description}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['principles', String(index), 'description'],
                            language,
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

          {activeTab === 'approach' && (
            <Section
              title={isArabic ? 'قسم المنهجية' : 'Approach Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في بطاقات المنهجية الست.'
                  : 'This controls the six cards under Our Approach.'
              }
            >
              <LocalizedInput
                label={isArabic ? 'عنوان القسم' : 'Section Title'}
                value={form.approach.title}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['approach', 'title'], language, value)
                }
              />

              <LocalizedTextarea
                label={isArabic ? 'وصف القسم' : 'Section Subtitle'}
                value={form.approach.subtitle}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['approach', 'subtitle'], language, value)
                }
              />

              <SubSectionHeader
                title={isArabic ? 'بطاقات المنهجية' : 'Approach Cards'}
                actionLabel={isArabic ? 'إضافة عنصر' : 'Add Approach Item'}
                onAction={() =>
                  addArrayItem(['approach', 'items'], clone(emptyApproachItem))
                }
              />

              <div className="space-y-4">
                {form.approach.items.map((item, index) => (
                  <ItemBox
                    key={index}
                    title={
                      isArabic
                        ? `عنصر المنهجية ${index + 1}`
                        : `Approach Item ${index + 1}`
                    }
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeArrayItem(['approach', 'items'], index)}
                  >
                    <TwoColumn>
                      <Input
                        label={isArabic ? 'لون النقطة' : 'Dot Color'}
                        value={item.dot}
                        onChange={(value) =>
                          updateField(['approach', 'items', String(index), 'dot'], value)
                        }
                      />

                      <LocalizedInput
                        label={isArabic ? 'العنوان' : 'Title'}
                        value={item.title}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['approach', 'items', String(index), 'title'],
                            language,
                            value
                          )
                        }
                      />

                      <LocalizedTextarea
                        label={isArabic ? 'الوصف' : 'Description'}
                        value={item.description}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['approach', 'items', String(index), 'description'],
                            language,
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

          {activeTab === 'missionValues' && (
            <Section
              title={isArabic ? 'قسم المهمة والقيم' : 'Mission & Values Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في قسم مهمتنا وقيمنا الظاهر في الصفحة.'
                  : 'This controls Our Mission and Our Values from the screenshots.'
              }
            >
              <TwoColumn>
                <LocalizedInput
                  label={isArabic ? 'عنوان المهمة' : 'Mission Label'}
                  value={form.missionValues.missionLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['missionValues', 'missionLabel'], language, value)
                  }
                />

                <LocalizedTextarea
                  label={isArabic ? 'نص المهمة' : 'Mission Text'}
                  value={form.missionValues.missionText}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['missionValues', 'missionText'], language, value)
                  }
                />

                <LocalizedInput
                  label={isArabic ? 'عنوان القيم' : 'Values Label'}
                  value={form.missionValues.valuesLabel}
                  isArabic={isArabic}
                  onChange={(language, value) =>
                    updateLocalized(['missionValues', 'valuesLabel'], language, value)
                  }
                />
              </TwoColumn>

              <SubSectionHeader
                title={isArabic ? 'القيم' : 'Values'}
                actionLabel={isArabic ? 'إضافة قيمة' : 'Add Value'}
                onAction={() =>
                  addArrayItem(['missionValues', 'values'], clone(emptyValueItem))
                }
              />

              <div className="space-y-4">
                {form.missionValues.values.map((valueItem, index) => (
                  <ItemBox
                    key={index}
                    title={isArabic ? `القيمة ${index + 1}` : `Value ${index + 1}`}
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeArrayItem(['missionValues', 'values'], index)}
                  >
                    <TwoColumn>
                      <LocalizedInput
                        label={isArabic ? 'عنوان القيمة' : 'Value Title'}
                        value={valueItem.title}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['missionValues', 'values', String(index), 'title'],
                            language,
                            value
                          )
                        }
                      />

                      <LocalizedTextarea
                        label={isArabic ? 'وصف القيمة' : 'Value Description'}
                        value={valueItem.description}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['missionValues', 'values', String(index), 'description'],
                            language,
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

          {activeTab === 'impact' && (
            <Section
              title={isArabic ? 'قسم الأثر' : 'Impact Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في الجزء الأزرق الداكن بعنوان كيف نصنع الأثر.'
                  : 'This controls the dark blue How we create impact section.'
              }
            >
              <LocalizedInput
                label={isArabic ? 'عنوان القسم' : 'Section Title'}
                value={form.impact.title}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['impact', 'title'], language, value)
                }
              />

              <LocalizedTextarea
                label={isArabic ? 'وصف القسم' : 'Section Subtitle'}
                value={form.impact.subtitle}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['impact', 'subtitle'], language, value)
                }
              />

              <SubSectionHeader
                title={isArabic ? 'خطوات الأثر' : 'Impact Steps'}
                actionLabel={isArabic ? 'إضافة خطوة' : 'Add Step'}
                onAction={() =>
                  addArrayItem(['impact', 'steps'], clone(emptyImpactStep))
                }
              />

              <div className="space-y-4">
                {form.impact.steps.map((step, index) => (
                  <ItemBox
                    key={index}
                    title={isArabic ? `الخطوة ${index + 1}` : `Step ${index + 1}`}
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeArrayItem(['impact', 'steps'], index)}
                  >
                    <TwoColumn>
                      <Input
                        label={isArabic ? 'الرقم' : 'Number'}
                        value={step.number}
                        onChange={(value) =>
                          updateField(['impact', 'steps', String(index), 'number'], value)
                        }
                      />

                      <LocalizedInput
                        label={isArabic ? 'العنوان' : 'Title'}
                        value={step.title}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['impact', 'steps', String(index), 'title'],
                            language,
                            value
                          )
                        }
                      />

                      <LocalizedTextarea
                        label={isArabic ? 'الوصف' : 'Description'}
                        value={step.description}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['impact', 'steps', String(index), 'description'],
                            language,
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

          {activeTab === 'team' && (
            <Section
              title={isArabic ? 'قسم الفريق' : 'Team Section'}
              description={
                isArabic
                  ? 'هذا القسم يتحكم في عنوان الفريق وبطاقات أعضاء الفريق.'
                  : 'This controls the team title, subtitle, and all team member cards.'
              }
            >
              <LocalizedInput
                label={isArabic ? 'عنوان القسم' : 'Section Title'}
                value={form.team.title}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['team', 'title'], language, value)
                }
              />

              <LocalizedTextarea
                label={isArabic ? 'وصف القسم' : 'Section Subtitle'}
                value={form.team.subtitle}
                isArabic={isArabic}
                onChange={(language, value) =>
                  updateLocalized(['team', 'subtitle'], language, value)
                }
              />

              <SubSectionHeader
                title={isArabic ? 'أعضاء الفريق' : 'Team Members'}
                actionLabel={isArabic ? 'إضافة عضو' : 'Add Member'}
                onAction={() =>
                  addArrayItem(['team', 'members'], clone(emptyTeamMember))
                }
              />

              <div className="space-y-4">
                {form.team.members.map((member, index) => (
                  <ItemBox
                    key={index}
                    title={
                      isArabic
                        ? `عضو الفريق ${index + 1}`
                        : `Team Member ${index + 1}`
                    }
                    removeLabel={isArabic ? 'حذف' : 'Remove'}
                    onRemove={() => removeArrayItem(['team', 'members'], index)}
                  >
                    <TwoColumn>
                      <Input
                        label={isArabic ? 'الاسم' : 'Name'}
                        value={member.name}
                        onChange={(value) =>
                          updateField(['team', 'members', String(index), 'name'], value)
                        }
                      />

                      <LocalizedInput
                        label={isArabic ? 'المنصب' : 'Role'}
                        value={member.role}
                        isArabic={isArabic}
                        onChange={(language, value) =>
                          updateLocalized(
                            ['team', 'members', String(index), 'role'],
                            language,
                            value
                          )
                        }
                      />

                      <Input
                        label={isArabic ? 'رابط الصورة' : 'Image URL'}
                        value={member.imageUrl}
                        onChange={(value) =>
                          updateField(['team', 'members', String(index), 'imageUrl'], value)
                        }
                      />

                      <Input
                        label={isArabic ? 'رابط X' : 'X URL'}
                        value={member.xUrl}
                        onChange={(value) =>
                          updateField(['team', 'members', String(index), 'xUrl'], value)
                        }
                      />

                      <Input
                        label={isArabic ? 'رابط لينكدإن' : 'LinkedIn URL'}
                        value={member.linkedinUrl}
                        onChange={(value) =>
                          updateField(
                            ['team', 'members', String(index), 'linkedinUrl'],
                            value
                          )
                        }
                      />

                      <Input
                        label={isArabic ? 'رابط الموقع' : 'Website URL'}
                        value={member.websiteUrl}
                        onChange={(value) =>
                          updateField(
                            ['team', 'members', String(index), 'websiteUrl'],
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
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
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
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

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
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default About;
