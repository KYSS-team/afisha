package ru.ynovka.afisha.controller

import io.jsonwebtoken.JwtException
import jakarta.validation.ValidationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ValidationException::class)
    fun handleValidation(ex: ValidationException): ResponseEntity<Map<String, String?>> {
        return ResponseEntity.badRequest().body(mapOf("message" to ex.message))
    }

    @ExceptionHandler(JwtException::class)
    fun handleJwt(ex: JwtException): ResponseEntity<Map<String, String?>> {
        val message = ex.message ?: "Неверный токен"
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(mapOf("message" to message))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleMethodArgument(ex: MethodArgumentNotValidException): ResponseEntity<Map<String, Any?>> {
        val errors = ex.bindingResult.allErrors.mapNotNull { error ->
            val field = (error as? FieldError)?.field ?: error.objectName
            error.defaultMessage?.let { field to it }
        }.toMap()
        val message = errors.values.firstOrNull() ?: "Некорректные данные"
        return ResponseEntity.badRequest().body(mapOf("message" to message, "errors" to errors))
    }
}
