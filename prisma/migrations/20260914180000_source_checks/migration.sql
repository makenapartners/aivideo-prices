-- Adds SourceCheck: a log of "we re-checked this provider's pricing" events,
-- separate from PriceEntry.checkedAt. Lets /prices show an honest "last
-- verified" date per provider even on checks that found no changes.
-- Purely additive — no existing tables or data are touched.

CREATE TABLE "SourceCheck" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changesFound" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "SourceCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SourceCheck_providerId_idx" ON "SourceCheck"("providerId");

ALTER TABLE "SourceCheck" ADD CONSTRAINT "SourceCheck_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
