package ru.ynovka.afisha.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDateTime
import java.util.UUID

enum class UserRole { USER, ADMIN }
enum class UserStatus { ACTIVE, DELETED }

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    var fullName: String,

    @Column(nullable = false, unique = true)
    val email: String,

    @Column(nullable = false)
    var password: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: UserRole = UserRole.USER,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: UserStatus = UserStatus.ACTIVE,

    @Column(nullable = false)
    val registeredAt: Instant = Instant.now(),

    @Column(nullable = false)
    var emailVerified: Boolean = false,

    var emailVerifiedAt: Instant? = null,

    @Column(nullable = false)
    var mustChangePassword: Boolean = false
)

@Entity
@Table(name = "email_verification_tokens")
data class EmailVerificationToken(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val userId: UUID,

    @Column(nullable = false, unique = true)
    val code: String,

    @Column(nullable = false)
    val expiresAt: Instant,

    var consumedAt: Instant? = null
)

@Entity
@Table(name = "password_reset_tokens")
data class PasswordResetToken(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val userId: UUID,

    @Column(nullable = false, unique = true)
    val token: String,

    @Column(nullable = false)
    val expiresAt: Instant,

    var consumedAt: Instant? = null
)

enum class EventStatus { ACTIVE, PAST, REJECTED }
enum class ParticipationStatus { CONFIRMED, CANCELLED }

@Entity
@Table(name = "events")
data class Event(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    var title: String,

    var shortDescription: String?,

    @Column(nullable = false, columnDefinition = "text")
    var fullDescription: String,

    @Column(nullable = false)
    var startAt: LocalDateTime,

    @Column(nullable = false)
    var endAt: LocalDateTime,

    @Column(nullable = false)
    var imageUrl: String,

    var paymentInfo: String?,

    var maxParticipants: Int?,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: EventStatus = EventStatus.ACTIVE,

    @Column(nullable = false)
    val createdBy: UUID
)

@Entity
@Table(name = "event_participants")
data class EventParticipant(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val eventId: UUID,

    @Column(nullable = false)
    val userId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ParticipationStatus = ParticipationStatus.CONFIRMED,

    @Column(nullable = false)
    var confirmedAt: Instant = Instant.now(),

    var cancelledAt: Instant? = null
)

@Entity
@Table(name = "event_ratings")
data class EventRating(
    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(nullable = false)
    val eventId: UUID,

    @Column(nullable = false)
    val userId: UUID,

    @Column(nullable = false)
    val score: Int,

    val comment: String?,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
