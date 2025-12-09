package com.example.afisha.service

import com.example.afisha.model.*
import jakarta.validation.ValidationException
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.UUID

@Service
class EventService(private val store: InMemoryStore, private val mailService: MailService) {
    fun listEvents(tab: String, userId: UUID?): List<Event> {
        store.recalcStatuses()
        return when (tab) {
            "active" -> store.events.values.filter { it.status == EventStatus.ACTIVE }
            "past" -> store.events.values.filter { it.status == EventStatus.PAST }
            else -> userId?.let { uid ->
                val myEvents = store.participationForUser(uid).map { it.eventId }.toSet()
                store.events.values.filter { it.id in myEvents && it.status != EventStatus.REJECTED }
            } ?: emptyList()
        }.sortedBy { it.startAt }
    }

    fun getEvent(id: UUID): Event = store.events[id] ?: throw ValidationException("Событие не найдено")

    fun participationStatus(eventId: UUID, userId: UUID?): ParticipationStatus? =
        store.participants.values.firstOrNull { it.eventId == eventId && it.userId == userId }?.status

    fun confirmParticipation(eventId: UUID, userId: UUID) {
        val event = getEvent(eventId)
        store.recalcStatuses()
        if (event.status != EventStatus.ACTIVE) throw ValidationException("Событие не активно")
        val currentCount = store.participationForEvent(eventId).size
        if (event.maxParticipants != null && currentCount >= event.maxParticipants!!) throw ValidationException("Достигнут максимальный лимит участников")
        val existing = store.participants.values.firstOrNull { it.eventId == eventId && it.userId == userId }
        if (existing != null) {
            existing.status = ParticipationStatus.CONFIRMED
            existing.cancelledAt = null
            existing.confirmedAt = java.time.Instant.now()
        } else {
            store.participants[UUID.randomUUID()] = EventParticipant(eventId = eventId, userId = userId)
        }
        mailService.send(event.createdBy.toString(), "Новый участник", "Пользователь подтвердил участие в ${event.title}")
    }

    fun cancelParticipation(eventId: UUID, userId: UUID) {
        val event = getEvent(eventId)
        val participation = store.participants.values.firstOrNull { it.eventId == eventId && it.userId == userId }
            ?: throw ValidationException("Участие не найдено")
        participation.status = ParticipationStatus.CANCELLED
        participation.cancelledAt = java.time.Instant.now()
        mailService.send(event.createdBy.toString(), "Отмена участия", "Пользователь отменил участие в ${event.title}")
    }

    fun createEvent(dto: EventCreateRequest, creatorId: UUID): Event {
        validateDates(dto.startAt, dto.endAt)
        val event = Event(
            title = dto.title,
            shortDescription = dto.shortDescription,
            fullDescription = dto.fullDescription,
            startAt = dto.startAt,
            endAt = dto.endAt,
            imageUrl = dto.imageUrl,
            paymentInfo = dto.paymentInfo,
            maxParticipants = dto.maxParticipants,
            createdBy = creatorId
        )
        store.events[event.id] = event
        dto.participantIds.forEach { userId ->
            store.participants[UUID.randomUUID()] = EventParticipant(eventId = event.id, userId = userId)
            mailService.send(store.users[userId]?.email ?: userId.toString(), "Новое событие", "Вас пригласили на ${event.title}")
        }
        return event
    }

    fun updateEvent(id: UUID, dto: EventCreateRequest) {
        val event = getEvent(id)
        validateDates(dto.startAt, dto.endAt)
        event.title = dto.title
        event.shortDescription = dto.shortDescription
        event.fullDescription = dto.fullDescription
        event.startAt = dto.startAt
        event.endAt = dto.endAt
        event.imageUrl = dto.imageUrl
        event.paymentInfo = dto.paymentInfo
        event.maxParticipants = dto.maxParticipants
        store.recalcStatuses()
        mailService.send(event.createdBy.toString(), "Событие обновлено", "Изменены данные события ${event.title}")
    }

    fun rejectEvent(id: UUID) {
        val event = getEvent(id)
        event.status = EventStatus.REJECTED
    }

    fun addRating(eventId: UUID, userId: UUID, score: Int, comment: String?) {
        if (score !in 1..5) throw ValidationException("Оценка 1-5")
        val event = getEvent(eventId)
        if (event.status != EventStatus.PAST) throw ValidationException("Оценивать можно только прошедшие события")
        if (store.participationForUser(userId).none { it.eventId == eventId }) throw ValidationException("Нет участия")
        store.ratings[UUID.randomUUID()] = EventRating(eventId = eventId, userId = userId, score = score, comment = comment)
    }

    fun exportParticipants(eventId: UUID): List<String> {
        val event = getEvent(eventId)
        val participantIds = store.participationForEvent(event.id).map { it.userId }
        return participantIds.mapNotNull { store.users[it]?.let { user -> "${user.fullName};${user.email}" } }
    }

    private fun validateDates(start: LocalDateTime, end: LocalDateTime) {
        if (start.isBefore(LocalDateTime.now())) throw ValidationException("Дата начала должна быть в будущем")
        if (end.isBefore(start)) throw ValidationException("Дата окончания позже даты начала")
    }
}

data class EventCreateRequest(
    val title: String,
    val shortDescription: String?,
    val fullDescription: String,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime,
    val imageUrl: String,
    val paymentInfo: String?,
    val maxParticipants: Int?,
    val participantIds: List<UUID> = emptyList()
)
