package ru.ynovka.afisha.service

import jakarta.validation.ValidationException
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Service
import ru.ynovka.afisha.model.Event
import ru.ynovka.afisha.model.EventDto
import ru.ynovka.afisha.model.EventParticipant
import ru.ynovka.afisha.model.EventRating
import ru.ynovka.afisha.model.EventStatus
import ru.ynovka.afisha.model.ParticipationStatus
import ru.ynovka.afisha.model.UserRole
import ru.ynovka.afisha.repository.EventParticipantRepository
import ru.ynovka.afisha.repository.EventRatingAggregate
import ru.ynovka.afisha.repository.EventRatingRepository
import ru.ynovka.afisha.repository.EventRepository
import ru.ynovka.afisha.repository.UserRepository
import java.io.ByteArrayOutputStream
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
        val events = eventRepository.findAll()
            .map { refreshStatus(it) }
            .filter { it.status != EventStatus.PENDING }
        val filteredEvents = when (tab) {
            "active" -> events.filter { it.status == EventStatus.ACTIVE }
            "past" -> events.filter { it.status == EventStatus.PAST }
            else -> userId?.let { uid ->
                val myEvents = participantRepository.findByUserIdAndStatus(uid, ParticipationStatus.CONFIRMED).map { it.eventId }.toSet()
                events.filter {
                    (it.id in myEvents || it.createdBy == uid) &&
                        it.status != EventStatus.REJECTED
                }
            } ?: emptyList()
        }

        val eventIds = filteredEvents.mapNotNull { it.id }
        val participantsCount = participantRepository.countByEventIdInAndStatus(eventIds, ParticipationStatus.CONFIRMED)
            .associateBy({ it.getEventId() }, { it.getCount() })

        val ratingAggregates: Map<UUID, EventRatingAggregate> = if (eventIds.isNotEmpty()) {
            eventRatingRepository.aggregateByEventId(eventIds).associateBy { it.getEventId() }
        } else {
            emptyMap()
        }

        val userParticipation = userId?.let {
            participantRepository.findByEventIdInAndUserId(eventIds, it).associateBy { it.eventId }
        } ?: emptyMap()

        val userFullNames = userRepository.findAllById(filteredEvents.map { it.createdBy }).associateBy { it.id }

        return filteredEvents.map { event ->
            toDto(
                event = event,
                participantsCount = participantsCount[event.id]?.toInt() ?: 0,
                createdByFullName = userFullNames[event.createdBy]?.fullName,
                participationStatus = userParticipation[event.id]?.status,
                averageRating = ratingAggregates[event.id]?.getAverage(),
                ratingsCount = ratingAggregates[event.id]?.getCount()?.toInt()
            )
        }.sortedBy { it.startAt }
    }

    fun getEvent(id: UUID): Event = refreshStatus(eventRepository.findById(id).orElseThrow { ValidationException("Событие не найдено") })

    fun getEventDetails(id: UUID, userId: UUID?): EventDto {
        val event = getEvent(id)
        val participants = participantRepository.countByEventIdAndStatus(id, ParticipationStatus.CONFIRMED)
        val creatorName = userRepository.findById(event.createdBy).map { it.fullName }.orElse(null)
        val participation = userId?.let { participantRepository.findByEventIdAndUserId(id, it)?.status }
        val ratingSummary = event.id?.let { ratingSummaryFor(it) } ?: RatingSummary(null, 0)

        return toDto(
            event = event,
            participantsCount = participants.toInt(),
            createdByFullName = creatorName,
            participationStatus = participation,
            averageRating = ratingSummary.average,
            ratingsCount = ratingSummary.count
        )
    }

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
        val participantIds = (dto.participantIds + creatorId).toSet()
        participantIds.forEach { userId ->
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

    fun getRatings(eventId: UUID): EventRatingsResponse {
        getEvent(eventId)
        val ratings = eventRatingRepository.findByEventId(eventId)
        if (ratings.isEmpty()) return EventRatingsResponse(average = null, count = 0, ratings = emptyList())

        val users = userRepository.findAllById(ratings.map { it.userId }).associateBy { it.id }
        val average = ratings.map { it.score }.average()
        val views = ratings
            .sortedByDescending { it.createdAt }
            .map {
                EventRatingView(
                    userId = it.userId,
                    userName = users[it.userId]?.fullName,
                    score = it.score,
                    comment = it.comment,
                    createdAt = it.createdAt
                )
            }

        return EventRatingsResponse(average = average, count = ratings.size, ratings = views)
    }

    fun exportParticipantsXlsx(eventId: UUID): ByteArray {
        val event = getEvent(eventId)
        val participants = participantRepository.findByEventId(event.id!!)
        val users = userRepository.findAllById(participants.map { it.userId }).associateBy { it.id }

        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Participants")
        val header = sheet.createRow(0)
        val headers = listOf("ФИО", "Email", "Статус", "Подтверждено", "Отменено")
        headers.forEachIndexed { index, title -> header.createCell(index).setCellValue(title) }

        participants.forEachIndexed { index, participant ->
            val row = sheet.createRow(index + 1)
            val user = users[participant.userId]
            row.createCell(0).setCellValue(user?.fullName ?: participant.userId.toString())
            row.createCell(1).setCellValue(user?.email ?: "")
            row.createCell(2).setCellValue(participant.status.name)
            row.createCell(3).setCellValue(participant.confirmedAt.toString())
            row.createCell(4).setCellValue(participant.cancelledAt?.toString() ?: "")
        }

        headers.indices.forEach { sheet.autoSizeColumn(it) }

        val output = ByteArrayOutputStream()
        workbook.use { it.write(output) }
        return output.toByteArray()
    }

    private fun toDto(
        event: Event,
        participantsCount: Int,
        createdByFullName: String?,
        participationStatus: ParticipationStatus?,
        averageRating: Double?,
        ratingsCount: Int?,
    ): EventDto =
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
            createdByFullName = createdByFullName,
            participantsCount = participantsCount,
            participationStatus = participationStatus,
            averageRating = averageRating,
            ratingsCount = ratingsCount
        )

    private fun ratingSummaryFor(eventId: UUID): RatingSummary {
        val aggregate = eventRatingRepository.aggregateByEventId(listOf(eventId)).firstOrNull()
        return if (aggregate != null) {
            RatingSummary(aggregate.getAverage(), aggregate.getCount().toInt())
        } else {
            RatingSummary(null, 0)
        }
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

data class EventRatingsResponse(
    val average: Double?,
    val count: Int,
    val ratings: List<EventRatingView>
)

data class EventRatingView(
    val userId: UUID,
    val userName: String?,
    val score: Int,
    val comment: String?,
    val createdAt: Instant,
)

data class RatingSummary(val average: Double?, val count: Int)
