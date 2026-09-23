const { schedule } = require("@netlify/functions");
const { prisma } = require("../../lib/prisma");
const { CHECK_SOURCES } = require("../../lib/check-sources-config");
const { htmlToText } = require("../../lib/html-to-text");
const { callClaudeForPriceDiff } = require("../../lib/anthropic");

// Same reasoning as the manual Check Updates feature (lib/check-sources-config.js):
// this only ever iterates CHECK_SOURCES, which already excludes Kling,
// ByteDance, and Higgsfield — all three are JS-rendered and return an
// empty shell to a plain fetch, automated or not. Those stay a manual
// paste-to-chat job.

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "aivideo-prices-auto-check/1.0" },
      signal: controller.signal,
    });
    if (!resp.ok) return { url, error: `HTTP ${resp.status}` };
    const html = await resp.text();
    return { url, text: htmlToText(html) };
  } catch (err) {
    const timedOut = err.name === "AbortError";
    return { url, error: timedOut ? `Timed out after ${FETCH_TIMEOUT_MS / 1000}s` : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

async function runAutomatedCheck() {
  const results = [];

  for (const source of CHECK_SOURCES) {
    try {
      const provider = await prisma.provider.findUnique({ where: { name: source.providerName } });
      if (!provider) {
        results.push({ source: source.name, status: "error", error: `No provider named "${source.providerName}" exists` });
        continue;
      }

      const liveEntries = await prisma.priceEntry.findMany({
        where: { providerId: provider.id, supersededAt: null },
        include: { model: true },
      });
      const currentEntries = liveEntries.map((e) => ({
        id: e.id,
        modelName: e.model.name,
        modelSlug: e.model.slug,
        entryType: e.entryType,
        resolution: e.resolution,
        billingUnit: e.billingUnit,
        operationType: e.operationType,
        pricePerSecond: e.pricePerSecond,
        totalPrice: e.totalPrice,
        forDurationSeconds: e.forDurationSeconds,
        hasAudio: e.hasAudio,
      }));

      const fetchedPages = await Promise.all(source.urls.map((url) => fetchWithTimeout(url)));
      const allFailed = fetchedPages.every((p) => p.error);

      if (allFailed) {
        await prisma.sourceCheck.create({
          data: {
            providerId: provider.id,
            sourceLabel: source.name,
            changesFound: false,
            notes: `Automated check: all ${source.urls.length} URL(s) failed to fetch, skipped AI comparison. ${fetchedPages
              .map((p) => p.error)
              .join("; ")}`,
          },
        });
        results.push({ source: source.name, status: "fetch_failed" });
        continue;
      }

      const diff = await callClaudeForPriceDiff({
        providerName: source.providerName,
        currentEntries,
        fetchedPages,
      });

      const check = await prisma.sourceCheck.create({
        data: {
          providerId: provider.id,
          sourceLabel: source.name,
          changesFound: diff.changes.length > 0,
          notes: diff.fetch_looked_broken
            ? `Automated check: page looked broken/JS-rendered, no comparison made. ${diff.notes || ""}`.trim()
            : diff.notes || `Automated check: ${diff.changes.length} proposed change(s)`,
        },
      });

      // Same "a check happened, refresh checkedAt regardless of outcome"
      // logic as the manual Log Check endpoint (pages/api/admin/source-checks.js) --
      // kept in sync deliberately so manual and automated checks behave
      // identically.
      await prisma.priceEntry.updateMany({
        where: { providerId: provider.id, supersededAt: null },
        data: { checkedAt: check.checkedAt },
      });

      for (const change of diff.changes) {
        // Resolve the real DB id locally by matching against what was
        // actually sent, rather than trusting Claude's echoed id verbatim --
        // guards against a slightly-off id silently breaking the approve step.
        let oldPriceEntryId = null;
        if (change.changeType === "price_change" && change.oldEntryId) {
          const match = currentEntries.find((e) => e.id === change.oldEntryId);
          oldPriceEntryId = match ? match.id : null;
        }

        await prisma.proposedChange.create({
          data: {
            sourceCheckId: check.id,
            providerId: provider.id,
            changeType: change.changeType,
            modelName: change.modelName,
            modelSlug: change.modelSlug,
            entryType: change.entryType,
            proposedData: change,
            oldPriceEntryId,
            confidence: change.confidence || "high",
            explanation: change.explanation || null,
          },
        });
      }

      results.push({ source: source.name, status: "ok", changes: diff.changes.length });
    } catch (err) {
      console.error(`Automated check failed for "${source.name}":`, err);
      results.push({ source: source.name, status: "error", error: String(err.message || err) });
    }
  }

  return results;
}

// Runs every 3 days at 15:00 UTC. Change the cron string below to adjust
// cadence -- e.g. "0 15 * * *" for daily. Netlify's bundler statically
// analyzes this file for a schedule(...) call feeding directly into
// exports.handler -- it has to be written inline like this, not built up
// via an intermediate variable, or the bundler can't detect it and the
// build fails at the Functions-bundling step (not the Next.js build).
exports.handler = schedule("0 15 */3 * *", async () => {
  const results = await runAutomatedCheck();
  console.log("Automated price check results:", JSON.stringify(results));
  return { statusCode: 200 };
});
