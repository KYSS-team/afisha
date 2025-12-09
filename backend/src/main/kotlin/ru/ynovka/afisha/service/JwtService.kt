package ru.ynovka.afisha.service

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import ru.ynovka.afisha.model.User
import java.nio.charset.StandardCharsets
import java.security.Key
import java.time.Instant
import java.util.Date

@Service
class JwtService(
    private val secret: String = "fdfgdfgdfgdfr432r3rt54y56y6",
    private val accessExpirationMs: Long = 900000L,
    private val refreshExpirationMs: Long = 1209600000L,
) {
    private val key: Key = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))

    fun generateAccessToken(user: User): String = buildToken(user, accessExpirationMs, "access")

    fun generateRefreshToken(user: User): String = buildToken(user, refreshExpirationMs, "refresh")

    fun parseClaims(token: String): Claims = Jwts.parserBuilder()
        .setSigningKey(key)
        .build()
        .parseClaimsJws(token)
        .body

    private fun buildToken(user: User, durationMs: Long, type: String): String {
        val now = Instant.now()
        return Jwts.builder()
            .setSubject(user.id.toString())
            .claim("email", user.email)
            .claim("role", user.role.name)
            .claim("type", type)
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(now.plusMillis(durationMs)))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact()
    }
}
