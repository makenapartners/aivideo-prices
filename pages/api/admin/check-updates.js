const { prisma } = require("../../../lib/prisma");
const { requireAdmin } = require("../../../lib/admin-auth");
const { htmlToText } = require("../../../lib/html-to-text");
const { CHECK_SOURCES } = require("../../../lib/check-sources-config");

// GET /api/admin/check-updates
// For each of the 7 directly-fetchable pricing sources (see
// lib/check-sources-config.js), fetches the live page server-side and
// returns its text alongside the current DB price entries for that
// provider — so a human can compare and decide what, if anything,
// changed. This does NOT parse numbers or touch the database; it's a
// reading aid, not an auto-updater. Kling and ByteDance are excluded —
// both are JS-rendered and stay a manual open-the-page step.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const results = await Promise.all(
    CHECK_SOURCES.map(async (source) => {
      let currentEntries = [];
      try {
        const provider = await prisma.provider.findUnique({
          where: { name: source.providerName },
        });
        if (provider) {
          const entries = await prisma.priceEntry.findMany({
            where: { providerId: provider.id, supersededAt: null },
            include: { model: true },
            orderBy: { checkedAt: "desc" },
          });
          currentEntries = entries.map((e) => ({
            id: e.id,
            model: e.model.name,
            entryType: e.entryType,
            resolution: e.resolution,
            totalPrice: e.totalPrice,
            pricePerSecond: e.pricePerSecond,
            forDurationSeconds: e.forDurationSeconds,
            billingUnit: e.billingUnit,
            checkedAt: e.checkedAt,
            sourceUrl: e.sourceUrl,
          }));
        }
      } catch (err) {
        console.error(`DB lookup failed for provider "${source.providerName}"`, err);
      }

      const fetched = await Promise.all(
        source.urls.map(async (url) => {
          try {
            const resp = await fetch(url, {
              headers: { "User-Agent": "aivideo-prices-check/1.0" },
            });
            if (!resp.ok) {
              return { url, error: `HTTP ${resp.status}` };
            }
            const html = await resp.text();
            return { url, text: htmlToText(html) };
          } catch (err) {
            return { url, error: String(err.message || err) };
          }
        })
      );

      return {
        name: source.name,
        providerName: source.providerName,
        notes: source.notes || null,
        fetched,
        currentEntries,
      };
    })
  );

  return res.status(200).json({ sources: results, checkedAt: new Date().toISOString() });
}
