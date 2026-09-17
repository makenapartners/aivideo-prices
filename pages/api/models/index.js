const { prisma } = require("../../../lib/prisma");
const { sortEntriesByEffectivePrice } = require("../../../lib/effective-price");
const { applyPublicCors } = require("../../../lib/cors");

// GET /api/models
// Returns all models with their price entries (direct + marketplace).
// Each entry includes a computed `effectivePricePerSecond` field, and
// priceEntries within each model are sorted cheapest-first by that value
// (see lib/effective-price.js for why this can't just be an `orderBy` on
// pricePerSecond — most rows don't have that field set). This is the
// shape /prices consumes. Public and CORS-open (see lib/cors.js) — safe
// to call from any frontend, including a client-side-only prototype.
export default async function handler(req, res) {
  if (applyPublicCors(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const models = await prisma.model.findMany({
      include: {
        creator: {
          include: {
            sourceChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
          },
        },
        // supersededAt: null means "current, live price" — superseded
        // (historical) rows are kept in the DB for reporting but never
        // shown here, so this filter is what keeps the public site
        // showing only today's actual prices.
        priceEntries: { where: { supersededAt: null }, include: { provider: true } },
      },
      orderBy: { name: "asc" },
    });

    const withSortedEntries = models.map((m) => ({
      ...m,
      creator: {
        ...m.creator,
        // Flattened for convenience: the most recent check of this
        // provider's pricing, whether or not it found a change. Null if
        // this provider has never had a check logged yet.
        lastCheckedAt: m.creator.sourceChecks[0]?.checkedAt ?? null,
        sourceChecks: undefined,
      },
      priceEntries: sortEntriesByEffectivePrice(m.priceEntries),
    }));

    return res.status(200).json({ models: withSortedEntries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load models" });
  }
};
