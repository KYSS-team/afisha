package ru.ynovka.afisha.controller

import jakarta.validation.constraints.NotBlank
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.security.crypto.password.PasswordEncoder
import ru.ynovka.afisha.model.User
import ru.ynovka.afisha.model.UserRole
import ru.ynovka.afisha.model.UserStatus
import ru.ynovka.afisha.model.Event
import ru.ynovka.afisha.model.EventStatus
import ru.ynovka.afisha.model.EventParticipant
import ru.ynovka.afisha.repository.EventParticipantRepository
import ru.ynovka.afisha.repository.EventRepository
import ru.ynovka.afisha.repository.UserRepository
import ru.ynovka.afisha.service.AuthService
import ru.ynovka.afisha.service.EventCreateRequest
import ru.ynovka.afisha.service.EventService
import ru.ynovka.afisha.service.ValidationRules
import ru.ynovka.afisha.service.MailService
import java.time.Instant
import java.time.LocalDateTime
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/admin")
class AdminController(
    private val userRepository: UserRepository,
    private val eventRepository: EventRepository,
    private val participantRepository: EventParticipantRepository,
    private val authService: AuthService,
    private val passwordEncoder: PasswordEncoder,
    private val mailService: MailService,
    private val eventService: EventService,
) {
    @GetMapping("/users")
    fun users(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @RequestParam(required = false) role: UserRole?,
        @RequestParam(required = false) status: UserStatus?,
        @RequestParam(required = false) query: String?,
        @RequestParam(required = false) registeredFrom: Instant?,
        @RequestParam(required = false) registeredTo: Instant?,
    ): List<User> {
        ensureAdmin(roleHeader)
        return userRepository.findAll().filter { user ->
            (role == null || user.role == role) &&
                (status == null || user.status == status) &&
                (query.isNullOrBlank() || user.fullName.contains(query!!, ignoreCase = true)) &&
                (registeredFrom == null || user.registeredAt.isAfter(registeredFrom)) &&
                (registeredTo == null || user.registeredAt.isBefore(registeredTo))
        }
    }

    @PatchMapping("/users/{id}")
    fun updateUser(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @PathVariable id: UUID,
        @RequestBody body: UpdateUserRequest
    ): ResponseEntity<User> {
        ensureAdmin(roleHeader)
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        body.fullName?.let { user.fullName = it }
        body.role?.let { user.role = it }
        body.status?.let { user.status = it }
        val updated = userRepository.save(user)
        return ResponseEntity.ok(updated)
    }

    @PostMapping("/users/{id}/reset-password")
    fun resetPassword(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @PathVariable id: UUID,
        @RequestBody body: AdminResetRequest
    ): ResponseEntity<Map<String, Any>> {
        ensureAdmin(roleHeader)
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        ValidationRules.validatePassword(body.newPassword)
        user.password = passwordEncoder.encode(body.newPassword)
        user.mustChangePassword = true
        userRepository.save(user)
        authService.seedAdminIfMissing()
        mailService.send(user.email, "Сброс пароля", "Пароль был сброшен администратором")
        return ResponseEntity.ok(mapOf("message" to "Пароль обновлен администратором"))
    }

    @DeleteMapping("/users/{id}")
    fun deleteUser(@RequestHeader(value = "X-Role", required = false) roleHeader: String?, @PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        ensureAdmin(roleHeader)
        val user = userRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        user.status = UserStatus.DELETED
        userRepository.save(user)
        return ResponseEntity.ok(mapOf("status" to "deleted"))
    }

    @GetMapping("/events")
    fun events(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @RequestParam(required = false) status: EventStatus?,
    ): List<Map<String, Any>> {
        ensureAdmin(roleHeader)
        val items = if (status != null) eventRepository.findByStatus(status) else eventRepository.findAll()
        return items.map { event ->
            mapOf<String, Any>(
                "id" to event.id!!,
                "title" to event.title,
                "status" to event.status,
                "startAt" to event.startAt,
                "endAt" to event.endAt,
                "participants" to (event.id.let { participantRepository.countByEventIdAndStatus(it, ru.ynovka.afisha.model.ParticipationStatus.CONFIRMED) })
            )
        }
    }

    @GetMapping("/events/{id}")
    fun event(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @PathVariable id: UUID
    ): ResponseEntity<EventDetails> {
        ensureAdmin(roleHeader)
        val event = eventRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val participants = participantRepository.findByEventId(id)
        return ResponseEntity.ok(EventDetails(event, participants))
    }

    @PostMapping("/events")
    fun createEvent(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @RequestBody body: UpsertEventRequest
    ): ResponseEntity<EventDetails> {
        ensureAdmin(roleHeader)
        val creatorId = body.createdBy ?: resolveAdminCreatorId()
        val event = eventService.createEvent(body.toCreateRequest(), creatorId)
        val participants = syncParticipants(event.id!!, body.participantIds)
        return ResponseEntity.ok(EventDetails(event, participants))
    }

    @PutMapping("/events/{id}")
    fun updateEvent(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @PathVariable id: UUID,
        @RequestBody body: UpsertEventRequest
    ): ResponseEntity<EventDetails> {
        ensureAdmin(roleHeader)
        val existing = eventRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        eventService.updateEvent(id, body.toCreateRequest(existing.status))
        val saved = eventRepository.findById(id).orElseThrow()
        val participants = syncParticipants(id, body.participantIds)
        return ResponseEntity.ok(EventDetails(saved, participants))
    }

    @DeleteMapping("/events/{id}")
    fun deleteEvent(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @PathVariable id: UUID
    ): ResponseEntity<Map<String, Any>> {
        ensureAdmin(roleHeader)
        val event = eventRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        event.status = EventStatus.REJECTED
        eventRepository.save(event)
        return ResponseEntity.ok(mapOf("status" to "deleted"))
    }

    @GetMapping("/events/{id}/export/csv")
    fun exportParticipantsCsv(
        @RequestHeader(value = "X-Role", required = false) roleHeader: String?,
        @PathVariable id: UUID
    ): ResponseEntity<ByteArrayResource> {
        ensureAdmin(roleHeader)
        val participants = eventService.exportParticipants(id)
        val csv = "fullName;email\n" + participants.joinToString("\n")
        val resource = ByteArrayResource(csv.toByteArray())
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=participants-$id.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(resource)
    }

    private fun ensureAdmin(roleHeader: String?) {
        if (!roleHeader.equals(UserRole.ADMIN.name, ignoreCase = true)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required")
        }
    }

    private fun resolveAdminCreatorId(): UUID =
        userRepository.findAll().firstOrNull { it.role == UserRole.ADMIN }?.id
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Создайте администратора" )

    private fun syncParticipants(eventId: UUID, requested: List<UUID>?): List<EventParticipant> {
        val existing = participantRepository.findByEventId(eventId)
        val desired = requested?.toSet() ?: emptySet()
        val toRemove = existing.filter { it.userId !in desired }
        participantRepository.deleteAll(toRemove)
        val currentIds = existing.map { it.userId }.toSet()
        val toAdd = desired.filter { it !in currentIds }
        val newParticipants = toAdd.map {
            EventParticipant(eventId = eventId, userId = it)
        }
        participantRepository.saveAll(newParticipants)
        return participantRepository.findByEventId(eventId)
    }
}

data class UpdateUserRequest(
    val fullName: String?,
    val role: UserRole?,
    val status: UserStatus?
)

data class AdminResetRequest(
    @field:NotBlank val newPassword: String,
    val issuedAt: Instant? = Instant.now()
)

data class UpsertEventRequest(
    val title: String,
    val shortDescription: String?,
    val fullDescription: String,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime,
    val imageBase64: String?,
    val imageType: String?,
    val paymentInfo: String?,
    val maxParticipants: Int?,
    val status: EventStatus? = EventStatus.ACTIVE,
    val createdBy: UUID?,
    val participantIds: List<UUID>? = emptyList()
) {
    fun toCreateRequest(currentStatus: EventStatus? = null) = EventCreateRequest(
        title = title,
        shortDescription = shortDescription,
        fullDescription = fullDescription,
        startAt = startAt,
        endAt = endAt,
        imageBase64 = imageBase64,
        imageType = imageType,
        paymentInfo = paymentInfo,
        maxParticipants = maxParticipants,
        participantIds = participantIds ?: emptyList(),
        status = status ?: currentStatus
    )
}

data class EventDetails(
    val event: Event,
    val participants: List<EventParticipant>
)
