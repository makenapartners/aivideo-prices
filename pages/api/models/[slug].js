const { prisma } = require("../../../lib/prisma");
const { sortEntriesByEffectivePrice } = require("../../../lib/effective-price");
const { applyPublicCors } = require("../../../lib/cors");

// GET /api/models/:slug
// Returns one model's Direct and Marketplace entries for the
// /prices/[model] page, each with a computed `effectivePricePerSecond`
// field and sorted cheapest-first by that value (see
// lib/effective-price.js for why a plain pricePerSecond sort doesn't work
// for most rows). Public and CORS-open (see lib/cors.js) — safe to call
// from any frontend, including a client-side-only prototype.
export default async function handler(req, res) {
  if (applyPublicCors(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.query;

  try {
    const model = await prisma.model.findUnique({
      where: { slug },
      include: {
        creator: {
          include: {
            sourceChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
          },
        },
        // See lib/effective-price.js's counterpart note in models/index.js —
        // supersededAt: null keeps historical rows out of the public API.
        priceEntries: { where: { supersededAt: null }, include: { provider: true } },
      },
    });

    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    const withSortedEntries = {
      ...model,
      creator: {
        ...model.creator,
        lastCheckedAt: model.creator.sourceChecks[0]?.checkedAt ?? null,
        sourceChecks: undefined,
      },
      priceEntries: sortEntriesByEffectivePrice(model.priceEntries),
    };

    return res.status(200).json({ model: withSortedEntries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load model" });
  }
};
