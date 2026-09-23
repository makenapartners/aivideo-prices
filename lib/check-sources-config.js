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
  {
    name: "PixVerse",
    providerName: "PixVerse",
    urls: ["https://docs.platform.pixverse.ai/pricing-796039m0"],
  },
  {
    name: "Lightricks (LTX)",
    providerName: "Lightricks",
    urls: ["https://ltx.io/model/api/pricing"],
  },
  {
    name: "Pika API",
    providerName: "Pika API",
    urls: ["https://dev.pika.art/pricing"],
    notes: "Pika's own developer API/marketplace product (separate from the consumer app at pika.art). Resells Wan 3.0, Seedance, Veo, MiniMax H3, Grok Imagine, Hailuo, plus their own Pika 2.5.",
  },
  {
    name: "fal.ai (marketplace)",
    providerName: "fal.ai",
    urls: [
      "https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video",
      "https://fal.ai/models/fal-ai/veo3.1",
      "https://fal.ai/learn/devs/seedance-2-5-vs-seedance-2-0",
      "https://fal.ai/minimax-h3-max",
      "https://fal.ai/minimax-h3",
      "https://fal.ai/learn/devs/minimax-h3-vs-minimax-h3-max",
      "https://fal.ai/grok-imagine-video-1.5",
      "https://fal.ai/wan-3",
      "https://fal.ai/models/creatify/boreal",
      "https://fal.ai/models/fal-ai/pixverse/v6/text-to-video",
      "https://fal.ai/models/fal-ai/ltx-2.3/text-to-video",
      "https://fal.ai/learn/tools/ai-video-generators",
      "https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video",
      "https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
      "https://fal.ai/explore/kling",
    ],
    notes: "fal.ai has no single central pricing page — each model's rate lives on its own model page. These are the specific pages this DB's fal.ai entries are sourced from. Still missing dedicated pages for: Kling 2.5/2.6 Standard tiers, Kling 3.0 4K on fal, Wan 2.7, Happy Horse 1.0/1.1 — add their URLs here once confirmed.",
  },
];

module.exports = { CHECK_SOURCES };
