-- Adds price history support: a nullable supersededAt column on
-- PriceEntry. Null means "this is the current, live price" — existing
-- rows are unaffected and remain live (all NULL by default). Setting
-- supersededAt marks a row as historical without deleting it, so price
-- changes can be tracked over time instead of destroyed on update.
-- Safe, additive migration — no existing data is touched or removed.

ALTER TABLE "PriceEntry" ADD COLUMN "supersededAt" TIMESTAMP(3);
