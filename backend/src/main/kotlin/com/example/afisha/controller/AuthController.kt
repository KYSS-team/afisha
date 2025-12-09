package com.example.afisha.controller

import com.example.afisha.model.User
import com.example.afisha.service.AuthService
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/auth")
class AuthController(private val authService: AuthService) {
    @PostMapping("/register")
    fun register(@Valid @RequestBody body: RegisterRequest): User =
        authService.register(body.fullName, body.email, body.password, body.confirmPassword)

    @PostMapping("/verify-email")
    fun verify(@Valid @RequestBody body: VerifyRequest): ResponseEntity<Map<String, Any>> {
        authService.verifyEmail(body.email, body.code)
        return ResponseEntity.ok(mapOf("success" to true))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody body: LoginRequest): User = authService.login(body.email, body.password)

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
