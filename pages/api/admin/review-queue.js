const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");

// GET /api/admin/review-queue?status=pending
// Lists proposed changes from automated (or manually-triggered) checks,
// each alongside the current live entry it would replace (for
// price_change) so the diff is easy to eyeball. Nothing here writes to
// PriceEntry -- see [id].js for approve/reject, which is the only place
// that does.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const status = typeof req.query.status === "string" ? req.query.status : "pending";

  try {
    const proposals = await prisma.proposedChange.findMany({
      where: { status },
      include: { provider: true, sourceCheck: true },
      orderBy: { createdAt: "desc" },
    });

    const oldEntryIds = proposals.map((p) => p.oldPriceEntryId).filter(Boolean);
    const oldEntries = oldEntryIds.length
      ? await prisma.priceEntry.findMany({ where: { id: { in: oldEntryIds } } })
      : [];
    const oldEntryById = Object.fromEntries(oldEntries.map((e) => [e.id, e]));

    const withOldEntry = proposals.map((p) => ({
      ...p,
      oldEntry: p.oldPriceEntryId ? oldEntryById[p.oldPriceEntryId] || null : null,
    }));

    return res.status(200).json({ proposals: withOldEntry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load review queue", detail: String(err.message || err) });
  }
}
