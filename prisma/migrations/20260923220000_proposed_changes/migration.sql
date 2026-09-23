-- Adds ProposedChange: AI-proposed price changes/additions awaiting
-- human review, plus the back-relation from SourceCheck. Purely
-- additive — no existing tables or data are touched.

CREATE TABLE "ProposedChange" (
    "id" TEXT NOT NULL,
    "sourceCheckId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "proposedData" JSONB NOT NULL,
    "oldPriceEntryId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'high',
    "explanation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ProposedChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProposedChange_status_idx" ON "ProposedChange"("status");
CREATE INDEX "ProposedChange_providerId_idx" ON "ProposedChange"("providerId");

ALTER TABLE "ProposedChange" ADD CONSTRAINT "ProposedChange_sourceCheckId_fkey"
    FOREIGN KEY ("sourceCheckId") REFERENCES "SourceCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposedChange" ADD CONSTRAINT "ProposedChange_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
