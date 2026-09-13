const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");

// GET  /api/admin/price-entries        -> list all price entries
// POST /api/admin/price-entries        -> create a price entry
// PUT  /api/admin/price-entries?id=... -> update a price entry
//        (use this to "mark as needing re-verification": send { needsRecheck: true })
// DELETE /api/admin/price-entries?id=... -> delete a price entry
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    try {
      const priceEntries = await prisma.priceEntry.findMany({
        include: { model: true, provider: true },
        orderBy: { checkedAt: "desc" },
      });
      return res.status(200).json({ priceEntries });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to load price entries", detail: String(err.message || err) });
    }
  }

  if (req.method === "POST") {
    const {
      modelId,
      providerId,
      entryType,
      pricePerSecond,
      totalPrice,
      forDurationSeconds,
      billingUnit,
      operationType,
      resolution,
      hasAudio,
      inputType,
      sourceUrl,
      checkedAt,
      validFrom,
      validUntil,
      notes,
    } = req.body || {};

    if (!modelId || !providerId || !entryType || !sourceUrl || !checkedAt) {
      return res.status(400).json({
        error: "modelId, providerId, entryType, sourceUrl, and checkedAt are required",
      });
    }
    if (!["direct", "marketplace"].includes(entryType)) {
      return res.status(400).json({ error: "entryType must be direct or marketplace" });
    }

    try {
      const priceEntry = await prisma.priceEntry.create({
        data: {
          modelId,
          providerId,
          entryType,
          pricePerSecond: pricePerSecond != null && pricePerSecond !== "" ? parseFloat(pricePerSecond) : null,
          totalPrice: totalPrice != null && totalPrice !== "" ? parseFloat(totalPrice) : null,
          forDurationSeconds:
            forDurationSeconds != null && forDurationSeconds !== "" ? parseInt(forDurationSeconds, 10) : null,
          billingUnit: billingUnit || undefined, // falls back to schema default (per_second) if omitted
          operationType: operationType || undefined, // falls back to schema default (generate) if omitted
          resolution: resolution || null,
          hasAudio: !!hasAudio,
          inputType: inputType || null,
          sourceUrl,
          checkedAt: new Date(checkedAt),
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes: notes || null,
        },
      });
      return res.status(201).json({ priceEntry });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not create price entry" });
    }
  }

  if (req.method === "PUT") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id query param required" });
    const body = req.body || {};
    const data = {};
    for (const key of [
      "modelId",
      "providerId",
      "entryType",
      "billingUnit",
      "operationType",
      "resolution",
      "hasAudio",
      "inputType",
      "sourceUrl",
      "notes",
      "needsRecheck",
    ]) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.pricePerSecond !== undefined) {
      data.pricePerSecond = body.pricePerSecond === null || body.pricePerSecond === "" ? null : parseFloat(body.pricePerSecond);
    }
    if (body.totalPrice !== undefined) {
      data.totalPrice = body.totalPrice === null || body.totalPrice === "" ? null : parseFloat(body.totalPrice);
    }
    if (body.forDurationSeconds !== undefined) {
      data.forDurationSeconds =
        body.forDurationSeconds === null || body.forDurationSeconds === "" ? null : parseInt(body.forDurationSeconds, 10);
    }
    if (body.checkedAt !== undefined) {
      data.checkedAt = new Date(body.checkedAt);
    }
    if (body.validFrom !== undefined) {
      data.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    }
    if (body.validUntil !== undefined) {
      data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }

    try {
      const priceEntry = await prisma.priceEntry.update({ where: { id }, data });
      return res.status(200).json({ priceEntry });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not update price entry" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id query param required" });
    try {
      await prisma.priceEntry.delete({ where: { id } });
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not delete price entry" });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
