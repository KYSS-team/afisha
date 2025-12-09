package com.example.afisha.controller

import com.example.afisha.model.Event
import com.example.afisha.model.ParticipationStatus
import com.example.afisha.service.EventCreateRequest
import com.example.afisha.service.EventService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/events")
class EventsController(private val service: EventService) {
    @GetMapping
    fun list(@RequestParam(defaultValue = "my") tab: String, @RequestParam(required = false) userId: UUID?): List<Event> =
        service.listEvents(tab, userId)

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): Event = service.getEvent(id)

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

    @PostMapping("/{id}/rate")
    fun rate(@PathVariable id: UUID, @Valid @RequestBody body: RatingRequest): ResponseEntity<Map<String, Any>> {
        service.addRating(id, body.userId, body.score, body.comment)
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
    @field:NotBlank val imageUrl: String,
    val paymentInfo: String?,
    val maxParticipants: Int?,
    val participantIds: List<UUID> = emptyList()
) {
    fun toCreateRequest() = EventCreateRequest(
        title = title,
        shortDescription = shortDescription,
        fullDescription = fullDescription,
        startAt = java.time.LocalDateTime.parse(startAt),
        endAt = java.time.LocalDateTime.parse(endAt),
        imageUrl = imageUrl,
        paymentInfo = paymentInfo,
        maxParticipants = maxParticipants,
        participantIds = participantIds
    )
}

data class RatingRequest(
    val userId: UUID,
    val score: Int,
    val comment: String?
)
