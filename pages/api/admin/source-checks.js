const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");

// GET  /api/admin/source-checks         -> list check history, most recent first
// POST /api/admin/source-checks         -> log one or more check events
//
// Body for POST: { checks: [ { providerName, sourceLabel, changesFound?, notes?, checkedAt? }, ... ] }
// providerName must match an existing Provider.name exactly — this endpoint
// does NOT create providers, since a check should only ever be logged
// against something that's already being tracked.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    try {
      const checks = await prisma.sourceCheck.findMany({
        include: { provider: true },
        orderBy: { checkedAt: "desc" },
        take: 200,
      });
      return res.status(200).json({ checks });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to load source checks" });
    }
  }

  if (req.method === "POST") {
    const { checks } = req.body || {};
    if (!Array.isArray(checks) || checks.length === 0) {
      return res.status(400).json({ error: "Body must include a non-empty checks array" });
    }

    const created = [];
    const failed = [];

    for (let i = 0; i < checks.length; i++) {
      const c = checks[i];
      if (!c.providerName || !c.sourceLabel) {
        failed.push({ index: i, errors: ["providerName and sourceLabel are required"] });
        continue;
      }
      try {
        const provider = await prisma.provider.findUnique({ where: { name: c.providerName } });
        if (!provider) {
          failed.push({ index: i, errors: [`No provider named "${c.providerName}" exists`] });
          continue;
        }
        const check = await prisma.sourceCheck.create({
          data: {
            providerId: provider.id,
            sourceLabel: c.sourceLabel,
            changesFound: !!c.changesFound,
            notes: c.notes || null,
            checkedAt: c.checkedAt ? new Date(c.checkedAt) : undefined,
          },
        });
        created.push({ index: i, id: check.id, provider: provider.name });
      } catch (err) {
        failed.push({ index: i, errors: [String(err.message || err)] });
      }
    }

    return res.status(created.length > 0 ? 201 : 400).json({
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
