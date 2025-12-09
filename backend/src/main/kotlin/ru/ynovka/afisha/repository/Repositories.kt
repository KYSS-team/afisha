package ru.ynovka.afisha.repository

import org.springframework.data.jpa.repository.JpaRepository
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
}

interface EventRatingRepository : JpaRepository<EventRating, UUID>
