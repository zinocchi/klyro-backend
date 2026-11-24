-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "reminder_interval" INTEGER,
ADD COLUMN     "reminders" JSONB NOT NULL DEFAULT '[]';
