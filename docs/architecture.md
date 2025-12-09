# Архитектура системы электронной афиши

Документ описывает целевую архитектуру, доменную модель и ключевые сценарии реализации для модулей Авторизация, События и Администрирование. Предполагается стек: Kotlin (Spring Boot), PostgreSQL, Next.js (TypeScript), SMTP.

## Доменная модель
- **User**: `id`, `fullName`, `email`, `passwordHash`, `role` (USER|ADMIN), `status` (ACTIVE|DELETED), `registeredAt`.
- **EmailVerificationToken**: `id`, `userId`, `code`, `expiresAt`, `consumedAt`.
- **PasswordResetToken**: `id`, `userId`, `token`, `expiresAt`, `consumedAt`.
- **Event**: `id`, `title`, `shortDescription`, `fullDescription`, `startAt`, `endAt`, `imageUrl`, `paymentInfo`, `maxParticipants?`, `status` (ACTIVE|PAST|REJECTED), `createdBy` (admin).
- **EventParticipant**: `id`, `eventId`, `userId`, `status` (CONFIRMED|CANCELLED), `confirmedAt`, `cancelledAt`.
- **EventRating** (доп. задание): `id`, `eventId`, `userId`, `score`, `comment`, `createdAt`.

## Правила статусов событий
- `ACTIVE`: `now` между `startAt` и `endAt`.
- `PAST`: `now > endAt`.
- `REJECTED`: выставляется администратором; скрыто для обычных пользователей.
- Планировщик (Spring `@Scheduled` или DB cron) обновляет статусы ежедневно; доп. проверка при выборке.

## Backend: слои и ключевые компоненты
- **API**: REST/JSON. Аутентификация — JWT (access+refresh), шифрование паролей — BCrypt.
- **Контроллеры**:
  - `AuthController`: `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`.
  - `EventsController`: `GET /events` (фильтры `tab=my|active|past`), `GET /events/{id}`, `POST /events/{id}/confirm`, `POST /events/{id}/cancel`.
  - `AdminUsersController`: `GET /admin/users` (фильтры), `PATCH /admin/users/{id}`, `POST /admin/users/{id}/reset-password`, `DELETE /admin/users/{id}`.
  - `AdminEventsController`: CRUD событий, экспорт участников `GET /admin/events/{id}/participants/export?format=csv|xlsx`.
- **Сервисы**:
  - `UserService`: регистрация, валидации, изменение ролей, пометка удаления.
  - `AuthService`: логин, генерация токенов, проверка пароля, сброс пароля.
  - `EventService`: фильтры по вкладкам, карточка события, подтверждение/отмена участия, статусные проверки (лимит участников), генерация подсказок.
  - `MailService`: адаптер над SMTP; шаблоны писем.
  - `ExportService`: генерация CSV/XLSX участников.
- **Хранение**: Spring Data JPA, миграции Flyway/Liquibase. Индексы на `email`, `eventId/userId`.

## Валидации и бизнес-правила
- Email — валидный формат, уникальность на уровне БД (unique index) и уровня сервиса.
- Пароль — минимум 8 символов, латиница+цифры+символы; совпадение с подтверждением (в DTO).
- ФИО — только русские буквы и пробелы (`^[А-Яа-яЁё\s]+$`).
- Коды подтверждения и токены сброса — срок жизни 24 часа, после применения помечаются `consumedAt`.
- При достижении `maxParticipants` — отказ на подтверждение участия.

## Почтовые уведомления
- Регистрация: код подтверждения; после верификации — приветственное письмо.
- Авторизация: уведомление о смене пароля.
- Восстановление: письмо со ссылкой на сброс (24 часа).
- События: уведомления организатору о подтверждении/отмене участия; всем участникам при создании события, изменении данных, за 24 часа до начала.
- Единый HTML-шаблон с брендингом, переменные: `ctaUrl`, `ctaLabel`, `highlight`, `footer`.

## Frontend (Next.js)
- **Страницы**:
  - `/auth/login`, `/auth/register`, `/auth/verify`, `/auth/reset`.
  - `/events` c вкладками (по умолчанию «Мои события»), карточка `/events/[id]`.
  - `/admin/users`, `/admin/events`, `/admin/events/[id]/edit`, `/admin/events/new`.
- **Состояние**: React Query/RTK Query для API, Next Auth или кастомный JWT guard в middleware.
- **Компоненты**:
  - Навигация с пиктограммами и тултипами.
  - Таб-контрол для событий, карточка события (динамические кнопки и статус участия).
  - Формы с валидацией (`react-hook-form` + Zod), уведомления (toast), модалки подтверждения.
  - Тема светлая/тёмная (CSS variables/Tailwind `data-theme`).
- **Доступность**: ARIA-метки для форм, фокус-стейт, клавиатурная навигация.

## API фильтрация событий по вкладкам
Пример `GET /events`:
- `tab=active` — `status=ACTIVE`.
- `tab=my` — события, где текущий пользователь имеет `CONFIRMED` участника, статусы `ACTIVE|PAST`.
- `tab=past` — `status=PAST`.
- Исключение: `REJECTED` скрыты для не-админов.

## Управление пользователями (админ)
- Фильтры: `fullName` (ILIKE), `role` in, `status` in, `registeredAt` диапазон.
- Действия:
  - Редактирование ФИО и роли (email неизменяем). Логи аудита в таблицу `user_audit`.
  - Сброс пароля: генерация временного пароля, отправка на почту, требовать смену при первом входе (флаг `mustChangePassword`).
  - Удаление: статус `DELETED`; пользователи не могут аутентифицироваться.

## Управление событиями (админ)
- Создание/редактирование: валидация будущей даты начала, `endAt > startAt`, обязательность изображения и описания.
- Уведомления: всем выбранным участникам при создании; при изменениях — письмо с диффом ключевых полей.
- Экспорт участников: CSV/XLSX через `ExportService`, доступно только админу.

## Нефункциональные требования
- Безопасность: HTTPS, HTTP-only cookies для refresh, rate-limit на login/register/forgot, аудит действий админов.
- Тестирование: unit (валидации, сервисы), integration (репозитории, контроллеры), e2e (Cypress/Playwright для фронта).
- Наблюдаемость: централизованный лог (JSON), health-check `/actuator/health`, метрики Micrometer + Prometheus.

## План запуска
1. Настроить PostgreSQL и переменные окружения (`DATABASE_URL`, SMTP, JWT секреты).
2. Применить миграции (Flyway).
3. Запустить Spring Boot API (`./gradlew bootRun`), затем Next.js (`npm run dev`).
4. Создать первого администратора через seed-скрипт или ручную миграцию.
