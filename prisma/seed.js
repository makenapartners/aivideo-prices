// Seeds Providers and Models for the 5 launch-list models.
//
// Deliberately does NOT seed PriceEntry rows with invented numbers or
// source URLs — every price on the live site must trace back to a
// source_url you've actually checked. Add those through /admin once
// this seed has run. See README.md for the exact numbers from the
// original research pass to re-verify and enter.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function upsertProvider({ name, kind, websiteUrl }) {
  return prisma.provider.upsert({
    where: { name },
    update: { kind, websiteUrl },
    create: { name, kind, websiteUrl },
  });
}

async function main() {
  // --- Model-creator providers ---
  const runway = await upsertProvider({
    name: "Runway",
    kind: "model_creator",
    websiteUrl: "https://runwayml.com",
  });
  const google = await upsertProvider({
    name: "Google",
    kind: "model_creator",
    websiteUrl: "https://ai.google.dev",
  });
  const kuaishou = await upsertProvider({
    name: "Kuaishou (Kling)",
    kind: "model_creator",
    websiteUrl: "https://klingai.com",
  });
  const bytedance = await upsertProvider({
    name: "ByteDance",
    kind: "model_creator",
    websiteUrl: "https://www.volcengine.com",
  });
  const xai = await upsertProvider({
    name: "xAI",
    kind: "model_creator",
    websiteUrl: "https://x.ai",
  });

  // --- Marketplace/reseller providers ---
  const fal = await upsertProvider({
    name: "Fal.ai",
    kind: "marketplace",
    websiteUrl: "https://fal.ai",
  });
  const replicate = await upsertProvider({
    name: "Replicate",
    kind: "marketplace",
    websiteUrl: "https://replicate.com",
  });
  const renderful = await upsertProvider({
    name: "Renderful",
    kind: "marketplace",
    websiteUrl: "https://renderful.com",
  });
  const apiframe = await upsertProvider({
    name: "Apiframe",
    kind: "marketplace",
    websiteUrl: "https://apiframe.pro",
  });
  const atlasCloud = await upsertProvider({
    name: "Atlas Cloud",
    kind: "marketplace",
    websiteUrl: "https://atlascloud.ai",
  });
  const evolink = await upsertProvider({
    name: "EvoLink",
    kind: "marketplace",
    websiteUrl: "https://evolink.ai",
  });

  // --- Models ---
  await prisma.model.upsert({
    where: { slug: "runway-gen4-5" },
    update: {},
    create: { name: "Runway Gen4.5", slug: "runway-gen4-5", creatorId: runway.id },
  });

  await prisma.model.upsert({
    where: { slug: "google-veo" },
    update: {},
    create: { name: "Google Veo", slug: "google-veo", creatorId: google.id },
  });

  await prisma.model.upsert({
    where: { slug: "kling" },
    update: {},
    create: { name: "Kling", slug: "kling", creatorId: kuaishou.id },
  });

  await prisma.model.upsert({
    where: { slug: "bytedance-seedance" },
    update: {},
    create: { name: "ByteDance Seedance", slug: "bytedance-seedance", creatorId: bytedance.id },
  });

  await prisma.model.upsert({
    where: { slug: "xai-grok-imagine" },
    update: {},
    create: { name: "xAI Grok Imagine", slug: "xai-grok-imagine", creatorId: xai.id },
  });

  console.log("Seeded 10 providers and 5 models. Add PriceEntry rows via /admin.");
  console.log("Marketplace providers seeded for reference:", {
    fal: fal.id,
    replicate: replicate.id,
    renderful: renderful.id,
    apiframe: apiframe.id,
    atlasCloud: atlasCloud.id,
    evolink: evolink.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
