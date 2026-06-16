-- CreateEnum
CREATE TYPE "ReplyUserType" AS ENUM ('AGENT', 'CUSTOMER');

-- CreateTable
CREATE TABLE "reply" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userType" "ReplyUserType" NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reply_ticketId_idx" ON "reply"("ticketId");

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
