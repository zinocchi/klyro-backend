-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "best_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reminder_time" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "remind_at" TIMESTAMP(3),
ADD COLUMN     "tag" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "reminder_at" TIMESTAMP(3),
ADD COLUMN     "subtasks" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "daily_reminder_time" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'id',
ADD COLUMN     "monthly_budget" INTEGER;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
