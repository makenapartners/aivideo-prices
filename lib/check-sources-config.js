// The sources this app can re-check server-side without a headless
// browser. Kling and ByteDance/BytePlus are deliberately NOT here — both
// are JS-rendered and return an empty shell to a plain fetch, so they
// stay a manual "open the page yourself" step regardless of this feature.
//
// providerName must match an existing Provider.name exactly, so the
// current-DB-values lookup finds the right rows.
const CHECK_SOURCES = [
  {
    name: "xAI (Grok Imagine)",
    providerName: "xAI",
    urls: ["https://docs.x.ai/developers/pricing"],
  },
  {
    name: "Luma (Ray)",
    providerName: "Luma",
    urls: ["https://docs.agents.lumalabs.ai/guides/pricing/"],
  },
  {
    name: "Google (Veo)",
    providerName: "Google",
    urls: ["https://ai.google.dev/gemini-api/docs/pricing"],
  },
  {
    name: "Runway",
    providerName: "Runway",
    urls: ["https://docs.dev.runwayml.com/guides/pricing/"],
  },
  {
    name: "MiniMax (H3 / Hailuo)",
    providerName: "MiniMax",
    urls: ["https://platform.minimax.io/docs/guides/pricing-paygo"],
  },
  {
    name: "Adobe (Firefly Video)",
    providerName: "Adobe",
    urls: [
      "https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html",
      "https://www.adobe.com/products/firefly/plans.html",
    ],
    notes: "Firefly's price in this DB is derived from these two pages (credit rate x plan price), not a flat published rate — see the notes on its price entries.",
  },
  {
    name: "Pika",
    providerName: "Pika",
    urls: ["https://pika.art/pricing"],
  },
];

module.exports = { CHECK_SOURCES };
