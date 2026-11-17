-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "email_status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "email_error" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registrations_email_key" ON "registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_whatsapp_key" ON "registrations"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_ticket_code_key" ON "registrations"("ticket_code");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_qr_token_key" ON "registrations"("qr_token");

-- CreateIndex
CREATE INDEX "registrations_created_at_idx" ON "registrations"("created_at");
