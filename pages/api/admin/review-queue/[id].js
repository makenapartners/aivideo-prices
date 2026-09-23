const { prisma } = require("../../../../lib/prisma");
const { requireAdmin } = require("../../../../lib/admin-auth");

// PUT /api/admin/review-queue/:id
// Body: { action: "approve" | "reject" }
//
// Approving a proposal is the ONLY place an automated check's findings
// actually reach PriceEntry. For a price_change, the old row is marked
// superseded (never deleted -- same history-preserving rule as every
// other price update in this app) and a fresh row is created. For a
// new_entry, a row is created directly, with the same find-or-create
// behavior for Provider/Model as Bulk Import.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { action } = req.body || {};

  if (!id) return res.status(400).json({ error: "id required" });
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  try {
    const proposal = await prisma.proposedChange.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    if (proposal.status !== "pending") {
      return res.status(400).json({ error: `Proposal already ${proposal.status}` });
    }

    if (action === "reject") {
      const updated = await prisma.proposedChange.update({
        where: { id },
        data: { status: "rejected", resolvedAt: new Date() },
      });
      return res.status(200).json({ proposal: updated });
    }

    // action === "approve"
    const data = proposal.proposedData || {};

    const provider = await prisma.provider.findUnique({ where: { id: proposal.providerId } });
    if (!provider) {
      return res.status(400).json({ error: "This proposal's provider no longer exists" });
    }

    let model = await prisma.model.findUnique({ where: { slug: proposal.modelSlug } });
    if (!model) {
      model = await prisma.model.create({
        data: { name: proposal.modelName, slug: proposal.modelSlug, creatorId: provider.id },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (proposal.changeType === "price_change" && proposal.oldPriceEntryId) {
        await tx.priceEntry.update({
          where: { id: proposal.oldPriceEntryId },
          data: { supersededAt: new Date() },
        });
      }

      const newEntry = await tx.priceEntry.create({
        data: {
          modelId: model.id,
          providerId: provider.id,
          entryType: proposal.entryType,
          pricePerSecond: data.pricePerSecond ?? null,
          totalPrice: data.totalPrice ?? null,
          forDurationSeconds: data.forDurationSeconds ?? null,
          billingUnit: data.billingUnit || undefined,
          operationType: data.operationType || undefined,
          resolution: data.resolution || null,
          hasAudio: !!data.hasAudio,
          sourceUrl: data.sourceUrl,
          checkedAt: new Date(),
          notes: data.explanation ? `Auto-proposed: ${data.explanation}` : "Auto-proposed and approved",
        },
      });

      const updatedProposal = await tx.proposedChange.update({
        where: { id },
        data: { status: "approved", resolvedAt: new Date() },
      });

      return { newEntry, updatedProposal };
    });

    return res.status(200).json({ proposal: result.updatedProposal, createdPriceEntry: result.newEntry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to resolve proposal", detail: String(err.message || err) });
  }
}
