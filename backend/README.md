# Backend (Spring Boot, Kotlin)

REST API обрабатывает регистрацию и авторизацию пользователей, управление событиями и административные операции. Основной класс запуска — `ru.ynovka.afisha.AfishaApplication`.

## Подготовка окружения
1. Установите Java 21 и Gradle 8+.
2. Поднимите зависимые сервисы (PostgreSQL и MailHog) из корня репозитория:
   ```bash
   docker-compose up -d
   ```
3. Настройте параметры подключения. Базовые значения указаны в `src/main/resources/application.properties` и соответствуют контейнерам из docker-compose:
   - `spring.datasource.url=jdbc:postgresql://localhost:5432/afisha_db`
   - `spring.datasource.username=afisha_user`
   - `spring.datasource.password=afisha_pass`
   - `spring.mail.host=localhost`
   - `spring.mail.port=1025`

   Эти свойства можно перекрыть переменными окружения `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT` перед запуском.

## Запуск в режиме разработки
```bash
cd backend
# установка зависимостей и запуск
gradle bootRun
```

Приложение стартует на порту `8080`. Чтобы собрать исполняемый JAR и запустить вручную:
```bash
gradle build
java -jar build/libs/afisha-backend-0.0.1.jar
```

## Ключевые возможности API
- `/auth` — регистрация, подтверждение e-mail, вход, обновление токенов, сброс пароля через почту (HTTP-only cookies для access/refresh токенов).
- `/events` — листинг событий с фильтрацией по вкладкам, получение карточки и изображения, подтверждение/отмена участия, создание/редактирование, отклонение, оценка и экспорт участников.
- `/admin` — операции администратора: фильтрация и обновление пользователей, сброс паролей, модерация событий (approve/reject/delete), экспорт участников.

Валидации входных данных и бизнес-правила описаны в сервисах (`service/*`), глобальные ответы об ошибках формируются через `GlobalExceptionHandler`.
