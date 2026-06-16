-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL_QUESTION', 'TECHNICAL_ISSUE', 'REFUND_REQUEST');

-- CreateTable
CREATE TABLE "ticket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "resendEmailId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "category" "TicketCategory",
    "assignedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_resendEmailId_key" ON "ticket"("resendEmailId");

-- CreateIndex
CREATE INDEX "ticket_status_idx" ON "ticket"("status");

-- CreateIndex
CREATE INDEX "ticket_createdAt_idx" ON "ticket"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_assignedId_idx" ON "ticket"("assignedId");

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assignedId_fkey" FOREIGN KEY ("assignedId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
