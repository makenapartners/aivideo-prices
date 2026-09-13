// Most PriceEntry rows don't have pricePerSecond set — per the schema's own
// design principle, that field is only filled in when a provider has
// confirmed genuinely linear per-second scaling (see prisma/schema.prisma).
// Everything else (Luma, the Seedance line, Kling Lip Sync, etc.) is priced
// via totalPrice + forDurationSeconds instead, specifically because scaling
// isn't linear for those providers.
//
// A naive `orderBy: { pricePerSecond: "asc" }` at the database level only
// sorts correctly for the minority of rows that have pricePerSecond set —
// everything else has a null there and gets pushed to one end of the list
// arbitrarily, regardless of its actual cost. For a price *comparison* API,
// a silently-wrong "cheapest first" ordering is worse than no ordering.
//
// This computes one honest, comparable number for every entry — falling
// back to totalPrice / forDurationSeconds when pricePerSecond isn't set —
// and is the single source of truth both API routes sort by. Consumers
// (like aivideo-news-app) get this value pre-computed on every entry as
// `effectivePricePerSecond`, so they don't need to reimplement this logic.

function effectivePricePerSecond(entry) {
  if (entry.pricePerSecond != null) return entry.pricePerSecond;
  if (entry.totalPrice != null && entry.forDurationSeconds) {
    return entry.totalPrice / entry.forDurationSeconds;
  }
  // Can't compute a per-second figure (e.g. a flat per-request fee with no
  // duration attached). Left null on purpose — better to omit a number
  // than to fabricate one, same principle as everywhere else in this app.
  return null;
}

// Sorts a list of PriceEntry objects cheapest-first by effective per-second
// cost, attaching that computed value to each entry as it goes. Entries
// with no computable value (see above) sort to the end, not the start —
// an unknown price should never look like the cheapest option.
function sortEntriesByEffectivePrice(entries) {
  return entries
    .map((e) => ({ ...e, effectivePricePerSecond: effectivePricePerSecond(e) }))
    .sort((a, b) => {
      if (a.effectivePricePerSecond == null && b.effectivePricePerSecond == null) return 0;
      if (a.effectivePricePerSecond == null) return 1;
      if (b.effectivePricePerSecond == null) return -1;
      return a.effectivePricePerSecond - b.effectivePricePerSecond;
    });
}

module.exports = { effectivePricePerSecond, sortEntriesByEffectivePrice };
