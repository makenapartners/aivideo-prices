const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");

// GET  /api/admin/price-entries        -> list all price entries
// POST /api/admin/price-entries        -> create a price entry
// PUT  /api/admin/price-entries?id=... -> update a price entry
//        (use this to "mark as needing re-verification": send { needsRecheck: true })
// DELETE /api/admin/price-entries?id=... -> delete a price entry
module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    const priceEntries = await prisma.priceEntry.findMany({
      include: { model: true, provider: true },
      orderBy: { checkedAt: "desc" },
    });
    return res.status(200).json({ priceEntries });
  }

  if (req.method === "POST") {
    const {
      modelId,
      providerId,
      entryType,
      pricePerSecond,
      resolution,
      hasAudio,
      inputType,
      sourceUrl,
      checkedAt,
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
          pricePerSecond: pricePerSecond != null ? parseFloat(pricePerSecond) : null,
          resolution: resolution || null,
          hasAudio: !!hasAudio,
          inputType: inputType || null,
          sourceUrl,
          checkedAt: new Date(checkedAt),
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
      data.pricePerSecond = body.pricePerSecond === null ? null : parseFloat(body.pricePerSecond);
    }
    if (body.checkedAt !== undefined) {
      data.checkedAt = new Date(body.checkedAt);
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
