package com.example.afisha.model

import java.time.Instant
import java.time.LocalDateTime
import java.util.UUID

enum class UserRole { USER, ADMIN }
enum class UserStatus { ACTIVE, DELETED }

data class User(
    val id: UUID = UUID.randomUUID(),
    val fullName: String,
    val email: String,
    var password: String,
    var role: UserRole = UserRole.USER,
    var status: UserStatus = UserStatus.ACTIVE,
    val registeredAt: Instant = Instant.now(),
    var mustChangePassword: Boolean = false
)

data class EmailVerificationToken(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val code: String,
    val expiresAt: Instant,
    var consumedAt: Instant? = null
)

data class PasswordResetToken(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val token: String,
    val expiresAt: Instant,
    var consumedAt: Instant? = null
)

enum class EventStatus { ACTIVE, PAST, REJECTED }
enum class ParticipationStatus { CONFIRMED, CANCELLED }

data class Event(
    val id: UUID = UUID.randomUUID(),
    var title: String,
    var shortDescription: String?,
    var fullDescription: String,
    var startAt: LocalDateTime,
    var endAt: LocalDateTime,
    var imageUrl: String,
    var paymentInfo: String?,
    var maxParticipants: Int?,
    var status: EventStatus = EventStatus.ACTIVE,
    val createdBy: UUID
)

data class EventParticipant(
    val id: UUID = UUID.randomUUID(),
    val eventId: UUID,
    val userId: UUID,
    var status: ParticipationStatus = ParticipationStatus.CONFIRMED,
    var confirmedAt: Instant = Instant.now(),
    var cancelledAt: Instant? = null
)

data class EventRating(
    val id: UUID = UUID.randomUUID(),
    val eventId: UUID,
    val userId: UUID,
    val score: Int,
    val comment: String?,
    val createdAt: Instant = Instant.now()
)
