package ru.ynovka.afisha.service

import org.slf4j.LoggerFactory
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

@Service
class MailService(private val mailSender: JavaMailSender) {
    private val logger = LoggerFactory.getLogger(MailService::class.java)

    fun send(to: String, subject: String, body: String) {
        val message = SimpleMailMessage().apply {
            setTo(to)
            this.subject = subject
            text = body
            from = "no-reply@myshore.ru"
        }
        try {
            mailSender.send(message)
            logger.info("Sent mail to={} subject={} body={}", to, subject, body)
        } catch (ex: Exception) {
            logger.error("Failed to send email to {}: {}", to, ex.message)
            throw ex
        }
    }
}
