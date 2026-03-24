# Tutorial 11 — Docker & Deployment

> **Goal:** Understand containerization with Docker, multi-stage builds, docker-compose for local orchestration, nginx configuration for SPAs, and deployment strategies for frontend vs backend. By the end, you'll be able to run the full stack with `docker compose up` and explain the architecture in interviews.

> **Prerequisites:** You've read [[tutorials/03-kotlin-spring-boot|Tutorial 03: Kotlin + Spring Boot]] (backend structure) and [[tutorials/01-angular-scaffold|Tutorial 01: Angular Scaffold]] (frontend build). You do not need prior Docker experience.

---

## What Are Containers?

Imagine you build the backend on your Mac with JDK 21 and Gradle 8.13. It works. A colleague on Ubuntu with JDK 17 tries it. It breaks. The classic "it works on my machine" — containers are the engineering response: **ship the machine.**

A **container** is a lightweight, isolated environment that shares the host OS kernel. Unlike a virtual machine (which runs a complete guest OS — 1-4 GB before your app starts), a container includes only the application and its dependencies.

```
Virtual Machines:                    Containers:
┌───────────┐ ┌───────────┐        ┌───────────┐ ┌───────────┐
│   App A   │ │   App B   │        │   App A   │ │   App B   │
│  Libs A   │ │  Libs B   │        │  Libs A   │ │  Libs B   │
│  Guest OS │ │  Guest OS │        └─────┬─────┘ └─────┬─────┘
└─────┬─────┘ └─────┬─────┘              │             │
┌─────┴─────────────┴─────┐        ┌────┴─────────────┴────┐
│       Hypervisor        │        │    Container Runtime   │
├─────────────────────────┤        ├────────────────────────┤
│       Host OS           │        │       Host OS          │
└─────────────────────────┘        └────────────────────────┘
```

The analogy: **a shipping container.** Standardized (any crane lifts it), portable (Hamburg or Shanghai), self-contained (everything for delivery is inside). The ship (host OS) doesn't care what's inside.

---

## Docker Concepts

**Images** are blueprints — read-only templates containing your app and dependencies. **Containers** are running instances of images (like objects from a class). A **Dockerfile** is the recipe for building an image. A **registry** (Docker Hub) stores and distributes images.

### Layers and caching

Each Dockerfile instruction creates a **layer**. Docker caches layers. If an instruction's input hasn't changed, Docker reuses the cached result. This is why instruction order matters:

```dockerfile
COPY package.json package-lock.json ./   # Layer 2: changes rarely
RUN npm ci                                # Layer 3: cached if package.json unchanged
COPY . .                                  # Layer 4: changes on every code edit
RUN npx ng build                          # Layer 5: rebuilds because layer 4 changed
```

Copy dependency files first, install dependencies, *then* copy source code. A `.ts` change only invalidates layers 4-5. The expensive `npm ci` stays cached.

---

## Multi-Stage Builds

### The problem

A naive backend Dockerfile ships Gradle, the full JDK, and source code — ~800MB. In production, you only need the JRE and the compiled JAR — ~200MB.

### Our backend Dockerfile

Open `backend/Dockerfile`:

```dockerfile
# ── Build stage ──────────────────────────────────────────────
FROM gradle:8.13-jdk21 AS build
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon
COPY src ./src
RUN gradle bootJar --no-daemon

# ── Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

Two `FROM` instructions = two stages. The **build stage** uses the full JDK + Gradle to compile. The **runtime stage** starts from a minimal JRE Alpine image and copies only the JAR via `COPY --from=build`. Build tools are discarded — they're not in the final image.

`JAVA_OPTS` sets JVM memory limits for containers. Without them, the JVM might try to consume all available memory and get killed by the container runtime.

### Our frontend Dockerfile

Open `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Same pattern: Node 22 builds the Angular app (~1GB with node_modules), nginx serves the static output (~50MB). The production image contains only compiled HTML/CSS/JS.

---

## docker-compose

### Orchestrating multiple services

Open `docker-compose.yml`:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "4200:80"
    depends_on:
      - backend
```

**`ports: "4200:80"`** maps host port 4200 to the container's port 80 (nginx). Visit `http://localhost:4200` on your machine.

**`environment: SPRING_PROFILES_ACTIVE=docker`** sets an env var inside the container. Spring Boot uses it to activate container-specific config.

**`depends_on: backend`** starts the backend before the frontend. It doesn't wait for readiness — only for startup.

**Docker networking:** Compose creates a virtual network. Containers reach each other by service name — when nginx says `proxy_pass http://backend:8080`, `backend` resolves to the container's IP.

---

## nginx for SPAs

### The routing problem

When a user navigates to `http://localhost:4200/costs`, nginx looks for a file at `/costs`. There is no such file — the Angular app is a single `index.html` plus JS bundles. Without special config, nginx returns 404.

### The solution

Open `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**`try_files $uri $uri/ /index.html`** — For any request: (1) check if a file exists at this path, (2) check for a directory, (3) fall back to `index.html`. So `/costs` serves `index.html`, Angular boots, reads the URL, and the [[tutorials/09-wizard-navigation|Angular Router]] renders `CostEstimatorComponent`.

**Static caching** — Angular's production build adds content hashes to filenames (`main.abc123.js`), so `expires 1y` with `immutable` is safe.

**API proxy** — Requests starting with `/api/` forward to the backend container. The browser thinks it's talking to one server, eliminating [[tutorials/06-http-integration|CORS]] issues.

---

## Deploying Frontend vs Backend

They deploy separately because they have different runtime needs:

| Aspect | Frontend | Backend |
|---|---|---|
| Runtime | None (static files) | JVM process |
| Hosting | CDN (Vercel, Cloudflare) | Container (Railway, Render) |
| Cost | Free/minimal | Compute costs |
| Deploy speed | Seconds | Minutes |

**Frontend → Vercel.** Detects Angular automatically. Every push to `main` deploys. SPA routing is handled natively (like our `try_files` but platform-managed).

**Backend → Railway.** Detects the Dockerfile, builds the multi-stage image, runs the runtime stage. Environment variables configured in the dashboard.

**Environment config** bridges them — `environment.ts` sets `apiBaseUrl` to `localhost:8080` in dev and the Railway URL in production. Angular's build system swaps the file based on `--configuration=production`.

---

## Try It Yourself

### 1. Run the full stack

```bash
docker compose up --build
```

Visit `http://localhost:4200`. Navigate to the salary calculator, enter a salary, verify the backend responds. The request flows: browser -> nginx -> backend container -> nginx -> browser.

### 2. Inspect containers

```bash
docker compose ps          # List running containers
docker compose logs backend  # View backend logs
docker images              # Check image sizes — backend ~200MB, frontend ~50MB
```

### 3. Enter a running container

```bash
docker compose exec backend sh
ls -la /app/        # Only app.jar — no source code, no Gradle
java -version       # JRE 21
exit
```

This demonstrates what multi-stage builds achieve: the runtime has only what's needed.

### 4. Test layer caching

Change a component template, then `docker compose up --build frontend`. Watch which layers say "CACHED" — `npm ci` should be cached since `package.json` didn't change.

---

## Common Mistakes

### 1. Copying everything before installing dependencies
```dockerfile
# WRONG — every code change reinstalls dependencies
COPY . .
RUN npm ci
```
Copy `package.json` first. The `npm ci` layer caches until dependencies change.

### 2. Using the build image as runtime
Shipping Gradle + full JDK to production means ~800MB images, slower deploys, and larger attack surface. Always use multi-stage builds.

### 3. Hardcoding URLs between services
`http://localhost:8080` works on your machine, breaks in Docker (`http://backend:8080`) and production. Use `environment.ts` configuration.

### 4. Not setting JVM memory limits
Without `-Xms` and `-Xmx`, the JVM calculates heap from system memory and may exceed the container's limit, causing OOM kills.

### 5. Missing `.dockerignore`
Without it, `COPY . .` sends `node_modules/` (hundreds of MB) and `.git/` to the Docker daemon. Add `.dockerignore` files excluding build artifacts.

---

## Interview Talking Points

- **On multi-stage builds:** "Our backend image is ~200MB with just the JRE and JAR, versus ~800MB with build tools. Layer caching means dependency downloads are cached separately from compilation — code-only changes rebuild in seconds."

- **On nginx SPA routing:** "Angular routes are handled by JavaScript, not the file system. Our nginx config uses `try_files` to fall back to `index.html` for unknown paths, letting the Angular Router take over. The same config proxies `/api/` to the backend, eliminating CORS."

- **On deployment separation:** "Frontend is static files on a CDN — zero compute cost, global distribution. Backend needs a container runtime. Separating them means independent scaling, versioning, and deployment."

- **On docker-compose:** "A new developer runs `docker compose up` and has the full stack in minutes — no JDK install, no Gradle config. The Docker network lets services find each other by name."

---

## See Also

- [[tutorials/03-kotlin-spring-boot]] — the backend that gets containerized
- [[tutorials/01-angular-scaffold]] — the frontend build system
- [[tutorials/06-http-integration]] — API integration and environment config
- [[tutorials/10-sanity-cms]] — deploying CMS-backed services
- [[tutorials/12-onpush-and-performance]] — performance for deployed apps
- [[docker]] — Docker concept reference
