-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('UPLOADING', 'READY', 'ERROR');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "recordingError" TEXT,
ADD COLUMN     "recordingKey" TEXT,
ADD COLUMN     "recordingStatus" "RecordingStatus";
