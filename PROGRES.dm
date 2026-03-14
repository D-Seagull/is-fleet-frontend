🔧 Крок 1 — Створення проекту

create-next-app 

****Зробдено***


Копіюємо components/ui/ з v0
Копіюємо globals.css, components.json, postcss.config.mjs, styles/, public/
Копіюємо components/theme-provider.tsx
Встановлюємо додаткові пакети (axios, zustand, react-query, socket.io-client, zod)
Створюємо .env.local
Налаштовуємо tsconfig.json (аліас @/)


🔐 Крок 2 — Типи і API клієнт

types/index.ts — всі типи під бекенд
lib/api.ts — axios + JWT interceptors
lib/socket.ts — Socket.io singleton


🔐 Крок 3 — Auth стор і middleware

store/auth.ts — Zustand (login / logout / user)
middleware.ts — захист роутів
components/providers.tsx — React Query провайдер
app/layout.tsx — кореневий layout


🔐 Крок 4 — Сторінка логіну

app/login/page.tsx — форма (email + password)
Підключення до POST /auth/login
Збереження токена → редирект на /


🔐 Крок 5 — Сторінка реєстрації

app/register/page.tsx — форма (name, email, password, companyName)
Підключення до POST /auth/register
Редирект на /login після реєстрації


🏠 Крок 6 — Dashboard Layout

app/(dashboard)/layout.tsx — layout з сайдбаром
components/app-sidebar.tsx — копія з v0 + реальний user зі стору
app/(dashboard)/page.tsx — проста головна сторінка


🚛 Крок 7 — Вантажівки: список

hooks/use-trucks.ts — GET /trucks, POST /trucks, DELETE /trucks/:id
app/(dashboard)/trucks/page.tsx — сторінка зі списком
components/trucks/truck-card.tsx — картка (з v0 + реальні дані)
components/trucks/add-truck-dialog.tsx — діалог додавання { plate, currentDriverId? }


🚛 Крок 8 — Вантажівки: деталі

app/(dashboard)/trucks/[id]/page.tsx — сторінка деталей
components/trucks/truck-info.tsx — інфо + зміна статусу PATCH /trucks/:id
components/trucks/truck-notes.tsx — нотатки POST /trucks/:id/notes, DELETE /trucks/notes/:id


👤 Крок 9 — Водії

hooks/use-users.ts — GET /users, POST /users/driver, POST /users/dispatcher
app/(dashboard)/drivers/page.tsx — список
components/drivers/drivers-table.tsx — таблиця (з v0 + реальні дані)
components/drivers/add-driver-dialog.tsx — { name, email, phone, password, language? }


🗺️ Крок 10 — Рейси

hooks/use-trips.ts — GET /trips, POST /trips, PATCH /trips/:id/status
components/trips/truck-trips.tsx — рейси вантажівки
components/trips/add-trip-dialog.tsx — { title, driverId, truckId, notes? }
Зміна статусу рейсу


📄 Крок 11 — Документи

hooks/use-documents.ts — POST /documents/upload, GET /documents/trip/:tripId
components/documents/trip-documents.tsx — документи рейсу
Upload файлу (multipart)


⏰ Крок 12 — Будильники

hooks/use-alarms.ts — POST /alarms, GET /alarms/trip/:tripId, DELETE /alarms/:id
components/alarms/trip-alarms.tsx — будильники рейсу { tripId, driverId, time, note }


💬 Крок 13 — Чат

hooks/use-chat.ts — Socket.io + React Query
app/(dashboard)/chat/page.tsx — layout чату
Список розмов зліва
Вікно повідомлень справа
Real-time через Socket.io


📢 Крок 14 — Розсилки

hooks/use-announcements.ts
app/(dashboard)/announcements/page.tsx — список
Створення розсилки POST /announcements
Чернетки і шаблони
Публікація чернетки POST /announcements/drafts/:id/publish


👥 Крок 15 — Групи

hooks/use-groups.ts
app/(dashboard)/groups/page.tsx
Групи вантажівок GET /groups/trucks
Групи диспетчерів GET /groups/dispatchers
Додавання/видалення учасників


💰 Крок 16 — Аванси

hooks/use-advances.ts
app/(dashboard)/advances/page.tsx
Створення заявки { amount, reason }
Список заявок


⚙️ Крок 17 — Налаштування

app/(dashboard)/settings/page.tsx — профіль користувача


🚀 Крок 18 — Деплой

Налаштування next.config.mjs
Vercel — підключення репо, змінні середовища
NEXT_PUBLIC_API_URL = посилання на бекенд на Render
CORS на бекенді під домен фронту