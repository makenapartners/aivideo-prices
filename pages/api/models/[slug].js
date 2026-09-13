const { prisma } = require("../../../lib/prisma");

// GET /api/models/:slug
// Returns one model's Direct and Marketplace entries for the
// /prices/[model] page.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.query;

  try {
    const model = await prisma.model.findUnique({
      where: { slug },
      include: {
        creator: true,
        priceEntries: {
          include: { provider: true },
          orderBy: { pricePerSecond: "asc" },
        },
      },
    });

    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    return res.status(200).json({ model });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load model" });
  }
};
