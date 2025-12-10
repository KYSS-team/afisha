package ru.ynovka.afisha.service

import jakarta.validation.ValidationException
import org.springframework.stereotype.Service
import ru.ynovka.afisha.model.Event
import ru.ynovka.afisha.model.EventDto
import ru.ynovka.afisha.model.EventParticipant
import ru.ynovka.afisha.model.EventRating
import ru.ynovka.afisha.model.EventStatus
import ru.ynovka.afisha.model.ParticipationStatus
import ru.ynovka.afisha.model.UserRole
import ru.ynovka.afisha.repository.EventParticipantRepository
import ru.ynovka.afisha.repository.EventRatingRepository
import ru.ynovka.afisha.repository.EventRepository
import ru.ynovka.afisha.repository.UserRepository
import java.time.Instant
import java.time.LocalDateTime
import java.util.UUID
import java.util.Base64

@Service
class EventService(
    private val eventRepository: EventRepository,
    private val participantRepository: EventParticipantRepository,
    private val eventRatingRepository: EventRatingRepository,
    private val userRepository: UserRepository,
    private val mailService: MailService
) {
    fun listEvents(tab: String, userId: UUID?): List<EventDto> {
        val events = eventRepository.findAll().map { refreshStatus(it) }
        val filteredEvents = when (tab) {
            "active" -> events.filter { it.status == EventStatus.ACTIVE }
            "past" -> events.filter { it.status == EventStatus.PAST }
            else -> userId?.let { uid ->
                val myEvents = participantRepository.findByUserIdAndStatus(uid, ParticipationStatus.CONFIRMED).map { it.eventId }.toSet()
                events.filter {
                    (it.id in myEvents || it.createdBy == uid) &&
                        it.status != EventStatus.REJECTED &&
                        (it.status != EventStatus.PENDING || it.createdBy == uid)
                }
            } ?: emptyList()
        }

        val userIds = filteredEvents.map { it.createdBy }.toSet()
        val users = userRepository.findAllById(userIds).associateBy { it.id }

        val eventIds = filteredEvents.mapNotNull { it.id }
        val participantsCount = participantRepository.countByEventIdInAndStatus(eventIds, ParticipationStatus.CONFIRMED)
            .associateBy({ it.getEventId() }, { it.getCount() })

        val userParticipation = userId?.let {
            participantRepository.findByEventIdInAndUserId(eventIds, it).associateBy { it.eventId }
        } ?: emptyMap()

        return filteredEvents.map { event ->
            EventDto(
                id = event.id,
                title = event.title,
                shortDescription = event.shortDescription,
                fullDescription = event.fullDescription,
                startAt = event.startAt,
                endAt = event.endAt,
                imageUrl = event.imageUrl,
                paymentInfo = event.paymentInfo,
                maxParticipants = event.maxParticipants,
                status = event.status,
                createdBy = event.createdBy,
                createdByFullName = users[event.createdBy]?.fullName,
                participantsCount = participantsCount[event.id!!]?.toInt() ?: 0,
                participationStatus = userParticipation[event.id]?.status
            )
        }.sortedBy { it.startAt }
    }

    fun getEvent(id: UUID): Event = refreshStatus(eventRepository.findById(id).orElseThrow { ValidationException("Событие не найдено") })

    fun participationStatus(eventId: UUID, userId: UUID?): ParticipationStatus? =
        userId?.let { participantRepository.findByEventIdAndUserId(eventId, it)?.status }

    fun confirmParticipation(eventId: UUID, userId: UUID) {
        val event = getEvent(eventId)
        if (event.status != EventStatus.ACTIVE) throw ValidationException("Событие не активно")
        val currentCount = participantRepository.countByEventIdAndStatus(eventId, ParticipationStatus.CONFIRMED)
        if (event.maxParticipants != null && currentCount >= event.maxParticipants!!) throw ValidationException("Достигнут максимальный лимит участников")
        val existing = participantRepository.findByEventIdAndUserId(eventId, userId)
        if (existing != null) {
            existing.status = ParticipationStatus.CONFIRMED
            existing.cancelledAt = null
            existing.confirmedAt = Instant.now()
            participantRepository.save(existing)
        } else {
            participantRepository.save(EventParticipant(eventId = eventId, userId = userId))
        }
        mailService.send(event.createdBy.toString(), "Новый участник", "Пользователь подтвердил участие в ${event.title}")
    }

    fun cancelParticipation(eventId: UUID, userId: UUID) {
        val event = getEvent(eventId)
        val participation = participantRepository.findByEventIdAndUserId(eventId, userId)
            ?: throw ValidationException("Участие не найдено")
        participation.status = ParticipationStatus.CANCELLED
        participation.cancelledAt = Instant.now()
        participantRepository.save(participation)
        mailService.send(event.createdBy.toString(), "Отмена участия", "Пользователь отменил участие в ${event.title}")
    }

    fun createEvent(dto: EventCreateRequest, creatorId: UUID): Event {
        val creator = userRepository.findById(creatorId).orElseThrow { ValidationException("Создатель не найден") }
        validateDates(dto.startAt, dto.endAt)
        val event = Event(
            title = dto.title,
            shortDescription = dto.shortDescription,
            fullDescription = dto.fullDescription,
            startAt = dto.startAt,
            endAt = dto.endAt,
            imageData = null,
            imageContentType = null,
            paymentInfo = dto.paymentInfo,
            maxParticipants = dto.maxParticipants,
            status = resolveStatus(creator.role, dto.status),
            createdBy = creatorId
        )
        applyImage(event, dto.imageBase64, dto.imageType, required = true)
        val saved = eventRepository.save(event)
        dto.participantIds.forEach { userId ->
            participantRepository.save(EventParticipant(eventId = saved.id!!, userId = userId))
            val email = userRepository.findById(userId).map { it.email }.orElse(userId.toString())
            mailService.send(email, "Новое событие", "Вас пригласили на ${event.title}")
        }
        return saved
    }

    fun updateEvent(id: UUID, dto: EventCreateRequest) {
        val event = getEvent(id)
        validateDates(dto.startAt, dto.endAt)
        event.title = dto.title
        event.shortDescription = dto.shortDescription
        event.fullDescription = dto.fullDescription
        event.startAt = dto.startAt
        event.endAt = dto.endAt
        event.paymentInfo = dto.paymentInfo
        event.maxParticipants = dto.maxParticipants
        dto.status?.let { event.status = it }
        applyImage(event, dto.imageBase64, dto.imageType, required = false)
        refreshStatus(event)
        eventRepository.save(event)
        mailService.send(event.createdBy.toString(), "Событие обновлено", "Изменены данные события ${event.title}")
    }

    fun rejectEvent(id: UUID) {
        val event = getEvent(id)
        event.status = EventStatus.REJECTED
        eventRepository.save(event)
    }

    fun addRating(eventId: UUID, userId: UUID, score: Int, comment: String?) {
        if (score !in 1..5) throw ValidationException("Оценка 1-5")
        val event = getEvent(eventId)
        if (event.status != EventStatus.PAST) throw ValidationException("Оценивать можно только прошедшие события")
        val participation = participantRepository.findByEventIdAndUserId(eventId, userId)
        if (participation == null || participation.status != ParticipationStatus.CONFIRMED) {
            throw ValidationException("Вы не можете оставить отзыв, так как не являетесь подтвержденным участником этого события.")
        }
        eventRatingRepository.save(
            EventRating(eventId = eventId, userId = userId, score = score, comment = comment)
        )
    }

    fun exportParticipants(eventId: UUID): List<String> {
        val event = getEvent(eventId)
        val participantIds = participantRepository.findByEventIdAndStatus(event.id!!, ParticipationStatus.CONFIRMED).map { it.userId }
        val users = userRepository.findAllById(participantIds)
        return users.map { user -> "${user.fullName};${user.email}" }
    }

    private fun validateDates(start: LocalDateTime, end: LocalDateTime) {
        if (start.isBefore(LocalDateTime.now())) throw ValidationException("Дата начала должна быть в будущем")
        if (end.isBefore(start)) throw ValidationException("Дата окончания позже даты начала")
    }

    private fun refreshStatus(event: Event, current: LocalDateTime = LocalDateTime.now()): Event {
        val newStatus = when {
            event.status == EventStatus.REJECTED || event.status == EventStatus.PENDING -> event.status
            current.isAfter(event.endAt) -> EventStatus.PAST
            current.isBefore(event.startAt) || current.isEqual(event.startAt) -> EventStatus.ACTIVE
            else -> event.status
        }
        if (newStatus != event.status) {
            event.status = newStatus
            eventRepository.save(event)
        }
        return event
    }

    private fun resolveStatus(role: UserRole, requested: EventStatus?): EventStatus =
        if (role == UserRole.ADMIN) requested ?: EventStatus.ACTIVE else EventStatus.PENDING

    private fun applyImage(event: Event, imageBase64: String?, imageType: String?, required: Boolean) {
        if (imageBase64.isNullOrBlank()) {
            if (required && event.imageData.isNullOrBlank()) throw ValidationException("Требуется изображение")
            return
        }

        if (imageType.isNullOrBlank() || !imageType.startsWith("image/")) {
            throw ValidationException("Поддерживаются только изображения")
        }

        val decoded = try {
            Base64.getDecoder().decode(imageBase64)
        } catch (ex: IllegalArgumentException) {
            throw ValidationException("Некорректные данные изображения")
        }

        if (decoded.size > MAX_IMAGE_SIZE_BYTES) throw ValidationException("Размер изображения не должен превышать 2 МБ")

        event.imageData = Base64.getEncoder().encodeToString(decoded)
        event.imageContentType = imageType
    }

    companion object {
        private const val MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
    }
}

data class EventCreateRequest(
    val title: String,
    val shortDescription: String?,
    val fullDescription: String,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime,
    val imageBase64: String?,
    val imageType: String?,
    val paymentInfo: String?,
    val maxParticipants: Int?,
    val participantIds: List<UUID> = emptyList(),
    val status: EventStatus? = null,
)
