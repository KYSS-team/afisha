package ru.ynovka.afisha.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.ynovka.afisha.model.EmailVerificationToken
import ru.ynovka.afisha.model.Event
import ru.ynovka.afisha.model.EventParticipant
import ru.ynovka.afisha.model.EventRating
import ru.ynovka.afisha.model.EventStatus
import ru.ynovka.afisha.model.ParticipationStatus
import ru.ynovka.afisha.model.PasswordResetToken
import ru.ynovka.afisha.model.User
import ru.ynovka.afisha.model.UserRole
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmailIgnoreCase(email: String): User?
    fun existsByEmailIgnoreCase(email: String): Boolean
    fun existsByRole(role: UserRole): Boolean
}

interface EmailVerificationTokenRepository : JpaRepository<EmailVerificationToken, UUID> {
    fun findByCode(code: String): EmailVerificationToken?
    fun existsByCode(code: String): Boolean
    fun findAllByUserIdAndConsumedAtIsNull(userId: UUID): List<EmailVerificationToken>
}

interface PasswordResetTokenRepository : JpaRepository<PasswordResetToken, UUID> {
    fun findByToken(token: String): PasswordResetToken?
    fun findAllByUserIdAndConsumedAtIsNull(userId: UUID): List<PasswordResetToken>
}

interface EventRepository : JpaRepository<Event, UUID> {
    fun findByStatus(status: EventStatus): List<Event>
}

interface EventParticipantRepository : JpaRepository<EventParticipant, UUID> {
    fun findByEventId(eventId: UUID): List<EventParticipant>
    fun findByEventIdAndStatus(eventId: UUID, status: ParticipationStatus): List<EventParticipant>
    fun findByUserIdAndStatus(userId: UUID, status: ParticipationStatus): List<EventParticipant>
    fun findByEventIdAndUserId(eventId: UUID, userId: UUID): EventParticipant?
    fun countByEventIdAndStatus(eventId: UUID, status: ParticipationStatus): Long
    fun findByEventIdInAndUserId(eventIds: List<UUID>, userId: UUID): List<EventParticipant>

    @Query("SELECT p.eventId AS eventId, count(p) AS count FROM EventParticipant p WHERE p.eventId IN :eventIds AND p.status = :status GROUP BY p.eventId")
    fun countByEventIdInAndStatus(@Param("eventIds") eventIds: List<UUID>, @Param("status") status: ParticipationStatus): List<EventParticipantsCount>
}

interface EventParticipantsCount {
    fun getEventId(): UUID
    fun getCount(): Long
}

interface EventRatingRepository : JpaRepository<EventRating, UUID> {
    fun findByEventId(eventId: UUID): List<EventRating>
    fun countByEventId(eventId: UUID): Long

    @Query("SELECT r.eventId AS eventId, avg(r.score) AS average, count(r) AS count FROM EventRating r WHERE r.eventId IN :eventIds GROUP BY r.eventId")
    fun aggregateByEventId(@Param("eventIds") eventIds: List<UUID>): List<EventRatingAggregate>
}

interface EventRatingAggregate {
    fun getEventId(): UUID
    fun getAverage(): Double
    fun getCount(): Long
}
