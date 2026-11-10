-- AlterTable
ALTER TABLE "quack" ADD COLUMN "threadId" TEXT,
ADD COLUMN "replyToId" TEXT;

-- CreateIndex
CREATE INDEX "quack_threadId_createdAt_idx" ON "quack"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "quack_replyToId_idx" ON "quack"("replyToId");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A reply has both pointers, a root quack has neither.
ALTER TABLE "quack" ADD CONSTRAINT "quack_reply_pointers_check" CHECK (("threadId" IS NULL) = ("replyToId" IS NULL));
