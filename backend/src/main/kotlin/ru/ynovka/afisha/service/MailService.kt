package ru.ynovka.afisha.service

import org.slf4j.LoggerFactory
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context

@Service
class MailService(
    private val mailSender: JavaMailSender,
    private val templateEngine: TemplateEngine
) {
    private val logger = LoggerFactory.getLogger(MailService::class.java)

    fun send(to: String, subject: String, body: String) {
        val message = mailSender.createMimeMessage()
        val helper = MimeMessageHelper(message, true)
        val context = Context().apply {
            setVariable("subject", subject)
            setVariable("body", body)
        }
        val html = templateEngine.process("base.html", context)
        helper.setTo(to)
        helper.setSubject(subject)
        helper.setText(html, true)
        helper.setFrom("no-reply@myshore.ru")
        try {
            mailSender.send(message)
            logger.info("Sent mail to={} subject={}", to, subject)
        } catch (ex: Exception) {
            logger.error("Failed to send email to {}: {}", to, ex.message)
            throw ex
        }
    }
}
