package ru.ynovka.afisha.service

import jakarta.validation.ValidationException
import org.springframework.security.crypto.password.PasswordEncoder
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
    private val mailService: MailService,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {
    fun register(fullName: String, email: String, password: String, confirm: String): UserProfile {
        ValidationRules.validateFullName(fullName)
        ValidationRules.validatePassword(password)
        if (password != confirm) throw ValidationException("Пароли не совпадают")
        if (userRepository.existsByEmailIgnoreCase(email)) throw ValidationException("Пользователь с таким email уже существует")

        val encodedPassword = passwordEncoder.encode(password)
        val user = userRepository.save(
            User(
                fullName = fullName,
                email = email.lowercase(),
                password = encodedPassword,
            )
        )
        closeActiveVerificationTokens(user.id!!)
        val code = generateCode()
        verificationTokenRepository.save(
            EmailVerificationToken(
                userId = user.id!!,
                code = code,
                expiresAt = Instant.now().plus(24, ChronoUnit.HOURS)
            )
        )
        mailService.send(email, "Код подтверждения", "Ваш код: $code")
        return user.toProfile()
    }

    fun verifyEmail(email: String, code: String): Boolean {
        val user = userRepository.findByEmailIgnoreCase(email) ?: throw ValidationException("Пользователь не найден")
        val token = verificationTokenRepository.findByCode(code) ?: throw ValidationException("Неверный код")
        if (token.userId != user.id) throw ValidationException("Неверный код")
        if (token.consumedAt != null) throw ValidationException("Код уже использован")
        if (token.expiresAt.isBefore(Instant.now())) throw ValidationException("Срок действия кода истёк")

        token.consumedAt = Instant.now()
        verificationTokenRepository.save(token)
        closeActiveVerificationTokens(user.id!!, except = token.id)

        user.emailVerified = true
        user.emailVerifiedAt = Instant.now()
        userRepository.save(user)

        mailService.send(user.email, "Регистрация подтверждена", "Добро пожаловать, ${'$'}{user.fullName}")
        return true
    }

    fun login(email: String, password: String): AuthResult {
        val user = userRepository.findByEmailIgnoreCase(email.lowercase())
            ?: throw ValidationException("Неверные учетные данные")
        if (user.status == UserStatus.DELETED) throw ValidationException("Учетная запись удалена")
        if (!user.emailVerified) throw ValidationException("Email не подтвержден")
        if (!passwordEncoder.matches(password, user.password)) throw ValidationException("Неверные учетные данные")

        val accessToken = jwtService.generateAccessToken(user)
        val refreshToken = jwtService.generateRefreshToken(user)
        return AuthResult(user.toProfile(), AuthTokens(accessToken, refreshToken))
    }

    fun refresh(refreshToken: String): AuthResult {
        val claims = jwtService.parseClaims(refreshToken)
        val tokenType = claims["type"]?.toString()
        if (tokenType != "refresh") throw ValidationException("Неверный токен обновления")
        val userId = UUID.fromString(claims.subject)
        val user = userRepository.findById(userId).orElseThrow { ValidationException("Пользователь не найден") }
        if (user.status == UserStatus.DELETED) throw ValidationException("Учетная запись удалена")
        if (!user.emailVerified) throw ValidationException("Email не подтвержден")

        val accessToken = jwtService.generateAccessToken(user)
        val newRefreshToken = jwtService.generateRefreshToken(user)
        return AuthResult(user.toProfile(), AuthTokens(accessToken, newRefreshToken))
    }

    fun requestPasswordReset(email: String) {
        val user = userRepository.findByEmailIgnoreCase(email.lowercase()) ?: throw ValidationException("Пользователь не найден")
        closeActiveResetTokens(user.id!!)
        val token = UUID.randomUUID().toString()
        resetTokenRepository.save(
            PasswordResetToken(
                userId = user.id!!,
                token = token,
                expiresAt = Instant.now().plus(24, ChronoUnit.HOURS)
            )
        )
        mailService.send(email, "Сброс пароля", "Перейдите по ссылке /auth/reset?token=${'$'}token для смены пароля")
    }

    fun resetPassword(token: String, newPassword: String, confirm: String) {
        ValidationRules.validatePassword(newPassword)
        if (newPassword != confirm) throw ValidationException("Пароли не совпадают")
        val reset = resetTokenRepository.findByToken(token) ?: throw ValidationException("Неверная ссылка")
        if (reset.consumedAt != null) throw ValidationException("Ссылка уже использована")
        if (reset.expiresAt.isBefore(Instant.now())) throw ValidationException("Срок действия ссылки истёк")
        val user = userRepository.findById(reset.userId).orElseThrow { ValidationException("Пользователь не найден") }

        user.password = passwordEncoder.encode(newPassword)
        user.mustChangePassword = false
        reset.consumedAt = Instant.now()

        userRepository.save(user)
        resetTokenRepository.save(reset)
        closeActiveResetTokens(user.id!!, except = reset.id)
        mailService.send(user.email, "Пароль обновлен", "Пароль был успешно изменен")
    }

    fun seedAdminIfMissing() {
        if (!userRepository.existsByRole(UserRole.ADMIN)) {
            userRepository.save(
                User(
                    fullName = "Администратор",
                    email = "admin@afisha.local",
                    password = passwordEncoder.encode("Admin123!"),
                    role = UserRole.ADMIN,
                    emailVerified = true,
                    emailVerifiedAt = Instant.now(),
                )
            )
        }
    }

    private fun closeActiveVerificationTokens(userId: UUID, except: UUID? = null) {
        verificationTokenRepository.findAllByUserIdAndConsumedAtIsNull(userId)
            .filter { except == null || it.id != except }
            .forEach {
                it.consumedAt = Instant.now()
                verificationTokenRepository.save(it)
            }
    }

    private fun closeActiveResetTokens(userId: UUID, except: UUID? = null) {
        resetTokenRepository.findAllByUserIdAndConsumedAtIsNull(userId)
            .filter { except == null || it.id != except }
            .forEach {
                it.consumedAt = Instant.now()
                resetTokenRepository.save(it)
            }
    }

    private fun User.toProfile() = UserProfile(id = id!!, fullName = fullName, email = email, role = role)

    private fun generateCode(): String = (1..6).joinToString("") { Random.nextInt(0, 9).toString() }
}

data class AuthTokens(val accessToken: String, val refreshToken: String)

data class UserProfile(val id: UUID, val fullName: String, val email: String, val role: UserRole)

data class AuthResult(val user: UserProfile, val tokens: AuthTokens)
