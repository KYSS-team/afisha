package com.example.afisha.service

import com.example.afisha.model.PasswordResetToken
import com.example.afisha.model.User
import com.example.afisha.model.UserRole
import com.example.afisha.model.UserStatus
import jakarta.validation.ValidationException
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import kotlin.random.Random

@Service
class AuthService(
    private val store: InMemoryStore,
    private val mailService: MailService
) {
    fun register(fullName: String, email: String, password: String, confirm: String): User {
        ValidationRules.validateFullName(fullName)
        ValidationRules.validatePassword(password)
        if (password != confirm) throw ValidationException("Пароли не совпадают")
        if (store.emailTaken(email)) throw ValidationException("Пользователь с таким email уже существует")
        val user = User(fullName = fullName, email = email.lowercase(), password = password)
        store.users[user.id] = user
        val code = generateCode()
        store.createVerificationToken(user.id, code, Instant.now().plus(24, ChronoUnit.HOURS))
        mailService.send(email, "Код подтверждения", "Ваш код: $code")
        return user
    }

    fun verifyEmail(email: String, code: String): Boolean {
        val user = store.users.values.firstOrNull { it.email == email.lowercase() } ?: throw ValidationException("Пользователь не найден")
        val token = store.verificationTokens[code] ?: throw ValidationException("Неверный код")
        if (token.userId != user.id) throw ValidationException("Неверный код")
        if (token.consumedAt != null) throw ValidationException("Код уже использован")
        if (token.expiresAt.isBefore(Instant.now())) throw ValidationException("Срок действия кода истёк")
        token.consumedAt = Instant.now()
        mailService.send(user.email, "Регистрация подтверждена", "Добро пожаловать, ${user.fullName}")
        return true
    }

    fun login(email: String, password: String): User {
        val user = store.users.values.firstOrNull { it.email == email.lowercase() }
            ?: throw ValidationException("Неверные учетные данные")
        if (user.status == UserStatus.DELETED) throw ValidationException("Учетная запись удалена")
        if (user.password != password) throw ValidationException("Неверные учетные данные")
        return user
    }

    fun requestPasswordReset(email: String) {
        val user = store.users.values.firstOrNull { it.email == email.lowercase() }
            ?: throw ValidationException("Пользователь не найден")
        val token = UUID.randomUUID().toString()
        store.createResetToken(user.id, token, Instant.now().plus(24, ChronoUnit.HOURS))
        mailService.send(email, "Сброс пароля", "Перейдите по ссылке /auth/reset?token=$token для смены пароля")
    }

    fun resetPassword(token: String, newPassword: String, confirm: String) {
        ValidationRules.validatePassword(newPassword)
        if (newPassword != confirm) throw ValidationException("Пароли не совпадают")
        val reset = store.resetTokens[token] ?: throw ValidationException("Неверная ссылка")
        if (reset.consumedAt != null) throw ValidationException("Ссылка уже использована")
        if (reset.expiresAt.isBefore(Instant.now())) throw ValidationException("Срок действия ссылки истёк")
        val user = store.users[reset.userId] ?: throw ValidationException("Пользователь не найден")
        user.password = newPassword
        reset.consumedAt = Instant.now()
        mailService.send(user.email, "Пароль обновлен", "Пароль был успешно изменен")
    }

    fun seedAdminIfMissing() {
        if (store.users.values.none { it.role == UserRole.ADMIN }) {
            val admin = User(fullName = "Администратор", email = "admin@afisha.local", password = "Admin123!", role = UserRole.ADMIN)
            store.users[admin.id] = admin
        }
    }

    private fun generateCode(): String = (1..6).joinToString("") { Random.nextInt(0, 9).toString() }
}
