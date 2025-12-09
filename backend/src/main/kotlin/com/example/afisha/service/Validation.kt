package com.example.afisha.service

import jakarta.validation.ValidationException

object ValidationRules {
    private val fullNameRegex = Regex("^[А-Яа-яЁё\\s]+$")
    private val passwordRegex = Regex("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#\$%^&*()_+=\\-]).{8,}")

    fun validateFullName(fullName: String) {
        if (!fullNameRegex.matches(fullName)) throw ValidationException("ФИО должно содержать только русские буквы")
    }

    fun validatePassword(password: String) {
        if (!passwordRegex.matches(password)) throw ValidationException("Пароль должен быть от 8 символов с латиницей, цифрами и символами")
    }
}
