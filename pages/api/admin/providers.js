const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");

// GET  /api/admin/providers        -> list all providers
// POST /api/admin/providers        -> create a provider
// PUT  /api/admin/providers?id=... -> update a provider
// DELETE /api/admin/providers?id=... -> delete a provider
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    try {
      const providers = await prisma.provider.findMany({
        orderBy: { name: "asc" },
        include: { sourceChecks: { orderBy: { checkedAt: "desc" }, take: 1 } },
      });
      // Same field the public API exposes on creator — surfaced here too so
      // admin shows exactly what a consumer of the API sees, not something
      // you have to go hit /api/models to verify.
      const withLastChecked = providers.map((p) => ({
        ...p,
        lastCheckedAt: p.sourceChecks[0]?.checkedAt ?? null,
        sourceChecks: undefined,
      }));
      return res.status(200).json({ providers: withLastChecked });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to load providers", detail: String(err.message || err) });
    }
  }

  if (req.method === "POST") {
    const { name, kind, websiteUrl } = req.body || {};
    if (!name || !kind || !websiteUrl) {
      return res.status(400).json({ error: "name, kind, and websiteUrl are required" });
    }
    if (!["model_creator", "marketplace"].includes(kind)) {
      return res.status(400).json({ error: "kind must be model_creator or marketplace" });
    }
    try {
      const provider = await prisma.provider.create({ data: { name, kind, websiteUrl } });
      return res.status(201).json({ provider });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not create provider (name may already exist)" });
    }
  }

  if (req.method === "PUT") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id query param required" });
    const { name, kind, websiteUrl } = req.body || {};
    try {
      const provider = await prisma.provider.update({
        where: { id },
        data: { name, kind, websiteUrl },
      });
      return res.status(200).json({ provider });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not update provider" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id query param required" });
    try {
      await prisma.provider.delete({ where: { id } });
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not delete provider (it may still have models or price entries attached)" });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
