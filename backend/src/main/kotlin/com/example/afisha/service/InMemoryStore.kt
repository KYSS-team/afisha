package com.example.afisha.service

import com.example.afisha.model.*
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.LocalDateTime
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Component
class InMemoryStore {
    val users: MutableMap<UUID, User> = ConcurrentHashMap()
    val verificationTokens: MutableMap<String, EmailVerificationToken> = ConcurrentHashMap()
    val resetTokens: MutableMap<String, PasswordResetToken> = ConcurrentHashMap()
    val events: MutableMap<UUID, Event> = ConcurrentHashMap()
    val participants: MutableMap<UUID, EventParticipant> = ConcurrentHashMap()
    val ratings: MutableMap<UUID, EventRating> = ConcurrentHashMap()

    init {
        seed()
    }

    private fun seed() {
        val admin = User(fullName = "Администратор Системы", email = "admin@example.com", password = "Admin123!", role = UserRole.ADMIN)
        users[admin.id] = admin
        val now = LocalDateTime.now()
        val event = Event(
            title = "День рождения отдела",
            shortDescription = "Поздравление коллег",
            fullDescription = "Встречаемся в переговорной, приносим торт.",
            startAt = now.plusDays(1),
            endAt = now.plusDays(1).plusHours(2),
            imageUrl = "https://placehold.co/600x400",
            paymentInfo = "Сбор 200р переводом на 89185123076.",
            maxParticipants = 30,
            createdBy = admin.id
        )
        events[event.id] = event
    }

    fun recalcStatuses(current: LocalDateTime = LocalDateTime.now()) {
        events.values.forEach { event ->
            event.status = when {
                event.status == EventStatus.REJECTED -> EventStatus.REJECTED
                current.isAfter(event.endAt) -> EventStatus.PAST
                current.isBefore(event.startAt) || current.isEqual(event.startAt) -> EventStatus.ACTIVE
                else -> event.status
            }
        }
    }

    fun participationForEvent(eventId: UUID): List<EventParticipant> =
        participants.values.filter { it.eventId == eventId && it.status == ParticipationStatus.CONFIRMED }

    fun participationForUser(userId: UUID): List<EventParticipant> =
        participants.values.filter { it.userId == userId && it.status == ParticipationStatus.CONFIRMED }

    fun emailTaken(email: String): Boolean = users.values.any { it.email.equals(email, ignoreCase = true) }

    fun createVerificationToken(userId: UUID, code: String, expiresAt: Instant) {
        verificationTokens[code] = EmailVerificationToken(userId = userId, code = code, expiresAt = expiresAt)
    }

    fun createResetToken(userId: UUID, token: String, expiresAt: Instant) {
        resetTokens[token] = PasswordResetToken(userId = userId, token = token, expiresAt = expiresAt)
    }
}
