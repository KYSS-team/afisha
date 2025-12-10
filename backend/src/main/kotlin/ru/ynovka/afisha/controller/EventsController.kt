package ru.ynovka.afisha.controller

import ru.ynovka.afisha.model.ParticipationStatus
import ru.ynovka.afisha.model.Event
import jakarta.validation.ValidationException
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime
import java.util.UUID
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import ru.ynovka.afisha.model.EventDto
import java.util.Base64
import ru.ynovka.afisha.service.EventCreateRequest
import ru.ynovka.afisha.service.EventService

@RestController
@RequestMapping("/events")
class EventsController(private val service: EventService) {
    @GetMapping
    fun list(@RequestParam(defaultValue = "my") tab: String, @RequestParam(required = false) userId: UUID?): List<EventDto> =
        service.listEvents(tab, userId)

    @GetMapping("/active")
    fun active(@RequestParam(required = false) userId: UUID?): List<EventDto> = service.listEvents("active", userId)

    @GetMapping("/past")
    fun past(@RequestParam(required = false) userId: UUID?): List<EventDto> = service.listEvents("past", userId)

    @GetMapping("/{id}/image")
    fun image(@PathVariable id: UUID): ResponseEntity<ByteArrayResource> {
        val event = service.getEvent(id)
        val data = event.imageData ?: return ResponseEntity.notFound().build()
        val contentType = event.imageContentType ?: MediaType.IMAGE_JPEG_VALUE
        val resource = ByteArrayResource(Base64.getDecoder().decode(data))
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .contentType(MediaType.parseMediaType(contentType))
            .body(resource)
    }

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID, @RequestParam(required = false) userId: UUID?): EventDto =
        service.getEventDetails(id, userId)

    @GetMapping("/{id}/status")
    fun participationStatus(@PathVariable id: UUID, @RequestParam userId: UUID?): ParticipationStatus? =
        service.participationStatus(id, userId)

    @PostMapping("/{id}/confirm")
    fun confirm(@PathVariable id: UUID, @RequestParam userId: UUID): ResponseEntity<Map<String, Any>> {
        service.confirmParticipation(id, userId)
        return ResponseEntity.ok(mapOf("message" to "Участие подтверждено"))
    }

    @PostMapping("/{id}/cancel")
    fun cancel(@PathVariable id: UUID, @RequestParam userId: UUID): ResponseEntity<Map<String, Any>> {
        service.cancelParticipation(id, userId)
        return ResponseEntity.ok(mapOf("message" to "Участие отменено"))
    }

    @PostMapping
    fun create(@Valid @RequestBody body: EventRequest, @RequestParam creatorId: UUID): Event =
        service.createEvent(body.toCreateRequest(), creatorId)

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @Valid @RequestBody body: EventRequest): ResponseEntity<Map<String, Any>> {
        service.updateEvent(id, body.toCreateRequest())
        return ResponseEntity.ok(mapOf("message" to "Обновлено"))
    }

    @PostMapping("/{id}/reject")
    fun reject(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        service.rejectEvent(id)
        return ResponseEntity.ok(mapOf("status" to "rejected"))
    }

    @PostMapping(value = ["/{id}/rate", "/{id}/ratings"])
    fun rate(
        @PathVariable id: UUID,
        @Valid @RequestBody body: RatingRequest,
        @RequestParam(required = false) userId: UUID?
    ): ResponseEntity<Map<String, Any>> {
        val authorId = body.userId ?: userId ?: throw ValidationException("userId is required")
        service.addRating(id, authorId, body.score, body.comment)
        return ResponseEntity.ok(mapOf("message" to "Оценка сохранена"))
    }

    @GetMapping("/{id}/export")
    fun export(@PathVariable id: UUID): List<String> = service.exportParticipants(id)
}

data class EventRequest(
    @field:NotBlank val title: String,
    val shortDescription: String?,
    @field:NotBlank val fullDescription: String,
    @field:NotBlank val startAt: String,
    @field:NotBlank val endAt: String,
    val imageBase64: String?,
    val imageType: String?,
    val paymentInfo: String?,
    val maxParticipants: Int?,
    val participantIds: List<UUID> = emptyList()
) {
    fun toCreateRequest() = EventCreateRequest(
        title = title,
        shortDescription = shortDescription,
        fullDescription = fullDescription,
        startAt = LocalDateTime.parse(startAt),
        endAt = LocalDateTime.parse(endAt),
        imageBase64 = imageBase64,
        imageType = imageType,
        paymentInfo = paymentInfo,
        maxParticipants = maxParticipants,
        participantIds = participantIds
    )
}

data class RatingRequest(
    val userId: UUID?,
    val score: Int,
    val comment: String?
)
