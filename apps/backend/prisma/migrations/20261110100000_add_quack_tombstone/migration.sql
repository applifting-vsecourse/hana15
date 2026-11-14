-- AlterTable
ALTER TABLE "quack" ADD COLUMN "deletedAt" TIMESTAMP(3),
ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- A deleted quack that others replied to stays as a placeholder without
-- content or author; every other row is complete.
ALTER TABLE "quack" ADD CONSTRAINT "quack_tombstone_check" CHECK (
  ("deletedAt" IS NULL AND "text" IS NOT NULL AND "userId" IS NOT NULL)
  OR ("deletedAt" IS NOT NULL AND "text" IS NULL AND "userId" IS NULL AND "mood" IS NULL)
);
