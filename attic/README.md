# Attic — archived Kotlin/Spring backend

This was the original backend for the Berlin Relocation Calculator (Kotlin 2.1, Spring Boot 3.4, Docker, deployed on Railway). It implemented the 2026 German Lohnsteuer algorithm, Berlin Bezirk cost estimation, budget allocation, and an OpenRouter-powered budget analysis.

The logic was ported into the Angular frontend (`frontend/src/app/core/calculators/`) on 2026-05-05 to eliminate hosting costs. The OpenRouter call now lives in `api/analyze.ts` as a Vercel serverless function. The OpenAPI spec at `shared/api-contracts/openapi.yaml` is still authoritative for response shapes via `openapi-typescript` codegen.

This directory is preserved for portfolio reference. It is not built, deployed, or tested.
