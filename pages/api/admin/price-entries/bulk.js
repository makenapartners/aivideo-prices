const { prisma } = require("../../../../lib/prisma");
const { requireAdmin } = require("../../../../lib/admin-auth");

// POST /api/admin/price-entries/bulk
// Body: { entries: [ {...}, {...} ] }
//
// Each entry looks like a normal PriceEntry POST body, but instead of
// modelId/providerId, you give human-readable names — this endpoint
// finds-or-creates the Provider and Model rows for you:
//
// {
//   providerName: "Google",            // required
//   providerKind: "model_creator",     // required only when creating a new Provider
//   providerWebsiteUrl: "https://...", // required only when creating a new Provider
//   modelName: "Veo Standard",         // required
//   modelSlug: "veo-standard",         // optional — slugified from modelName if omitted
//   entryType: "direct",               // required
//   totalPrice: 0.40,
//   forDurationSeconds: 1,
//   billingUnit: "per_second",
//   operationType: "generate",
//   resolution: "720p",
//   hasAudio: false,
//   inputType: "text",
//   sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing", // required
//   checkedAt: "2026-09-13",           // required
//   validFrom: null,
//   validUntil: null,
//   notes: null
// }
//
// Every entry is validated independently. Valid ones are inserted in a
// single transaction; invalid ones are reported back with the reason,
// nothing partial gets written for a row that fails. This does NOT
// relax the "never fabricate a price" rule — it's for pasting data you
// already manually verified (e.g. straight from the launch model list),
// not for skipping verification.

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validateEntry(e, i) {
  const errors = [];
  if (!e.providerName) errors.push("providerName is required");
  if (!e.modelName) errors.push("modelName is required");
  if (!e.entryType || !["direct", "marketplace"].includes(e.entryType)) {
    errors.push("entryType must be direct or marketplace");
  }
  if (!e.sourceUrl) errors.push("sourceUrl is required");
  if (!e.checkedAt) errors.push("checkedAt is required");
  if (
    e.billingUnit &&
    !["per_second", "per_video", "per_request", "per_5_seconds"].includes(e.billingUnit)
  ) {
    errors.push("invalid billingUnit");
  }
  if (
    e.operationType &&
    !["generate", "edit", "extend", "reframe", "lip_sync", "other"].includes(e.operationType)
  ) {
    errors.push("invalid operationType");
  }
  return errors.length ? { index: i, errors } : null;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { entries } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "Body must include a non-empty entries array" });
  }

  // Validate up front — collect all errors before touching the DB.
  const validationErrors = entries.map(validateEntry).filter(Boolean);
  const validEntries = entries.filter((_, i) => !validationErrors.some((v) => v.index === i));

  if (validEntries.length === 0) {
    return res.status(400).json({ error: "No valid entries", validationErrors });
  }

  const created = [];
  const failed = [...validationErrors]; // will append DB-stage failures too

  try {
    await prisma.$transaction(async (tx) => {
      for (const e of validEntries) {
        const realIndex = entries.indexOf(e);
        try {
          // Find-or-create Provider by name
          let provider = await tx.provider.findUnique({ where: { name: e.providerName } });
          if (!provider) {
            if (!e.providerKind || !e.providerWebsiteUrl) {
              throw new Error(
                `Provider "${e.providerName}" doesn't exist yet — providerKind and providerWebsiteUrl are required to create it`
              );
            }
            provider = await tx.provider.create({
              data: {
                name: e.providerName,
                kind: e.providerKind,
                websiteUrl: e.providerWebsiteUrl,
              },
            });
          }

          // Find-or-create Model by slug (derived from name if not given)
          const slug = e.modelSlug || slugify(e.modelName);
          let model = await tx.model.findUnique({ where: { slug } });
          if (!model) {
            model = await tx.model.create({
              data: { name: e.modelName, slug, creatorId: provider.id },
            });
          }

          const priceEntry = await tx.priceEntry.create({
            data: {
              modelId: model.id,
              providerId: provider.id,
              entryType: e.entryType,
              pricePerSecond: e.pricePerSecond != null && e.pricePerSecond !== "" ? parseFloat(e.pricePerSecond) : null,
              totalPrice: e.totalPrice != null && e.totalPrice !== "" ? parseFloat(e.totalPrice) : null,
              forDurationSeconds:
                e.forDurationSeconds != null && e.forDurationSeconds !== "" ? parseInt(e.forDurationSeconds, 10) : null,
              billingUnit: e.billingUnit || undefined,
              operationType: e.operationType || undefined,
              resolution: e.resolution || null,
              hasAudio: !!e.hasAudio,
              inputType: e.inputType || null,
              sourceUrl: e.sourceUrl,
              checkedAt: new Date(e.checkedAt),
              validFrom: e.validFrom ? new Date(e.validFrom) : null,
              validUntil: e.validUntil ? new Date(e.validUntil) : null,
              notes: e.notes || null,
            },
          });

          created.push({ index: realIndex, id: priceEntry.id, model: model.name, provider: provider.name });
        } catch (err) {
          failed.push({ index: realIndex, errors: [String(err.message || err)] });
        }
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Bulk import transaction failed", detail: String(err.message || err) });
  }

  return res.status(created.length > 0 ? 201 : 400).json({
    createdCount: created.length,
    failedCount: failed.length,
    created,
    failed,
  });
}
