package com.johnmoorman.relocation

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class RelocationApplication

fun main(args: Array<String>) {
    runApplication<RelocationApplication>(*args)
}
