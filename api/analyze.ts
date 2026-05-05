declare const process: { env: Record<string, string | undefined> };

type AnalysisContext = {
  netMonthlySalary: number;
  grossAnnualSalary: number;
  taxClass: string;
  bezirk: string;
  bezirkDisplayName?: string;
  rooms: number;
  categories: { key: string; label: string; percentage: number; total: number }[];
  totalAllocated?: number;
  remainingMonthly?: number;
  rentRange: { min: number; max: number; median: number };
  neighborhoodVibe: string;
  neighborhoodHighlights?: string[];
  hasChildren?: boolean;
  childCount?: number;
};

const SECTION_KEYS = new Set([
  'daily-life', 'housing', 'food-and-dining', 'transport-and-mobility',
  'leisure-and-culture', 'financial-health', 'tips',
]);
const SENTIMENTS = new Set(['positive', 'neutral', 'caution']);

const SYSTEM_PROMPT = `You are an experienced Berlin relocation financial advisor who has helped hundreds of expats settle in the city. You give practical, specific advice grounded in real Berlin costs, neighborhoods, and bureaucracy.

Return a JSON object with this exact structure — no markdown fences, no commentary outside the JSON:

{
  "sections": [
    { "key": "daily-life", "heading": "...", "body": "...", "sentiment": "positive" }
  ]
}

You MUST include exactly 7 sections with these keys in this order:
  1. "daily-life"
  2. "housing"
  3. "food-and-dining"
  4. "transport-and-mobility"
  5. "leisure-and-culture"
  6. "financial-health"
  7. "tips"

Each section's "sentiment" must be exactly one of: "positive", "neutral", "caution".

For the body field, use markdown: **bold** for emphasis, and bullet points with "- " prefix (never use "* "). Include specific EUR amounts. Reference real Berlin places, markets, transit lines, and neighborhoods. The tone should be warm but honest — like advice from a friend who lives there.

The "tips" section body should be a markdown bullet list where each item starts with a bold label, e.g. "- **Anmeldung first:** Register your address...".`;

function buildUserPrompt(ctx: AnalysisContext): string {
  const bezirkName = ctx.bezirkDisplayName ?? ctx.bezirk;
  const totalAllocated = ctx.totalAllocated ?? ctx.categories.reduce((s, c) => s + c.total, 0);
  const remaining = ctx.remainingMonthly ?? (ctx.netMonthlySalary - totalAllocated);
  const categorySummary = ctx.categories
    .map((c) => `  - ${c.label} (${c.key}): ${c.percentage.toFixed(1)}% = EUR ${Math.round(c.total)}/month`)
    .join('\n');
  const highlights = ctx.neighborhoodHighlights?.join(', ') ?? 'no highlights available';
  const childInfo = ctx.hasChildren && (ctx.childCount ?? 0) > 0
    ? `Has children: yes (${ctx.childCount} child/children)`
    : 'Has children: no';

  return `Analyze this budget for someone relocating to Berlin:

**Income:**
- Gross annual salary: EUR ${ctx.grossAnnualSalary}
- Net monthly salary: EUR ${Math.round(ctx.netMonthlySalary)}
- Tax class: ${ctx.taxClass}

**Location:**
- Bezirk: ${bezirkName}
- Vibe: ${ctx.neighborhoodVibe}
- Apartment: ${ctx.rooms} rooms
- Highlights: ${highlights}

**Budget allocation:**
${categorySummary}
- Total allocated: EUR ${Math.round(totalAllocated)}/month
- Remaining unallocated: EUR ${Math.round(remaining)}/month

**Key transport info:**
- The Deutschlandticket costs EUR 63/month and provides unlimited access to all local and regional public transit nationwide.

**Rent market (${ctx.rooms}-room in ${bezirkName}):**
- Min: EUR ${Math.round(ctx.rentRange.min)}/month
- Median: EUR ${Math.round(ctx.rentRange.median)}/month
- Max: EUR ${Math.round(ctx.rentRange.max)}/month

**Personal:**
- ${childInfo}`;
}

function parseAnalysis(content: string): { sections: { key: string; heading: string; body: string; sentiment: string }[] } | null {
  const cleaned = content
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const sections = (parsed as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return null;

  const valid = sections.filter((s): s is { key: string; heading: string; body: string; sentiment: string } =>
    !!s && typeof s === 'object'
    && typeof (s as { key: unknown }).key === 'string' && SECTION_KEYS.has((s as { key: string }).key)
    && typeof (s as { heading: unknown }).heading === 'string' && (s as { heading: string }).heading.length > 0
    && typeof (s as { body: unknown }).body === 'string' && (s as { body: string }).body.length > 0,
  ).map((s) => ({
    key: s.key, heading: s.heading, body: s.body,
    sentiment: SENTIMENTS.has(s.sentiment) ? s.sentiment : 'neutral',
  }));

  const byKey = new Map<string, { key: string; heading: string; body: string; sentiment: string }>();
  for (const s of valid) if (!byKey.has(s.key)) byKey.set(s.key, s);
  if (byKey.size !== SECTION_KEYS.size) return null;
  return { sections: Array.from(byKey.values()) };
}

function isValidContext(x: unknown): x is AnalysisContext {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!num(o['netMonthlySalary']) || !num(o['grossAnnualSalary']) || !num(o['rooms'])) return false;
  if (typeof o['taxClass'] !== 'string' || typeof o['bezirk'] !== 'string') return false;
  if (typeof o['neighborhoodVibe'] !== 'string') return false;
  const rr = o['rentRange'];
  if (!rr || typeof rr !== 'object') return false;
  const r = rr as Record<string, unknown>;
  if (!num(r['min']) || !num(r['max']) || !num(r['median'])) return false;
  if (!Array.isArray(o['categories']) || o['categories'].length > 50) return false;
  for (const c of o['categories'] as unknown[]) {
    if (!c || typeof c !== 'object') return false;
    const cat = c as Record<string, unknown>;
    if (typeof cat['key'] !== 'string' || typeof cat['label'] !== 'string') return false;
    if (!num(cat['percentage']) || !num(cat['total'])) return false;
  }
  return true;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const apiKey = process.env['OPENROUTER_API_KEY'];
  const model = process.env['OPENROUTER_MODEL'] ?? 'anthropic/claude-3.5-haiku';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  if (!isValidContext(raw)) {
    return new Response(JSON.stringify({ error: 'Invalid request shape' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const ctx: AnalysisContext = raw;

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://relocation-calculator.vercel.app',
        'X-Title': 'Berlin Relocation Calculator',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(ctx) },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Upstream failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseAnalysis(content);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Unparseable response' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ sections: parsed.sections, generatedAt: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Upstream timeout' }), { status: 504, headers: { 'Content-Type': 'application/json' } });
  }
}
