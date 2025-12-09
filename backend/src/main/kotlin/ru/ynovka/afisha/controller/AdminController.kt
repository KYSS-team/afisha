package ru.ynovka.afisha.controller

import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.ynovka.afisha.model.User
import ru.ynovka.afisha.model.UserRole
import ru.ynovka.afisha.model.UserStatus
import ru.ynovka.afisha.repository.EventParticipantRepository
import ru.ynovka.afisha.repository.EventRepository
import ru.ynovka.afisha.repository.UserRepository
import ru.ynovka.afisha.service.AuthService
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/admin")
class AdminController(
    private val userRepository: UserRepository,
    private val eventRepository: EventRepository,
    private val participantRepository: EventParticipantRepository,
    private val authService: AuthService
) {
    @GetMapping("/users")
    fun users(
        @RequestParam(required = false) role: UserRole?,
        @RequestParam(required = false) status: UserStatus?,
        @RequestParam(required = false) query: String?,
    ): List<User> = userRepository.findAll().filter { user ->
        (role == null || user.role == role) &&
            (status == null || user.status == status) &&
            (query.isNullOrBlank() || user.fullName.contains(query!!, ignoreCase = true))
    }

    @PatchMapping("/users/{id}")
    fun updateUser(@PathVariable id: UUID, @RequestBody body: UpdateUserRequest): ResponseEntity<User> {
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        body.fullName?.let { user.fullName = it }
        body.role?.let { user.role = it }
        val updated = userRepository.save(user)
        return ResponseEntity.ok(updated)
    }

    @PostMapping("/users/{id}/reset-password")
    fun resetPassword(@PathVariable id: UUID, @RequestBody body: AdminResetRequest): ResponseEntity<Map<String, Any>> {
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        user.password = body.newPassword
        user.mustChangePassword = true
        userRepository.save(user)
        authService.seedAdminIfMissing()
        return ResponseEntity.ok(mapOf("message" to "Пароль обновлен администратором"))
    }

    @DeleteMapping("/users/{id}")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        user.status = UserStatus.DELETED
        userRepository.save(user)
        return ResponseEntity.ok(mapOf("status" to "deleted"))
    }

    @GetMapping("/events")
    fun events(): List<Map<String, Any>> = eventRepository.findAll().map { event ->
        mapOf(
            "id" to event.id,
            "title" to event.title,
            "status" to event.status,
            "startAt" to event.startAt,
            "endAt" to event.endAt,
            "participants" to (event.id?.let { participantRepository.countByEventIdAndStatus(it, ru.ynovka.afisha.model.ParticipationStatus.CONFIRMED) }
                ?: 0)
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
