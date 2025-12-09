package ru.ynovka.afisha.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class MailService {
    private val logger = LoggerFactory.getLogger(MailService::class.java)

    fun send(to: String, subject: String, body: String) {
        println(111111)
        logger.info("[mail] to={} subject={} body={}", to, subject, body)
    }
}
