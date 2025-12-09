package com.example.afisha.controller

import com.example.afisha.model.User
import com.example.afisha.model.UserRole
import com.example.afisha.model.UserStatus
import com.example.afisha.service.AuthService
import com.example.afisha.service.InMemoryStore
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/admin")
class AdminController(private val store: InMemoryStore, private val authService: AuthService) {
    @GetMapping("/users")
    fun users(
        @RequestParam(required = false) role: UserRole?,
        @RequestParam(required = false) status: UserStatus?,
        @RequestParam(required = false) query: String?
    ): List<User> = store.users.values.filter { user ->
        (role == null || user.role == role) &&
            (status == null || user.status == status) &&
            (query.isNullOrBlank() || user.fullName.contains(query!!, ignoreCase = true))
    }

    @PatchMapping("/users/{id}")
    fun updateUser(@PathVariable id: UUID, @RequestBody body: UpdateUserRequest): ResponseEntity<User> {
        val user = store.users[id] ?: return ResponseEntity.notFound().build()
        body.fullName?.let { user.fullName = it }
        body.role?.let { user.role = it }
        return ResponseEntity.ok(user)
    }

    @PostMapping("/users/{id}/reset-password")
    fun resetPassword(@PathVariable id: UUID, @RequestBody body: AdminResetRequest): ResponseEntity<Map<String, Any>> {
        val user = store.users[id] ?: return ResponseEntity.notFound().build()
        user.password = body.newPassword
        user.mustChangePassword = true
        authService.seedAdminIfMissing()
        return ResponseEntity.ok(mapOf("message" to "Пароль обновлен администратором"))
    }

    @DeleteMapping("/users/{id}")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        val user = store.users[id] ?: return ResponseEntity.notFound().build()
        user.status = UserStatus.DELETED
        return ResponseEntity.ok(mapOf("status" to "deleted"))
    }

    @GetMapping("/events")
    fun events(): List<Map<String, Any>> = store.events.values.map { event ->
        mapOf(
            "id" to event.id,
            "title" to event.title,
            "status" to event.status,
            "startAt" to event.startAt,
            "endAt" to event.endAt,
            "participants" to store.participationForEvent(event.id).size
        )
    }
}

data class UpdateUserRequest(
    val fullName: String?,
    val role: UserRole?
)

data class AdminResetRequest(
    @field:NotBlank val newPassword: String,
    val issuedAt: Instant? = Instant.now()
)
