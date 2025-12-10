package ru.ynovka.afisha.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.ynovka.afisha.model.EventDto
import ru.ynovka.afisha.service.EventService
import java.util.UUID

@RestController
@RequestMapping("/users")
class UserEventsController(private val service: EventService) {
    @GetMapping("/{userId}/events")
    fun userEvents(@PathVariable userId: UUID): List<EventDto> = service.listEvents("my", userId)
}
