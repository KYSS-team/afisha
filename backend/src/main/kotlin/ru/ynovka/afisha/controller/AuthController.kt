package ru.ynovka.afisha.controller

import jakarta.validation.Valid
import jakarta.validation.ValidationException
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.ynovka.afisha.service.AuthResult
import ru.ynovka.afisha.service.AuthService
import ru.ynovka.afisha.service.UserProfile
import java.time.Duration

@RestController
@RequestMapping("/auth")
class AuthController(
    private val authService: AuthService,
    private val accessExpirationMs: Long = 900000L,
    private val refreshExpirationMs: Long = 1209600000L,
) {
    @PostMapping("/register")
    fun register(@Valid @RequestBody body: RegisterRequest): ResponseEntity<RegistrationResponse> {
        val user = authService.register(body.fullName, body.email, body.password, body.confirmPassword)
        return ResponseEntity.ok(
            RegistrationResponse(
                message = "Регистрация создана. Проверьте почту для подтверждения.",
                user = user
            )
        )
    }

    @PostMapping("/verify-email")
    fun verify(@Valid @RequestBody body: VerifyRequest): ResponseEntity<LoginResponse> {
        val result = authService.verifyEmail(body.email, body.code)
        return respondWithTokens(result, "Email подтвержден")
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody body: LoginRequest): ResponseEntity<LoginResponse> {
        val result = authService.login(body.email, body.password)
        return respondWithTokens(result, "Успешный вход")
    }

    @PostMapping("/refresh")
    fun refresh(@CookieValue("refresh_token") refreshToken: String?): ResponseEntity<LoginResponse> {
        if (refreshToken.isNullOrBlank()) throw ValidationException("Отсутствует refresh токен")
        val result = authService.refresh(refreshToken)
        return respondWithTokens(result, "Токены обновлены")
    }

    @PostMapping("/logout")
    fun logout(): ResponseEntity<Map<String, String>> {
        val expiredAccess = buildCookie("access_token", "", Duration.ZERO)
        val expiredRefresh = buildCookie("refresh_token", "", Duration.ZERO)
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, expiredAccess.toString(), expiredRefresh.toString())
            .body(mapOf("message" to "Сессия завершена"))
    }

    @PostMapping("/forgot-password")
    fun forgot(@Valid @RequestBody body: ForgotRequest): ResponseEntity<Map<String, Any>> {
        authService.requestPasswordReset(body.email)
        return ResponseEntity.ok(mapOf("message" to "Письмо отправлено"))
    }

    @PostMapping("/reset-password")
    fun reset(@Valid @RequestBody body: ResetPasswordRequest): ResponseEntity<Map<String, Any>> {
        authService.resetPassword(body.token, body.password, body.confirmPassword)
        return ResponseEntity.ok(mapOf("message" to "Пароль обновлен"))
    }

    private fun respondWithTokens(result: AuthResult, message: String): ResponseEntity<LoginResponse> {
        val accessCookie = buildCookie("access_token", result.tokens.accessToken, Duration.ofMillis(accessExpirationMs))
        val refreshCookie = buildCookie("refresh_token", result.tokens.refreshToken, Duration.ofMillis(refreshExpirationMs))
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, accessCookie.toString(), refreshCookie.toString())
            .body(LoginResponse(message = message, user = result.user))
    }

    private fun buildCookie(name: String, value: String, maxAge: Duration): ResponseCookie =
        ResponseCookie.from(name, value)
            .path("/")
            .httpOnly(true)
            .sameSite("Lax")
            .secure(false)
            .maxAge(maxAge)
            .build()
}

data class RegisterRequest(
    @field:NotBlank val fullName: String,
    @field:Email val email: String,
    @field:NotBlank val password: String,
    @field:NotBlank val confirmPassword: String
)

data class VerifyRequest(
    @field:Email val email: String,
    @field:NotBlank val code: String
)

data class LoginRequest(
    @field:Email val email: String,
    @field:NotBlank val password: String
)

data class ForgotRequest(
    @field:Email val email: String
)

data class ResetPasswordRequest(
    @field:NotBlank val token: String,
    @field:NotBlank val password: String,
    @field:NotBlank val confirmPassword: String
)

data class LoginResponse(val message: String, val user: UserProfile)

data class RegistrationResponse(val message: String, val user: UserProfile)
