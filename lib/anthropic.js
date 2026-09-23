// Calls Claude to compare a provider's freshly-fetched pricing page(s)
// against what's currently tracked in the DB, and propose a structured
// list of changes. This is the automated equivalent of pasting a page
// into chat and asking "did anything change" — same judgment, just
// running on a schedule instead of by hand.
//
// Deliberately does NOT write to PriceEntry itself. It only returns
// proposals; the caller (the scheduled function) stores them as
// ProposedChange rows for a human to approve in /admin. See that
// model's comment in schema.prisma for why.

const SYSTEM_PROMPT = `You compare a live pricing page against a list of currently-tracked prices for one AI video generation provider, and report what changed. You are one step in an automated pipeline — a human reviews everything you propose before it's applied, so your job is to be precise and conservative, not to make the final call.

Rules, in order of importance:

1. NEVER invent a number. Only report a price that is explicitly stated in the fetched page text. If the page looks empty, broken, or like a JS-rendered shell with no real pricing content (e.g. just navigation links, no dollar amounts), report zero changes and set "fetch_looked_broken": true — do not guess at what the page probably contains.

2. A price is only a "change" if the actual number differs from what's currently tracked for that same model + resolution + billing unit + audio setting. Differences in how the resolution or duration is WORDED ("up to 720p" vs "720p", "5s" vs "5 seconds") are NOT changes — match on substance, not string equality.

3. Currently-tracked entries are given to you with their id. When you identify a genuine price change (the underlying number moved), set "changeType": "price_change" and include "oldEntryId" with that exact id, so it can be matched precisely — do not describe it in prose instead.

4. A price point on the page that has no corresponding tracked entry at all (a new resolution tier, a new model variant, a new billing mode) is "changeType": "new_entry" — no oldEntryId.

5. If a price you'd derive requires math (e.g. a stated rate of "$X per 1000 tokens" needs converting to $/sec using tokens = height × width × duration × 24 ÷ 1024, standard for Seedance-family models at 16:9 — 720p = 21,600 tokens/sec, 480p = 9,720 tokens/sec), show your work in "explanation" and mark "confidence": "low" if you had to assume anything (frame rate, aspect ratio) that wasn't explicitly stated.

6. Billing shape matters. Only use "pricePerSecond" when the provider states or clearly implies genuinely linear per-second billing. If pricing is for a fixed block (e.g. "$0.30 for a 5-second 720p clip") without confirmation that it scales linearly for other durations, use "totalPrice" + "forDurationSeconds" instead — never compute and report a derived per-second rate as if it were the provider's own stated rate.

7. Every proposal needs a real "sourceUrl" (the page you actually read this from) and "resolution" (or null if genuinely flat/unresolution-tiered, matching how the currently-tracked entries are structured).

8. If truly nothing changed, return an empty "changes" array. Don't manufacture a change to have something to report.

9. Never propose a change based on anything other than the page text you were given — no outside knowledge, no assumptions about what a provider "probably" charges.

Respond with ONLY a JSON object, no prose before or after, no markdown code fences, and no trailing commas after the last item in any array or object, matching exactly:

{
  "fetch_looked_broken": false,
  "changes": [
    {
      "changeType": "price_change" | "new_entry",
      "oldEntryId": "the exact id string from the current entries list, only for price_change",
      "modelName": "...",
      "modelSlug": "...",
      "entryType": "direct" | "marketplace",
      "resolution": "..." | null,
      "billingUnit": "per_second" | "per_video" | "per_request" | "per_5_seconds",
      "operationType": "generate" | "edit" | "extend" | "reframe" | "lip_sync" | "other",
      "pricePerSecond": number | null,
      "totalPrice": number | null,
      "forDurationSeconds": number | null,
      "hasAudio": boolean | null,
      "sourceUrl": "...",
      "confidence": "high" | "low",
      "explanation": "one or two sentences — what changed and why you're reporting it"
    }
  ],
  "notes": "one sentence overall summary, or empty string"
}`;

async function callClaudeForPriceDiff({ providerName, currentEntries, fetchedPages }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in the environment");
  }

  const userContent = [
    `Provider: ${providerName}`,
    ``,
    `Currently tracked live prices for this provider (each has an "id" — use it exactly for any price_change):`,
    JSON.stringify(currentEntries, null, 2),
    ``,
    `Freshly fetched page(s):`,
    ...fetchedPages.map((p) =>
      p.error
        ? `--- ${p.url} (FETCH FAILED: ${p.error}) ---`
        : `--- ${p.url} ---\n${p.text}`
    ),
  ].join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Anthropic API error ${resp.status}: ${body.slice(0, 500)}`);
  }

  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  // Trailing commas are invalid JSON but a common LLM output quirk --
  // strip any comma immediately before a closing } or ] rather than
  // failing the whole response over one stray character.
  const cleaned = text
    .replace(/```json|```/g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Could not parse Claude's response as JSON: ${err.message}. Raw: ${cleaned.slice(0, 500)}`);
  }

  if (!Array.isArray(parsed.changes)) {
    throw new Error("Claude's response didn't include a valid 'changes' array");
  }

  return parsed;
}

module.exports = { callClaudeForPriceDiff };
