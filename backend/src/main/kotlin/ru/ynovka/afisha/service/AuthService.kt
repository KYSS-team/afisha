package ru.ynovka.afisha.service

import jakarta.validation.ValidationException
import org.springframework.stereotype.Service
import ru.ynovka.afisha.model.EmailVerificationToken
import ru.ynovka.afisha.model.PasswordResetToken
import ru.ynovka.afisha.model.User
import ru.ynovka.afisha.model.UserRole
import ru.ynovka.afisha.model.UserStatus
import ru.ynovka.afisha.repository.EmailVerificationTokenRepository
import ru.ynovka.afisha.repository.PasswordResetTokenRepository
import ru.ynovka.afisha.repository.UserRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import kotlin.random.Random

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val verificationTokenRepository: EmailVerificationTokenRepository,
    private val resetTokenRepository: PasswordResetTokenRepository,
    private val mailService: MailService
) {
    fun register(fullName: String, email: String, password: String, confirm: String): User {
        ValidationRules.validateFullName(fullName)
        ValidationRules.validatePassword(password)
        if (password != confirm) throw ValidationException("Па  роли не совпадают")
        if (userRepository.existsByEmailIgnoreCase(email)) throw ValidationException("Пользователь с таким email уже существует")
        val user = userRepository.save(User(fullName = fullName, email = email.lowercase(), password = password))
        val code = generateCode()
        verificationTokenRepository.save(
            EmailVerificationToken(
                userId = user.id!!,
                code = code,
                expiresAt = Instant.now().plus(24, ChronoUnit.HOURS)
            )
        )
        mailService.send(email, "Код подтверждения", "Ваш код: $code")
        return user
    }

    fun verifyEmail(email: String, code: String): Boolean {
        val user = userRepository.findByEmailIgnoreCase(email) ?: throw ValidationException("Пользователь не найден")
        val token = verificationTokenRepository.findByCode(code) ?: throw ValidationException("Неверный код")
        if (token.userId != user.id) throw ValidationException("Неверный код")
        if (token.consumedAt != null) throw ValidationException("Код уже использован")
        if (token.expiresAt.isBefore(Instant.now())) throw ValidationException("Срок действия кода истёк")
        token.consumedAt = Instant.now()
        verificationTokenRepository.save(token)
        mailService.send(user.email, "Регистрация подтверждена", "Добро пожаловать, ${user.fullName}")
        return true
    }

    fun login(email: String, password: String): User {
        val user = userRepository.findByEmailIgnoreCase(email.lowercase())
            ?: throw ValidationException("Неверные учетные данные")
        if (user.status == UserStatus.DELETED) throw ValidationException("Учетная запись удалена")
        if (user.password != password) throw ValidationException("Неверные учетные данные")
        return user
    }

    fun requestPasswordReset(email: String) {
        val user = userRepository.findByEmailIgnoreCase(email.lowercase()) ?: throw ValidationException("Пользователь не найден")
        val token = UUID.randomUUID().toString()
        resetTokenRepository.save(
            PasswordResetToken(
                userId = user.id!!,
                token = token,
                expiresAt = Instant.now().plus(24, ChronoUnit.HOURS)
            )
        )
        mailService.send(email, "Сброс пароля", "Перейдите по ссылке /auth/reset?token=$token для смены пароля")
    }

    fun resetPassword(token: String, newPassword: String, confirm: String) {
        ValidationRules.validatePassword(newPassword)
        if (newPassword != confirm) throw ValidationException("Пароли не совпадают")
        val reset = resetTokenRepository.findByToken(token) ?: throw ValidationException("Неверная ссылка")
        if (reset.consumedAt != null) throw ValidationException("Ссылка уже использована")
        if (reset.expiresAt.isBefore(Instant.now())) throw ValidationException("Срок действия ссылки истёк")
        val user = userRepository.findById(reset.userId).orElseThrow { ValidationException("Пользователь не найден") }
        user.password = newPassword
        reset.consumedAt = Instant.now()
        userRepository.save(user)
        resetTokenRepository.save(reset)
        mailService.send(user.email, "Пароль обнолен", "Пароль был успешно изменен")
    }

    fun seedAdminIfMissing() {
        if (!userRepository.existsByRole(UserRole.ADMIN)) {
            userRepository.save(
                User(fullName = "Администратор", email = "admin@afisha.local", password = "Admin123!", role = UserRole.ADMIN)
            )
        }
    }

    private fun generateCode(): String = (1..6).joinToString("") { Random.nextInt(0, 9).toString() }
}
