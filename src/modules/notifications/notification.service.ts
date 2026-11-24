import type { Notification } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { monthRange } from '../../utils/date.js';
import type { CreateNotificationInput } from './notification.schema.js';

const LIST_LIMIT = 50;

export interface NotificationList {
  notifications: Notification[];
  unread_count: number;
}

/** Stores a client-triggered notification (e.g. a fired task reminder) for the user. */
export async function createNotification(
  userId: string,
  input: CreateNotificationInput,
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      user_id: userId,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  });
}

export async function listNotifications(userId: string): Promise<NotificationList> {
  const [notifications, unread_count] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: LIST_LIMIT,
    }),
    prisma.notification.count({ where: { user_id: userId, is_read: false } }),
  ]);

  return { notifications, unread_count };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<Notification> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { is_read: true },
  });

  if (result.count === 0) {
    throw AppError.notFound('Notification not found');
  }

  return prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
}

export async function markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });

  return { updated: result.count };
}

const BUDGET_THRESHOLDS = [80, 100] as const;

async function createBudgetAlertOnce(
  userId: string,
  monthLabel: string,
  threshold: number,
  percent: number,
): Promise<void> {
  const title = threshold >= 100 ? 'Budget exceeded' : 'Budget warning';
  const message = `Your expenses for ${monthLabel} have reached ${percent}% of your monthly budget (${threshold}% threshold).`;

  const existing = await prisma.notification.findFirst({
    where: { user_id: userId, type: 'BUDGET_ALERT', title, message: { contains: monthLabel } },
    select: { id: true },
  });

  if (existing) return;

  await prisma.notification.create({
    data: { user_id: userId, type: 'BUDGET_ALERT', title, message },
  });
}

/**
 * Creates BUDGET_ALERT notifications when monthly EXPENSE spending crosses the 80%
 * or 100% threshold. Best-effort: failures never break transaction creation.
 */
export async function evaluateBudgetAlert(userId: string, transactionDate: Date): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { monthly_budget: true },
    });

    if (!user?.monthly_budget || user.monthly_budget <= 0) return;

    const monthLabel = transactionDate.toISOString().slice(0, 7);
    const { start, end } = monthRange(monthLabel);

    const aggregate = await prisma.transaction.aggregate({
      where: { user_id: userId, type: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    const spent = aggregate._sum.amount ?? 0;
    const percent = Math.floor((spent / user.monthly_budget) * 100);

    for (const threshold of BUDGET_THRESHOLDS) {
      if (percent >= threshold) {
        await createBudgetAlertOnce(userId, monthLabel, threshold, percent);
      }
    }
  } catch {
    // Alerts are non-critical; swallow so the transaction still succeeds.
  }
}
