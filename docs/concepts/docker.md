# Docker

Docker packages applications and their dependencies into portable containers that run consistently across environments. A multi-stage `Dockerfile` first compiles the application (e.g., `gradle build`) then copies only the runtime artifacts into a lean final image, keeping image sizes small. `docker-compose.yml` orchestrates multiple containers (frontend dev server + backend) with a single `docker compose up`, wiring them together on a shared network.

## Official Documentation

- [Docker Documentation](https://docs.docker.com)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose](https://docs.docker.com/compose/)
