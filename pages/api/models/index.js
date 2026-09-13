const { prisma } = require("../../../lib/prisma");
const { sortEntriesByEffectivePrice } = require("../../../lib/effective-price");

// GET /api/models
// Returns all models with their price entries (direct + marketplace).
// Each entry includes a computed `effectivePricePerSecond` field, and
// priceEntries within each model are sorted cheapest-first by that value
// (see lib/effective-price.js for why this can't just be an `orderBy` on
// pricePerSecond — most rows don't have that field set). This is the
// shape /prices consumes.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const models = await prisma.model.findMany({
      include: {
        creator: true,
        priceEntries: { include: { provider: true } },
      },
      orderBy: { name: "asc" },
    });

    const withSortedEntries = models.map((m) => ({
      ...m,
      priceEntries: sortEntriesByEffectivePrice(m.priceEntries),
    }));

    return res.status(200).json({ models: withSortedEntries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load models" });
  }
};
