/**
 * Legal documents, rendered by the public pages under src/app/(legal)/.
 *
 * Kept as structured data rather than in messages/*.json: these are long prose
 * documents that only ship in two languages (Ukrainian for customers, English
 * for store reviewers), and folding them into the six UI locale files would
 * bloat every one of them for no benefit.
 *
 * PLACEHOLDERS — every `[BRACKETED]` value must be replaced before submitting
 * to Google Play or the App Store. The pages render them highlighted so an
 * unfilled one cannot ship unnoticed.
 *
 * Written for a Polish sp. z o.o.: the controller block carries KRS and NIP
 * because Polish law requires a company to identify itself by them, and UODO
 * is named as the supervisory authority. If the entity ends up being
 * registered elsewhere, those three details are what change.
 *
 * ⚠️ UNVERIFIED ASSUMPTION — confirm before filling the placeholders in.
 * This text assumes the operator is our own company. If the business is run
 * through a Polish business incubator instead, there is no such company: the
 * incubator holds the legal personality and only issues invoices, so the data
 * controller would be the founder as a natural person, or the incubator
 * itself. That changes section 1 and the Terms outright — not just the three
 * details above.
 *
 * Two questions decide it, and both are for the incubator:
 *   1. Do they permit a store developer account under their legal entity?
 *      Apple requires whoever enrols to have authority to bind the company.
 *   2. Who do they consider the data controller for an app run by a
 *      beneficiary? Their answer usually reveals whether the model fits.
 *
 * A policy naming one entity while the store listing names another is a
 * standard review rejection, so this must be settled first.
 *
 * The data inventory below is drawn from the actual code, not assumed. Notably
 * the driver app collects NO location data: there is no expo-location
 * dependency, no location permission in app.json and no geolocation call
 * anywhere in the app. Declare "no location collected" in Data Safety, and
 * keep it that way unless the code changes.
 */

export type LegalLocale = "uk" | "en";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
}

const UPDATED_UK = "Востаннє оновлено: [ДАТА]";
const UPDATED_EN = "Last updated: [DATE]";

// ─────────────────────────────────────────────────────────────── Privacy ──

export const PRIVACY: Record<LegalLocale, LegalDoc> = {
  uk: {
    title: "Політика конфіденційності",
    updated: UPDATED_UK,
    intro: [
      "Ця політика пояснює, які персональні дані обробляє IS Fleet — система керування автопарком, що складається з вебзастосунку та мобільних застосунків IS Driver і IS Manager.",
      "IS Fleet — це інструмент для бізнесу. Акаунти створює транспортна компанія для своїх працівників; самостійна реєстрація водіїв не передбачена.",
    ],
    sections: [
      {
        heading: "1. Хто відповідає за ваші дані",
        paragraphs: [
          "Оператором даних є [НАЗВА КОМПАНІЇ] sp. z o.o., зареєстрована за адресою [АДРЕСА], Польща. KRS [KRS], NIP [NIP].",
          "З будь-яких питань щодо обробки даних пишіть на [EMAIL].",
          "Зверніть увагу: щодо робочих даних працівника (рейси, повідомлення, документи) оператором виступає транспортна компанія-роботодавець, а [НАЗВА КОМПАНІЇ] діє як постачальник послуги за її дорученням.",
        ],
      },
      {
        heading: "2. Які дані ми обробляємо",
        paragraphs: ["Ми збираємо лише те, що потрібне для роботи сервісу:"],
        bullets: [
          "Дані акаунта: ім'я та прізвище, номер телефону, email, фото профілю, мова спілкування та мова інтерфейсу, часовий пояс.",
          "Робочі дані: рейси та їхні адреси, вантажівки, документи й фотографії, які ви завантажуєте, коментарі та оцінки.",
          "Листування: повідомлення в особистих, групових і рейсових чатах разом із вкладеннями.",
          "Технічні дані: токен push-сповіщень і тип пристрою (iOS/Android), статус присутності та час останньої активності, службові журнали запитів до сервера.",
          "Доступ до камери та фотогалереї запитується лише тоді, коли ви самі завантажуєте фото профілю або документ, і використовується виключно для цього.",
        ],
      },
      {
        heading: "3. Яких даних ми НЕ збираємо",
        bullets: [
          "Геолокацію. Застосунки не визначають і не передають ваше місцезнаходження — ні у фоні, ні під час використання.",
          "Платіжні дані. Сервіс не приймає платежів від користувачів застосунку.",
          "Рекламні ідентифікатори. Ми не показуємо реклами й не передаємо дані рекламним мережам.",
        ],
      },
      {
        heading: "4. Навіщо і на якій підставі",
        bullets: [
          "Надання сервісу — виконання договору з вашим роботодавцем: автентифікація, рейси, чат, сповіщення.",
          "Безпека — законний інтерес: захист від несанкціонованого доступу, журнали помилок, обмеження частоти запитів.",
          "Зв'язок — законний інтерес: службові листи на кшталт запрошення в систему чи скидання паролю.",
        ],
      },
      {
        heading: "5. Кому передаються дані",
        paragraphs: [
          "Усередині сервісу ваші дані бачать лише працівники вашої компанії відповідно до їхньої ролі.",
          "Ми залучаємо таких постачальників інфраструктури:",
        ],
        bullets: [
          "Supabase — база даних і сховище файлів.",
          "Render — хостинг серверної частини.",
          "Vercel — хостинг вебзастосунку.",
          "Twilio — надсилання SMS з одноразовим кодом входу.",
          "Resend — надсилання службових листів.",
          "Expo, Google FCM та Apple APNs — доставка push-сповіщень.",
          "Google Cloud Translation — автоматичний переклад повідомлень у чаті між мовами співрозмовників.",
          "Sentry — технічні звіти про помилки застосунку: стектрейси та адреса запиту. Вміст повідомлень, куки й заголовки авторизації не передаються.",
        ],
      },
      {
        heading: "6. Скільки зберігаємо",
        paragraphs: [
          "Дані акаунта зберігаються, доки акаунт існує. Після видалення акаунта персональні дані знеособлюються — див. розділ 8.",
          "Робочі записи (рейси, документи, листування) належать компанії-роботодавцю і зберігаються згідно з її політикою та вимогами законодавства щодо документів перевезень.",
        ],
      },
      {
        heading: "7. Ваші права",
        paragraphs: [
          "Якщо до вас застосовується GDPR, ви маєте право на доступ до своїх даних, їх виправлення, видалення, обмеження чи заперечення проти обробки, а також на перенесення даних.",
          "Щоб скористатися цими правами, напишіть на [EMAIL]. Ви також маєте право подати скаргу до наглядового органу: у Польщі це Prezes Urzędu Ochrony Danych Osobowych (UODO), вул. Stawki 2, 00-193 Варшава. Якщо ви проживаєте в іншій країні ЄС, скаргу можна подати до органу за місцем проживання.",
        ],
      },
      {
        heading: "8. Видалення акаунта",
        paragraphs: [
          "Видалити акаунт можна самостійно: у мобільному застосунку — «Налаштування» → «Видалити акаунт», у вебверсії — «Акаунт» → «Небезпечна зона».",
          "Після видалення ваші персональні дані (ім'я, телефон, email, фото) стираються, а вхід стає неможливим назавжди. Рейси та повідомлення залишаються в історії компанії у знеособленому вигляді — вони є робочими записами роботодавця.",
          "Докладна інструкція — на сторінці /delete-account.",
        ],
      },
      {
        heading: "9. Діти",
        paragraphs: [
          "Сервіс призначений виключно для працівників транспортних компаній і не розрахований на осіб молодших 16 років.",
        ],
      },
      {
        heading: "10. Зміни",
        paragraphs: [
          "Про суттєві зміни цієї політики ми повідомимо в застосунку або електронною поштою до набрання ними чинності.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: UPDATED_EN,
    intro: [
      "This policy explains what personal data IS Fleet processes. IS Fleet is a fleet-management system consisting of a web application and two mobile applications, IS Driver and IS Manager.",
      "IS Fleet is a business tool. Accounts are created by a transport company for its own staff; drivers cannot sign themselves up.",
    ],
    sections: [
      {
        heading: "1. Who is responsible for your data",
        paragraphs: [
          "The data controller is [COMPANY NAME] sp. z o.o., registered at [ADDRESS], Poland. KRS [KRS], NIP [NIP].",
          "For any question about how your data is handled, write to [EMAIL].",
          "Note that for work records (trips, messages, documents) the employing transport company is the controller, and [COMPANY NAME] acts as a processor on its instructions.",
        ],
      },
      {
        heading: "2. What we process",
        paragraphs: ["We collect only what the service needs to work:"],
        bullets: [
          "Account data: first and last name, phone number, email, profile photo, chat language and interface language, time zone.",
          "Work data: trips and their addresses, trucks, documents and photos you upload, comments and ratings.",
          "Messages: direct, group and trip-chat messages together with their attachments.",
          "Technical data: push-notification token and device type (iOS/Android), presence status and last-seen time, server request logs.",
          "Camera and photo-library access is requested only when you upload a profile picture or a document, and is used for nothing else.",
        ],
      },
      {
        heading: "3. What we do NOT collect",
        bullets: [
          "Location. The apps do not determine or transmit your position — neither in the background nor while in use.",
          "Payment data. The service takes no payments from app users.",
          "Advertising identifiers. We show no ads and share nothing with ad networks.",
        ],
      },
      {
        heading: "4. Why, and on what legal basis",
        bullets: [
          "Providing the service — performance of the contract with your employer: authentication, trips, chat, notifications.",
          "Security — legitimate interest: protection against unauthorised access, error logs, rate limiting.",
          "Communication — legitimate interest: service emails such as invitations and password resets.",
        ],
      },
      {
        heading: "5. Who we share data with",
        paragraphs: [
          "Inside the service, your data is visible only to staff of your own company, according to their role.",
          "We rely on the following infrastructure providers:",
        ],
        bullets: [
          "Supabase — database and file storage.",
          "Render — backend hosting.",
          "Vercel — web application hosting.",
          "Twilio — delivery of one-time sign-in codes by SMS.",
          "Resend — delivery of service emails.",
          "Expo, Google FCM and Apple APNs — push-notification delivery.",
          "Google Cloud Translation — automatic translation of chat messages between participants' languages.",
          "Sentry — technical error reports: stack traces and the request path. Message content, cookies and authorisation headers are not sent.",
        ],
      },
      {
        heading: "6. How long we keep it",
        paragraphs: [
          "Account data is kept for as long as the account exists. After deletion, personal data is anonymised — see section 8.",
          "Work records (trips, documents, messages) belong to the employing company and are retained under its own policy and the record-keeping rules that apply to transport documentation.",
        ],
      },
      {
        heading: "7. Your rights",
        paragraphs: [
          "Where GDPR applies to you, you have the right to access your data, to have it corrected or erased, to restrict or object to its processing, and to data portability.",
          "To exercise any of these, write to [EMAIL]. You also have the right to lodge a complaint with a supervisory authority: in Poland this is the President of the Personal Data Protection Office (UODO), ul. Stawki 2, 00-193 Warsaw. If you live in another EU country, you may complain to the authority where you reside.",
        ],
      },
      {
        heading: "8. Deleting your account",
        paragraphs: [
          "You can delete your account yourself: in the mobile apps under Settings → Delete account, and on the web under Account → Danger zone.",
          "Deletion erases your personal data (name, phone, email, photo) and makes signing in permanently impossible. Trips and messages remain in the company history in anonymised form, as they are the employer's work records.",
          "Full instructions are at /delete-account.",
        ],
      },
      {
        heading: "9. Children",
        paragraphs: [
          "The service is intended solely for employees of transport companies and is not directed at anyone under 16.",
        ],
      },
      {
        heading: "10. Changes",
        paragraphs: [
          "We will announce any material change to this policy in the app or by email before it takes effect.",
        ],
      },
    ],
  },
};

// ───────────────────────────────────────────────────────────────── Terms ──

export const TERMS: Record<LegalLocale, LegalDoc> = {
  uk: {
    title: "Умови використання",
    updated: UPDATED_UK,
    intro: [
      "Ці умови регулюють користування системою IS Fleet, яку надає [НАЗВА КОМПАНІЇ] sp. z o.o.",
    ],
    sections: [
      {
        heading: "1. Про сервіс",
        paragraphs: [
          "IS Fleet — система керування автопарком: рейси, вантажівки, документи, обмін повідомленнями та сповіщення для транспортних компаній.",
        ],
      },
      {
        heading: "2. Акаунти",
        paragraphs: [
          "Акаунти створює компанія-роботодавець. Ви відповідаєте за збереження доступу до свого акаунта й за дії, вчинені під ним.",
          "Вхід водія здійснюється за номером телефону та одноразовим кодом, менеджера — за email і паролем.",
        ],
      },
      {
        heading: "3. Допустиме використання",
        bullets: [
          "Не використовуйте сервіс протиправно або для передавання незаконного вмісту.",
          "Не намагайтеся отримати доступ до даних інших компаній чи обійти обмеження ролей.",
          "Не перешкоджайте роботі сервісу та не створюйте надмірного навантаження.",
        ],
      },
      {
        heading: "4. Дані компанії",
        paragraphs: [
          "Вміст, створений у сервісі (рейси, документи, листування), належить компанії-роботодавцю. Обробка персональних даних описана в Політиці конфіденційності.",
        ],
      },
      {
        heading: "5. Доступність і відповідальність",
        paragraphs: [
          "Сервіс надається «як є». Ми докладаємо розумних зусиль для його безперебійної роботи, але не гарантуємо відсутності перерв чи помилок.",
          "У межах, дозволених законом, [НАЗВА КОМПАНІЇ] не відповідає за непрямі збитки, втрачену вигоду чи втрату даних.",
        ],
      },
      {
        heading: "6. Припинення",
        paragraphs: [
          "Компанія-роботодавець може деактивувати акаунт працівника. Ви можете будь-коли видалити свій акаунт самостійно.",
        ],
      },
      {
        heading: "7. Право, що застосовується",
        paragraphs: [
          "До цих умов застосовується право Польщі, а спори розглядає суд за місцем реєстрації [НАЗВА КОМПАНІЇ] sp. z o.o. Це не позбавляє споживача захисту, який надають імперативні норми країни його проживання. Питання — на [EMAIL].",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: UPDATED_EN,
    intro: [
      "These terms govern use of the IS Fleet system provided by [COMPANY NAME] sp. z o.o.",
    ],
    sections: [
      {
        heading: "1. The service",
        paragraphs: [
          "IS Fleet is a fleet-management system: trips, trucks, documents, messaging and notifications for transport companies.",
        ],
      },
      {
        heading: "2. Accounts",
        paragraphs: [
          "Accounts are created by the employing company. You are responsible for keeping your access secure and for actions taken under your account.",
          "Drivers sign in with a phone number and a one-time code; managers sign in with an email and password.",
        ],
      },
      {
        heading: "3. Acceptable use",
        bullets: [
          "Do not use the service unlawfully or to transmit unlawful content.",
          "Do not attempt to reach another company's data or to bypass role restrictions.",
          "Do not disrupt the service or place an unreasonable load on it.",
        ],
      },
      {
        heading: "4. Company data",
        paragraphs: [
          "Content created in the service (trips, documents, messages) belongs to the employing company. Personal-data handling is described in the Privacy Policy.",
        ],
      },
      {
        heading: "5. Availability and liability",
        paragraphs: [
          "The service is provided “as is”. We make reasonable efforts to keep it running but do not guarantee uninterrupted or error-free operation.",
          "To the extent permitted by law, [COMPANY NAME] is not liable for indirect damages, lost profit or lost data.",
        ],
      },
      {
        heading: "6. Termination",
        paragraphs: [
          "The employing company may deactivate an employee's account. You may delete your own account at any time.",
        ],
      },
      {
        heading: "7. Governing law",
        paragraphs: [
          "These terms are governed by Polish law, and disputes are heard by the court for the registered seat of [COMPANY NAME] sp. z o.o. This does not deprive a consumer of the protection of mandatory rules in their country of residence. Questions: [EMAIL].",
        ],
      },
    ],
  },
};

// ───────────────────────────────────────────────────── Account deletion ──

export const DELETE_ACCOUNT: Record<LegalLocale, LegalDoc> = {
  uk: {
    title: "Видалення акаунта",
    updated: UPDATED_UK,
    intro: [
      "На цій сторінці описано, як видалити акаунт IS Fleet і що саме відбувається з даними. Зробити це можна самостійно, без звернення до підтримки.",
    ],
    sections: [
      {
        heading: "У мобільному застосунку",
        paragraphs: [
          "Стосується застосунків IS Driver і IS Manager.",
        ],
        bullets: [
          "Відкрийте «Налаштування» (для менеджера — «Акаунт»).",
          "Прогорніть сторінку до самого низу.",
          "Натисніть «Видалити акаунт» під кнопкою «Вийти».",
          "Підтвердьте дію у діалозі.",
        ],
      },
      {
        heading: "У вебверсії",
        bullets: [
          "Відкрийте розділ «Акаунт».",
          "Прогорніть до блоку «Небезпечна зона».",
          "Натисніть «Видалити акаунт» і підтвердьте.",
        ],
      },
      {
        heading: "Що буде видалено",
        bullets: [
          "Ім'я та прізвище, номер телефону, email, фото профілю.",
          "Пароль і всі активні сесії.",
          "Токени push-сповіщень усіх ваших пристроїв.",
          "Вхід в акаунт стає неможливим назавжди.",
        ],
      },
      {
        heading: "Що залишиться",
        paragraphs: [
          "Рейси, документи та повідомлення залишаються в історії вашої компанії у знеособленому вигляді: замість вашого імені відображається позначка видаленого користувача.",
          "Це робочі записи роботодавця, які він зобов'язаний зберігати — зокрема для звітності щодо перевезень. Вони більше не пов'язані з вашими персональними даними.",
        ],
      },
      {
        heading: "Якщо не вдається увійти",
        paragraphs: [
          "Якщо ви втратили доступ до акаунта й не можете видалити його самостійно, надішліть запит на [EMAIL] з номера телефону або email, прив'язаного до акаунта. Ми обробимо запит протягом 30 днів.",
        ],
      },
    ],
  },
  en: {
    title: "Deleting your account",
    updated: UPDATED_EN,
    intro: [
      "This page explains how to delete your IS Fleet account and what happens to your data. You can do it yourself — no need to contact support.",
    ],
    sections: [
      {
        heading: "In the mobile app",
        paragraphs: ["Applies to the IS Driver and IS Manager apps."],
        bullets: [
          "Open Settings (Account, in the manager app).",
          "Scroll to the bottom of the page.",
          "Tap “Delete account”, below the Log out button.",
          "Confirm in the dialog.",
        ],
      },
      {
        heading: "On the web",
        bullets: [
          "Open the Account section.",
          "Scroll down to the Danger zone block.",
          "Click “Delete account” and confirm.",
        ],
      },
      {
        heading: "What is deleted",
        bullets: [
          "First and last name, phone number, email, profile photo.",
          "Password and all active sessions.",
          "Push-notification tokens for all your devices.",
          "Signing in becomes permanently impossible.",
        ],
      },
      {
        heading: "What remains",
        paragraphs: [
          "Trips, documents and messages stay in your company's history in anonymised form: a deleted-user marker replaces your name.",
          "These are the employer's work records, which it is required to retain — including for transport reporting. They are no longer linked to your personal data.",
        ],
      },
      {
        heading: "If you cannot sign in",
        paragraphs: [
          "If you have lost access and cannot delete the account yourself, send a request to [EMAIL] from the phone number or email linked to the account. We will process it within 30 days.",
        ],
      },
    ],
  },
};
