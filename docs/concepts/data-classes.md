# Kotlin Data Classes

Kotlin data classes are classes whose primary purpose is to hold data. Declaring `data class Foo(val x: Int)` automatically generates `equals()`, `hashCode()`, `toString()`, and `copy()`. They're the Kotlin equivalent of Java POJOs or TypeScript interfaces, and are the standard way to model API request/response bodies in Spring Boot. Jackson deserializes JSON directly into data class instances, requiring the `kotlin-reflect` module or a no-arg constructor plugin.

## Official Documentation

- [Kotlin: Data Classes](https://kotlinlang.org/docs/data-classes.html)
