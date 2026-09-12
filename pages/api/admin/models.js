const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET  /api/admin/models        -> list all models
// POST /api/admin/models        -> create a model
// PUT  /api/admin/models?id=... -> update a model
// DELETE /api/admin/models?id=... -> delete a model
module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    const models = await prisma.model.findMany({
      include: { creator: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ models });
  }

  if (req.method === "POST") {
    const { name, creatorId, slug } = req.body || {};
    if (!name || !creatorId) {
      return res.status(400).json({ error: "name and creatorId are required" });
    }
    try {
      const model = await prisma.model.create({
        data: { name, creatorId, slug: slug || slugify(name) },
      });
      return res.status(201).json({ model });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not create model (slug may already exist)" });
    }
  }

  if (req.method === "PUT") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id query param required" });
    const { name, creatorId, slug } = req.body || {};
    try {
      const model = await prisma.model.update({
        where: { id },
        data: { name, creatorId, slug },
      });
      return res.status(200).json({ model });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not update model" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id query param required" });
    try {
      await prisma.model.delete({ where: { id } });
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Could not delete model (it may still have price entries attached)" });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
