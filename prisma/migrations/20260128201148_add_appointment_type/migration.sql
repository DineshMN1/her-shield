-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('VIDEO', 'CLINIC');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "type" "AppointmentType" NOT NULL DEFAULT 'CLINIC';

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
