import type { LucideIcon } from 'lucide-react'
import { ArrowRight, BarChart3, Landmark, MessageCircle, PiggyBank, ReceiptText, ShieldCheck, Target, UsersRound, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HeaderPreferences } from '../components/HeaderPreferences'
import type { Language } from '../i18n/translations'
import { useFinance } from '../state/FinanceContext'

const landingText = {
  ka: {
    navBenefits: 'შესაძლებლობები', navHow: 'როგორ მუშაობს', navAbout: 'ჩვენ შესახებ', login: 'შესვლა', register: 'რეგისტრაცია', eyebrow: 'ოჯახის ფინანსები ერთ სივრცეში',
    title: 'მართეთ ოჯახის ფინანსები მარტივად და ერთად',
    description: 'FamFinance გაძლევთ სრულ სურათს შემოსავლებზე, ხარჯებზე, ბიუჯეტებზე და საერთო ფინანსურ მიზნებზე — უსაფრთხოდ, გასაგებად და მთელი ოჯახისთვის.',
    primaryCta: 'დაიწყე უფასოდ', secondaryCta: 'შესვლა', previewTitle: 'თქვენი ფინანსური სივრცე', previewText: 'ყველა მნიშვნელოვანი მონაცემი ერთ ორგანიზებულ დაფაზე.', previewDemo: 'დემო მონაცემები', previewIncome: 'შემოსავალი', previewExpense: 'ხარჯი', previewSavings: 'დანაზოგი', previewProgress: 'თვიური განაწილება',
    benefitsEyebrow: 'ყველაფერი, რაც გჭირდებათ', benefitsTitle: 'ოჯახის ფინანსების სრული მართვა', benefitsDescription: 'აკონტროლეთ ყოველდღიური მოძრაობა, დაგეგმეთ მომავალი და დარჩით კავშირზე ოჯახის წევრებთან.',
    benefits: [
      ['შემოსავლები და ხარჯები', 'ჩაწერეთ და მოძებნეთ ყველა ფინანსური მოძრაობა ერთ სივრცეში.'],
      ['ბიუჯეტები', 'დააწესეთ კატეგორიების ლიმიტები და აკონტროლეთ შესრულება.'],
      ['ვალები და განვადებები', 'თვალი ადევნეთ დარჩენილ თანხებსა და გადახდის თარიღებს.'],
      ['დანაზოგის მიზნები', 'დაგეგმეთ მიზნები და ნახეთ პროგრესი მკაფიოდ.'],
      ['ოჯახის წევრები', 'მართეთ ოჯახის წევრებთან დაკავშირებული ფინანსური აქტივობა.'],
      ['სტატისტიკა', 'გააანალიზეთ ტენდენციები და მიიღეთ უკეთესი გადაწყვეტილებები.'],
      ['ოჯახის ჩატი', 'ისაუბრეთ უსაფრთხო, მხოლოდ თქვენი ოჯახისთვის განკუთვნილ ჩატში.'],
    ],
    howTitle: 'როგორ მუშაობს', howSteps: [['დარეგისტრირდი', 'შექმენი უსაფრთხო FamFinance ანგარიში რამდენიმე წუთში.'], ['შეავსე ფინანსები', 'დაამატე შემოსავლები, ხარჯები, ბიუჯეტები და მიზნები.'], ['აკონტროლე ოჯახის ბიუჯეტი', 'ნახე სრული სურათი და დაგეგმე შემდეგი ნაბიჯები ერთად.']],
    whyTitle: 'რატომ FamFinance?', whyBenefits: [['მარტივი და გასაგები', 'ყველა მთავარი ფუნქცია ერთ მოწესრიგებულ სივრცეში.'], ['ოჯახისთვის შექმნილი', 'წევრები, საერთო ფინანსები და ჩატი ერთმანეთთან არის დაკავშირებული.'], ['უსაფრთხო მონაცემები', 'თითოეული ოჯახის ინფორმაცია იზოლირებული და დაცულია.'], ['უკეთესი გადაწყვეტილებები', 'სტატისტიკა და პროგრესი ფინანსურ სურათს უფრო ნათელს ხდის.']],
    faqTitle: 'ხშირად დასმული კითხვები', faq: [['FamFinance უფასოა?', 'ანგარიშის შექმნა და გამოყენების დაწყება უფასოდ შეგიძლიათ.'], ['შემიძლია ოჯახის წევრების დამატება?', 'დიახ. რეგისტრირებული წევრი შეგიძლიათ ელფოსტით დაუკავშიროთ თქვენს ოჯახს.'], ['ჩემი მონაცემები სხვა ოჯახს ხომ არ გამოუჩნდება?', 'არა. ოჯახის მონაცემები და ჩატი მკაცრად არის იზოლირებული სხვა მომხმარებლებისგან.']],
    secure: 'ანგარიშზე დაფუძნებული დაცვა', private: 'ოჯახზე იზოლირებული მონაცემები', closingTitle: 'მზად ხართ უკეთესი ფინანსური წესრიგისთვის?', closingText: 'შექმენით ანგარიში და დაიწყეთ თქვენი ოჯახის ფინანსური სივრცის მოწყობა.', privacy: 'კონფიდენციალურობა', terms: 'პირობები', contact: 'კონტაქტი',
  },
  en: {
    navBenefits: 'Features', navHow: 'How it works', navAbout: 'About us', login: 'Sign in', register: 'Register', eyebrow: 'Family finances in one place',
    title: 'Manage your family finances simply, together',
    description: 'FamFinance gives you a complete view of income, expenses, budgets, and shared financial goals—securely, clearly, and for the whole family.',
    primaryCta: 'Get started free', secondaryCta: 'Sign in', previewTitle: 'Your financial workspace', previewText: 'Every important detail on one organized dashboard.', previewDemo: 'Demo data', previewIncome: 'Income', previewExpense: 'Expenses', previewSavings: 'Savings', previewProgress: 'Monthly allocation',
    benefitsEyebrow: 'Everything you need', benefitsTitle: 'Complete family finance management', benefitsDescription: 'Track daily activity, plan ahead, and stay connected with your family.',
    benefits: [
      ['Income and expenses', 'Record and find every financial movement in one place.'],
      ['Budgets', 'Set category limits and monitor progress.'],
      ['Debts and installments', 'Track remaining amounts and payment dates.'],
      ['Savings goals', 'Plan goals and see progress clearly.'],
      ['Family members', 'Manage financial activity connected to family members.'],
      ['Statistics', 'Analyze trends and make better decisions.'],
      ['Family chat', 'Talk in a secure chat available only to your family.'],
    ],
    howTitle: 'How it works', howSteps: [['Create an account', 'Set up your secure FamFinance account in just a few minutes.'], ['Add your finances', 'Add income, expenses, budgets, and goals.'], ['Track the family budget', 'See the complete picture and plan the next steps together.']],
    whyTitle: 'Why FamFinance?', whyBenefits: [['Simple and clear', 'Every essential tool lives in one organized workspace.'], ['Built for families', 'Members, shared finances, and chat work together.'], ['Secure data', 'Each family’s information stays isolated and protected.'], ['Better decisions', 'Statistics and progress make your financial picture clearer.']],
    faqTitle: 'Frequently asked questions', faq: [['Is FamFinance free?', 'You can create an account and get started for free.'], ['Can I add family members?', 'Yes. You can link a registered member to your family by email.'], ['Can another family see my data?', 'No. Family data and chat are strictly isolated from other users.']],
    secure: 'Account-based security', private: 'Family-isolated data', closingTitle: 'Ready for better financial organization?', closingText: 'Create your account and start organizing your family’s financial workspace.', privacy: 'Privacy', terms: 'Terms', contact: 'Contact',
  },
  ru: {
    navBenefits: 'Возможности', navHow: 'Как это работает', navAbout: 'О нас', login: 'Войти', register: 'Регистрация', eyebrow: 'Семейные финансы в одном месте',
    title: 'Управляйте семейными финансами просто и вместе',
    description: 'FamFinance показывает полную картину доходов, расходов, бюджетов и общих финансовых целей — безопасно, понятно и для всей семьи.',
    primaryCta: 'Начать бесплатно', secondaryCta: 'Войти', previewTitle: 'Ваше финансовое пространство', previewText: 'Все важные данные на одной организованной панели.', previewDemo: 'Демо-данные', previewIncome: 'Доход', previewExpense: 'Расходы', previewSavings: 'Сбережения', previewProgress: 'Распределение за месяц',
    benefitsEyebrow: 'Всё необходимое', benefitsTitle: 'Полное управление семейными финансами', benefitsDescription: 'Контролируйте ежедневные операции, планируйте будущее и оставайтесь на связи с семьёй.',
    benefits: [
      ['Доходы и расходы', 'Записывайте и находите все финансовые операции в одном месте.'],
      ['Бюджеты', 'Устанавливайте лимиты категорий и следите за их выполнением.'],
      ['Долги и рассрочки', 'Отслеживайте остатки и даты платежей.'],
      ['Цели накоплений', 'Планируйте цели и наглядно следите за прогрессом.'],
      ['Члены семьи', 'Управляйте финансовой активностью членов семьи.'],
      ['Статистика', 'Анализируйте тенденции и принимайте лучшие решения.'],
      ['Семейный чат', 'Общайтесь в защищённом чате только для вашей семьи.'],
    ],
    howTitle: 'Как это работает', howSteps: [['Зарегистрируйтесь', 'Создайте защищённый аккаунт FamFinance за несколько минут.'], ['Добавьте финансы', 'Внесите доходы, расходы, бюджеты и цели.'], ['Контролируйте семейный бюджет', 'Смотрите полную картину и планируйте следующие шаги вместе.']],
    whyTitle: 'Почему FamFinance?', whyBenefits: [['Просто и понятно', 'Все основные инструменты находятся в одном организованном пространстве.'], ['Создано для семьи', 'Участники, общие финансы и чат работают вместе.'], ['Безопасные данные', 'Информация каждой семьи изолирована и защищена.'], ['Лучшие решения', 'Статистика и прогресс делают финансовую картину понятнее.']],
    faqTitle: 'Частые вопросы', faq: [['FamFinance бесплатен?', 'Создать аккаунт и начать пользоваться сервисом можно бесплатно.'], ['Можно добавлять членов семьи?', 'Да. Зарегистрированного пользователя можно связать с семьёй по электронной почте.'], ['Другая семья увидит мои данные?', 'Нет. Данные и чат семьи строго изолированы от других пользователей.']],
    secure: 'Защита учётной записи', private: 'Изоляция данных семьи', closingTitle: 'Готовы навести порядок в финансах?', closingText: 'Создайте аккаунт и начните организовывать финансовое пространство семьи.', privacy: 'Конфиденциальность', terms: 'Условия', contact: 'Контакты',
  },
  tr: {
    navBenefits: 'Özellikler', navHow: 'Nasıl çalışır', navAbout: 'Hakkımızda', login: 'Giriş yap', register: 'Kayıt ol', eyebrow: 'Aile finansı tek bir yerde',
    title: 'Aile finansınızı kolayca ve birlikte yönetin',
    description: 'FamFinance; gelir, gider, bütçe ve ortak finansal hedeflerinizi güvenli, anlaşılır ve tüm aileye uygun şekilde tek yerde gösterir.',
    primaryCta: 'Ücretsiz başlayın', secondaryCta: 'Giriş yap', previewTitle: 'Finans çalışma alanınız', previewText: 'Tüm önemli bilgiler düzenli tek bir panelde.', previewDemo: 'Demo verileri', previewIncome: 'Gelir', previewExpense: 'Gider', previewSavings: 'Birikim', previewProgress: 'Aylık dağılım',
    benefitsEyebrow: 'İhtiyacınız olan her şey', benefitsTitle: 'Eksiksiz aile finansı yönetimi', benefitsDescription: 'Günlük hareketleri takip edin, geleceği planlayın ve ailenizle bağlantıda kalın.',
    benefits: [
      ['Gelir ve giderler', 'Tüm finansal hareketleri tek yerde kaydedin ve bulun.'],
      ['Bütçeler', 'Kategori limitleri belirleyin ve ilerlemeyi izleyin.'],
      ['Borçlar ve taksitler', 'Kalan tutarları ve ödeme tarihlerini takip edin.'],
      ['Birikim hedefleri', 'Hedeflerinizi planlayın ve ilerlemeyi açıkça görün.'],
      ['Aile üyeleri', 'Aile üyelerine bağlı finansal etkinlikleri yönetin.'],
      ['İstatistikler', 'Eğilimleri analiz edin ve daha iyi kararlar alın.'],
      ['Aile sohbeti', 'Yalnızca ailenize açık güvenli sohbette iletişim kurun.'],
    ],
    howTitle: 'Nasıl çalışır', howSteps: [['Kayıt olun', 'Güvenli FamFinance hesabınızı birkaç dakika içinde oluşturun.'], ['Finans bilgilerinizi ekleyin', 'Gelir, gider, bütçe ve hedeflerinizi ekleyin.'], ['Aile bütçesini takip edin', 'Tam görünümü inceleyin ve sonraki adımları birlikte planlayın.']],
    whyTitle: 'Neden FamFinance?', whyBenefits: [['Basit ve anlaşılır', 'Tüm temel araçlar düzenli tek bir çalışma alanında.'], ['Aileler için tasarlandı', 'Üyeler, ortak finans ve sohbet birlikte çalışır.'], ['Güvenli veriler', 'Her ailenin bilgileri ayrı ve korumalı tutulur.'], ['Daha iyi kararlar', 'İstatistikler ve ilerleme finansal görünümü netleştirir.']],
    faqTitle: 'Sık sorulan sorular', faq: [['FamFinance ücretsiz mi?', 'Ücretsiz hesap oluşturabilir ve kullanmaya başlayabilirsiniz.'], ['Aile üyesi ekleyebilir miyim?', 'Evet. Kayıtlı bir üyeyi e-posta ile ailenize bağlayabilirsiniz.'], ['Başka bir aile verilerimi görebilir mi?', 'Hayır. Aile verileri ve sohbet diğer kullanıcılardan kesin biçimde ayrılır.']],
    secure: 'Hesap tabanlı güvenlik', private: 'Aileye özel veri yalıtımı', closingTitle: 'Finansınızı daha iyi düzenlemeye hazır mısınız?', closingText: 'Hesabınızı oluşturun ve ailenizin finans alanını düzenlemeye başlayın.', privacy: 'Gizlilik', terms: 'Koşullar', contact: 'İletişim',
  },
} as const satisfies Record<Language, Record<string, string | readonly (readonly [string, string])[]>>

const benefitIcons: LucideIcon[] = [ReceiptText, WalletCards, Landmark, Target, UsersRound, BarChart3, MessageCircle]
const whyIcons: LucideIcon[] = [PiggyBank, UsersRound, ShieldCheck, BarChart3]

export function LandingPage() {
  const { preferences } = useFinance()
  const copy = landingText[preferences.language]

  return <div className={`theme-${preferences.theme} min-h-screen bg-slate-100 text-slate-900`}>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8" aria-label="Primary navigation">
        <Link to="/" className="flex min-w-0 items-center gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm"><PiggyBank className="h-5 w-5" /></span><span className="truncate text-lg font-bold tracking-tight">FamFinance</span></Link>
        <div className="order-3 flex w-full items-center justify-center gap-4 border-t border-slate-100 pt-3 text-center lg:order-none lg:w-auto lg:border-0 lg:pt-0"><a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-emerald-700">{copy.navBenefits}</a><a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-emerald-700">{copy.navHow}</a><a href="#about" className="text-sm font-medium text-slate-600 transition hover:text-emerald-700">{copy.navAbout}</a></div>
        <div className="ml-auto flex items-center gap-2"><HeaderPreferences /><Link to="/login" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-3">{copy.login}</Link><Link to="/register" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:px-4">{copy.register}</Link></div>
      </nav>
    </header>

    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50">
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div className="relative max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{copy.eyebrow}</p><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">{copy.title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{copy.description}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500">{copy.primaryCta}<ArrowRight className="h-4 w-4" /></Link><Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">{copy.secondaryCta}</Link></div><div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />{copy.secure}</span><span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-600" />{copy.private}</span></div></div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div><p className="font-bold text-slate-900">FamFinance</p><p className="mt-1 text-xs text-slate-500">{copy.previewTitle}</p></div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BarChart3 className="h-5 w-5" /></span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><p className="text-sm leading-6 text-slate-500">{copy.previewText}</p><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{copy.previewDemo}</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DemoMetric label={copy.previewIncome} value="2,500 ₾" tone="emerald" />
                <DemoMetric label={copy.previewExpense} value="1,200 ₾" tone="rose" />
                <DemoMetric label={copy.previewSavings} value="1,300 ₾" tone="blue" />
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-600">{copy.previewProgress}</span><span className="text-xs font-bold text-emerald-700">52%</span></div>
                <div className="mt-4 flex h-20 items-end justify-between gap-2" aria-hidden="true">
                  {[38, 56, 44, 72, 60, 84, 68].map((height, index) => <span key={index} className="w-full rounded-t-md bg-emerald-500/80" style={{ height: `${height}%` }} />)}
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-200"><span className="h-full w-[48%] bg-rose-400" /><span className="h-full w-[52%] bg-emerald-500" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 bg-white py-16 sm:py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{copy.benefitsEyebrow}</p><h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.benefitsTitle}</h2><p className="mt-4 leading-7 text-slate-600">{copy.benefitsDescription}</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{copy.benefits.map(([title, description], index) => { const Icon = benefitIcons[index]; return <article key={title} className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg ${index === copy.benefits.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>})}</div></div></section>

      <section id="how-it-works" className="scroll-mt-28 bg-slate-100 py-16 sm:py-24"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><h2 className="text-center text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.howTitle}</h2><div className="mt-12 grid gap-4 md:grid-cols-3">{copy.howSteps.map(([title, description], index) => <article key={title} className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">{index + 1}</span><h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div></section>

      <section id="about" className="scroll-mt-28 bg-white py-16 sm:py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><h2 className="text-center text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.whyTitle}</h2><div className="mt-12 grid gap-4 sm:grid-cols-2">{copy.whyBenefits.map(([title, description], index) => { const Icon = whyIcons[index]; return <article key={title} className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></span><div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p></div></article>})}</div></div></section>

      <section id="faq" className="bg-slate-100 py-16 sm:py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6"><h2 className="text-center text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.faqTitle}</h2><div className="mt-10 space-y-3">{copy.faq.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4"><summary className="cursor-pointer list-none pr-6 font-bold text-slate-900 marker:hidden">{question}</summary><p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">{answer}</p></details>)}</div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto flex max-w-5xl flex-col items-center rounded-[2rem] bg-emerald-600 px-6 py-10 text-center text-white shadow-xl sm:px-10 sm:py-14"><h2 className="text-3xl font-black tracking-tight sm:text-4xl">{copy.closingTitle}</h2><p className="mt-4 max-w-2xl leading-7 text-emerald-50">{copy.closingText}</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link to="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-bold text-emerald-700 transition hover:bg-emerald-50">{copy.primaryCta}<ArrowRight className="h-4 w-4" /></Link><Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/30 px-6 font-bold text-white transition hover:bg-white/10">{copy.login}</Link></div></div></section>
    </main>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8"><div className="flex items-center gap-2 font-bold text-slate-900"><PiggyBank className="h-5 w-5 text-emerald-600" />FamFinance</div><div className="flex flex-wrap justify-center gap-x-6 gap-y-2"><span>{copy.privacy}</span><span>{copy.terms}</span><span>{copy.contact}</span></div><p>© {new Date().getFullYear()} FamFinance</p></div></footer>
  </div>
}

function DemoMetric({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'blue' }) {
  const toneClass = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><span className="text-xs font-medium text-slate-500">{label}</span><strong className={`mt-2 block rounded-lg px-2 py-1.5 text-base font-black sm:text-sm lg:text-base ${toneClass}`}>{value}</strong></div>
}
