-- Seeds Providers and Models for the 5 launch-list models.
-- Paste this whole file into Neon's SQL Editor and run it, AFTER
-- running migration.sql.
--
-- Deliberately does NOT insert any PriceEntry rows — every price on the
-- live site must trace back to a source_url you've actually checked.
-- Add those yourself through /admin. See README.md for the numbers
-- from the original research pass to re-verify.

-- Model-creator providers
INSERT INTO "Provider" (id, name, kind, "websiteUrl", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Runway', 'model_creator', 'https://runwayml.com', now()),
  (gen_random_uuid()::text, 'Google', 'model_creator', 'https://ai.google.dev', now()),
  (gen_random_uuid()::text, 'Kuaishou (Kling)', 'model_creator', 'https://klingai.com', now()),
  (gen_random_uuid()::text, 'ByteDance', 'model_creator', 'https://www.volcengine.com', now()),
  (gen_random_uuid()::text, 'xAI', 'model_creator', 'https://x.ai', now())
ON CONFLICT (name) DO NOTHING;

-- Marketplace/reseller providers
INSERT INTO "Provider" (id, name, kind, "websiteUrl", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Fal.ai', 'marketplace', 'https://fal.ai', now()),
  (gen_random_uuid()::text, 'Replicate', 'marketplace', 'https://replicate.com', now()),
  (gen_random_uuid()::text, 'Renderful', 'marketplace', 'https://renderful.com', now()),
  (gen_random_uuid()::text, 'Apiframe', 'marketplace', 'https://apiframe.pro', now()),
  (gen_random_uuid()::text, 'Atlas Cloud', 'marketplace', 'https://atlascloud.ai', now()),
  (gen_random_uuid()::text, 'EvoLink', 'marketplace', 'https://evolink.ai', now())
ON CONFLICT (name) DO NOTHING;

-- Models — look up each creator's id by name so we don't need to know
-- the generated ids in advance.
INSERT INTO "Model" (id, name, slug, "creatorId", "updatedAt")
SELECT gen_random_uuid()::text, 'Runway Gen4.5', 'runway-gen4-5', id, now()
FROM "Provider" WHERE name = 'Runway'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Model" (id, name, slug, "creatorId", "updatedAt")
SELECT gen_random_uuid()::text, 'Google Veo', 'google-veo', id, now()
FROM "Provider" WHERE name = 'Google'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Model" (id, name, slug, "creatorId", "updatedAt")
SELECT gen_random_uuid()::text, 'Kling', 'kling', id, now()
FROM "Provider" WHERE name = 'Kuaishou (Kling)'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Model" (id, name, slug, "creatorId", "updatedAt")
SELECT gen_random_uuid()::text, 'ByteDance Seedance', 'bytedance-seedance', id, now()
FROM "Provider" WHERE name = 'ByteDance'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Model" (id, name, slug, "creatorId", "updatedAt")
SELECT gen_random_uuid()::text, 'xAI Grok Imagine', 'xai-grok-imagine', id, now()
FROM "Provider" WHERE name = 'xAI'
ON CONFLICT (slug) DO NOTHING;

-- Sanity check — should return 11 providers and 5 models
SELECT (SELECT count(*) FROM "Provider") AS provider_count,
       (SELECT count(*) FROM "Model") AS model_count;
