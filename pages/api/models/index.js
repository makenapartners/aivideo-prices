const { prisma } = require("../../../lib/prisma");

// GET /api/models
// Returns all models with their price entries (direct + marketplace),
// cheapest-first within each. This is the shape /prices consumes.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const models = await prisma.model.findMany({
      include: {
        creator: true,
        priceEntries: {
          include: { provider: true },
          orderBy: { pricePerSecond: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ models });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load models" });
  }
};
