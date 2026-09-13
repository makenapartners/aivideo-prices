-- Adds fields needed for the real complexity found across Luma, Kling,
-- BytePlus/Seedance, Google Veo, and xAI's actual pricing pages.
-- Safe to run: PriceEntry has zero rows in production right now (you
-- haven't entered any real prices yet, only Providers/Models), so there
-- is no existing data this could possibly conflict with.

CREATE TYPE "OperationType" AS ENUM ('generate', 'edit', 'extend', 'reframe', 'lip_sync', 'other');
CREATE TYPE "BillingUnit" AS ENUM ('per_second', 'per_video', 'per_request', 'per_5_seconds');

ALTER TABLE "PriceEntry"
  ADD COLUMN "totalPrice" DOUBLE PRECISION,
  ADD COLUMN "forDurationSeconds" INTEGER,
  ADD COLUMN "billingUnit" "BillingUnit" NOT NULL DEFAULT 'per_second',
  ADD COLUMN "operationType" "OperationType" NOT NULL DEFAULT 'generate',
  ADD COLUMN "validFrom" TIMESTAMP(3),
  ADD COLUMN "validUntil" TIMESTAMP(3);
