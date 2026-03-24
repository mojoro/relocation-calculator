# Tutorial 10 — Headless CMS & Sanity Integration

> **Goal:** Understand headless CMS architecture, why content management matters for production applications, and how Sanity would integrate with our Angular frontend. By the end, you'll be able to explain the CMS decision tradeoff and describe a concrete integration path.

> **Prerequisites:** You've read [[tutorials/08-cost-estimation|Tutorial 08: Cost Estimation]] (neighborhood data flow) and [[tutorials/06-http-integration|Tutorial 06: HTTP Integration]] (Angular services calling the backend).

---

## What Is a Headless CMS?

A **traditional CMS** (WordPress, Drupal) stores your content *and* renders the HTML that displays it. Content and presentation are coupled — the CMS owns both.

A **headless CMS** stores and manages content, then exposes it via an API. No built-in frontend — no themes, no templates. The CMS is the "body" (content storage, editing UI, versioning) without the "head" (presentation layer).

The analogy: **a kitchen that prepares food but has no dining room.** Any restaurant — Angular app, React app, mobile app — can order from the kitchen's menu (API) and serve it however it likes.

```
Traditional CMS:   [Content] → [CMS Templates] → [HTML]
Headless CMS:      [Content] → [API] → [Angular App]
                                      → [Mobile App]
                                      → [Email Service]
```

Our neighborhood profiles are currently hardcoded in `NeighborhoodExplorerComponent` as a static TypeScript array. For a portfolio demo, this works. But imagine a production version where a Berlin city expert writes profiles and a designer curates photos — they shouldn't need a code editor to update a vibe description.

---

## Why Use a CMS at All?

### The case for static JSON

Our current approach has real advantages: zero infrastructure, compile-time type safety via the `NeighborhoodProfile` interface in [[tutorials/08-cost-estimation|cost.model.ts]], git-tracked content history, and no network dependency. For 12 profiles that John wrote himself, static JSON is the right call.

### The case for a CMS in production

1. **Non-developer editors** shouldn't need TypeScript or git to fix a typo.
2. **Content changes shouldn't require deploys** — updating a commute time shouldn't trigger a build.
3. **Versioning and scheduling** — publish at a specific time, track who changed what, preview before going live.
4. **Multi-channel delivery** — same profiles feed Angular, a mobile app, and marketing emails.

### The decision framework

| Criterion | Static JSON | Headless CMS |
|---|---|---|
| Team has developers only | Preferred | Overkill |
| Non-developers edit content | Painful | Preferred |
| Content changes weekly+ | Tolerable | Preferred |
| Content is calculated/derived | Preferred | Wrong tool |
| Content is editorial/descriptive | Fine for small sets | Preferred at scale |

Our salary calculations? Always static code — derived from tax formulas (see [[tutorials/07-spring-services|Tutorial 07]]). Our neighborhood profiles? CMS-ready editorial content.

---

## Sanity Specifically

We'd choose **Sanity** for specific reasons:

1. **Schemas defined in code.** Sanity schemas are TypeScript files in your repository — version-controlled and type-checked. This mirrors our typed-contract philosophy from [[tutorials/06-http-integration#The mirror pattern|Tutorial 06]].
2. **Real-time collaborative editing.** Google Docs-style multi-editor support.
3. **GROQ query language.** More concise than GraphQL for content fetching.
4. **Generous free tier.** 100K API requests/month, 500MB storage, 3 editor seats.
5. **Framework-agnostic.** Plain HTTP API — not tied to Next.js despite its popularity there.

**Sanity Studio** is the editing interface — a React app you deploy separately. Editors bookmark it and use it like any web app. Content is stored in Sanity's cloud and served via their CDN.

A neighborhood schema maps directly to our existing TypeScript interface:

```typescript
// Sanity schema definition
export default {
  name: 'neighborhood',
  type: 'document',
  fields: [
    { name: 'bezirk', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'displayName', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'vibe', type: 'text', rows: 3 },
    { name: 'commuteMinutes', type: 'number', validation: (Rule) => Rule.min(0).max(60) },
    { name: 'highlights', type: 'array', of: [{ type: 'string' }] },
  ],
}
```

This maps one-to-one with `NeighborhoodProfile` in `frontend/src/app/core/models/cost.model.ts`. The interface was designed CMS-ready from the start.

---

## GROQ — Sanity's Query Language

GROQ (Graph-Relational Object Queries) looks like a blend of CSS selectors and JSON:

```groq
*[_type == "neighborhood"]{displayName, vibe, highlights}
```

"All documents where `_type` equals `neighborhood`, returning only these three fields."

### Comparing to SQL and GraphQL

**SQL:** `SELECT display_name, vibe, highlights FROM neighborhoods;`

**GraphQL:**
```graphql
query { allNeighborhood { displayName, vibe, highlights } }
```

**GROQ:** `*[_type == "neighborhood"]{displayName, vibe, highlights}`

GROQ is the most concise. Filter in brackets, project in braces. More examples:

```groq
// Single neighborhood by slug
*[_type == "neighborhood" && bezirk == "pankow"][0]

// Sorted by commute time
*[_type == "neighborhood"] | order(commuteMinutes asc) { displayName, commuteMinutes }

// Computed field
*[_type == "neighborhood"]{ displayName, "highlightCount": count(highlights) }
```

GROQ queries are sent as URL-encoded parameters to Sanity's HTTP API:

```
https://PROJECT_ID.api.sanity.io/v2024-01-01/data/query/production?query=*[_type == "neighborhood"]{displayName, vibe}
```

The response is standard JSON:

```json
{
  "result": [
    { "displayName": "Mitte", "vibe": "The historic and governmental heart of Berlin..." },
    { "displayName": "Pankow", "vibe": "Family-friendly with a village feel..." }
  ]
}
```

No special client library needed — any `HttpClient.get()` works. This is what makes Sanity framework-agnostic: it's just HTTP + JSON.

---

## How It Would Integrate

### Angular service

```typescript
@Injectable({ providedIn: 'root' })
export class SanityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `https://${environment.sanityProjectId}.api.sanity.io/v2024-01-01/data/query/production`;

  fetchNeighborhoods(): Observable<NeighborhoodProfile[]> {
    const query = encodeURIComponent(
      '*[_type == "neighborhood"] | order(commuteMinutes asc) { bezirk, displayName, vibe, commuteMinutes, highlights }'
    );
    return this.http.get<{ result: NeighborhoodProfile[] }>(`${this.baseUrl}?query=${query}`).pipe(
      map(response => response.result)
    );
  }
}
```

The component wouldn't change at all — it already accepts `NeighborhoodProfile[]` via a [[tutorials/05-signals-and-state|signal]]. Only the data source changes. This is the payoff of clean interfaces: swap the data source, keep the UI.

### Backend proxy (production approach)

In production, you'd route CMS calls through the Kotlin backend rather than calling Sanity directly from Angular:

```kotlin
@RestController
@RequestMapping("/api/v1")
class ContentController(private val sanityClient: SanityClient) {

    @GetMapping("/content/neighborhoods")
    fun getNeighborhoods(): List<NeighborhoodProfile> {
        return sanityClient.query("*[_type == 'neighborhood'] | order(commuteMinutes asc)")
    }
}
```

This keeps the Sanity project ID out of the frontend bundle, allows server-side caching (Redis, in-memory), and lets the backend validate or transform CMS data before serving it.

### Keep the static fallback

Our current pattern of initializing with static data and overwriting from the API is already CMS-ready:

```typescript
readonly neighborhoods = signal<NeighborhoodProfile[]>(this.getStaticProfiles());

ngOnInit(): void {
  this.sanityService.fetchNeighborhoods().pipe(
    catchError(() => { this.error.set(err); return EMPTY; }),
  ).subscribe((profiles) => this.neighborhoods.set(profiles));
}
```

If Sanity is down, static profiles display immediately. CMS data replaces them when it arrives.

---

## When NOT to Use a CMS

**CMS-appropriate:** Neighborhood profiles, FAQ content, blog posts, testimonials — editorial content maintained by non-developers.

**NOT CMS-appropriate:**
- **Tax rates** — government-published constants that require developer verification. An editor accidentally changing the Grundfreibetrag from 12,096 to 120,096 would silently break every calculation.
- **Form validation rules** — `Validators.min(0)` is business logic, not content.
- **UI text tightly coupled to behavior** — error messages referencing specific form fields are better as i18n translation keys.

The rule: **if changing the content could break application behavior, it's code. If it only affects what the user reads, it's CMS content.**

---

## Try It Yourself

### 1. Explore GROQ in the sandbox

Visit [groq.dev](https://groq.dev) — Sanity's playground with sample datasets. Try `*[_type == "movie"]{title, releaseDate}` and `*[_type == "movie"] | order(releaseDate desc)[0..4]`.

### 2. Map our interface to a schema

Take the `NeighborhoodProfile` interface from `cost.model.ts` and write a complete Sanity schema. What additional fields would production need? (Images, map coordinates, related neighborhoods.)

### 3. Design a CMS-backed service

Sketch a `SanityNeighborhoodService` that accepts a project ID from `environment.ts`, builds GROQ queries for all neighborhoods and single-by-slug, and returns `Observable<NeighborhoodProfile[]>`.

---

## Common Mistakes

### 1. Putting calculated data in a CMS
Tax rates and formula coefficients are code constants, not editable content. A content editor changing them would silently break calculations.

### 2. Making the frontend depend directly on the CMS
Embedding the Sanity project ID in your Angular bundle exposes it in DevTools and eliminates server-side caching. Route CMS calls through your backend.

### 3. Over-structuring CMS content
Don't create 15 fields when 5 will do. Every field is a UI element an editor must understand.

### 4. Forgetting the fallback
CMS APIs fail. Networks fail. Always have static or cached data available. Our signal-initialization pattern handles this.

---

## Interview Talking Points

- **On architecture:** "I used static data for the demo but designed the data model to be CMS-ready. The `NeighborhoodProfile` interface maps directly to a Sanity schema — same field names, same types. Swapping to a CMS API would require a new service and zero component changes."

- **On headless CMS vs traditional:** "A headless CMS separates content management from presentation. The content team gets an editing interface, the dev team gets a clean API. Neither is coupled to the other's technology."

- **On the CMS boundary:** "Tax constants are code — they come from the BMF and require developer verification. Neighborhood profiles are content — editorial descriptions a city expert could maintain. Knowing where to draw that line avoids both over-engineering and under-engineering."

---

## See Also

- [[tutorials/08-cost-estimation]] — how neighborhood data flows through the app
- [[tutorials/06-http-integration]] — Angular services and the HTTP integration layer
- [[tutorials/11-docker-deployment]] — deploying the application
- [[tutorials/03-kotlin-spring-boot]] — the backend that would proxy CMS requests
- [[design-tokens]] — another example of code-defined decisions vs content
