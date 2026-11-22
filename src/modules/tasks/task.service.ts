import type { Prisma, Task } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schema.js';

/** `YYYY-MM-DD` → [start of that UTC day, start of the next UTC day). */
function utcDayRange(dateOnly: string): { start: Date; end: Date } {
  const start = new Date(`${dateOnly}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

function buildTaskWhere(userId: string, filters: ListTasksQuery): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { user_id: userId };

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;

  if (filters.due_date) {
    const { start, end } = utcDayRange(filters.due_date);
    where.due_date = { gte: start, lt: end };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function listTasks(userId: string, filters: ListTasksQuery): Promise<Task[]> {
  return prisma.task.findMany({
    where: buildTaskWhere(userId, filters),
    orderBy: [
      { due_date: { sort: 'asc', nulls: 'last' } },
      { created_at: 'desc' },
    ],
  });
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  return prisma.task.create({
    data: {
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      status: input.status,
      priority: input.priority,
      ...(input.subtasks !== undefined && { subtasks: input.subtasks as Prisma.InputJsonValue }),
      reminder_at: input.reminder_at ?? null,
    },
  });
}

async function assertTaskOwnership(userId: string, taskId: string): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, user_id: userId },
    select: { id: true },
  });

  if (!task) {
    throw AppError.notFound('Task not found');
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  await assertTaskOwnership(userId, taskId);

  const data: Prisma.TaskUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.due_date !== undefined) data.due_date = input.due_date;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.subtasks !== undefined) data.subtasks = input.subtasks as Prisma.InputJsonValue;
  if (input.reminder_at !== undefined) data.reminder_at = input.reminder_at;

  return prisma.task.update({ where: { id: taskId }, data });
}

export async function deleteTask(userId: string, taskId: string): Promise<{ id: string }> {
  const result = await prisma.task.deleteMany({
    where: { id: taskId, user_id: userId },
  });

  if (result.count === 0) {
    throw AppError.notFound('Task not found');
  }

  return { id: taskId };
}
