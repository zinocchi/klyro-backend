import type { Prisma, Transaction, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { currentMonth, monthRange, todayDateOnly, toUtcDate } from '../../utils/date.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from './transaction.schema.js';

function buildTransactionWhere(
  userId: string,
  filters: ListTransactionsQuery,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { user_id: userId };

  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = filters.category;

  if (filters.month) {
    const { start, end } = monthRange(filters.month);
    where.date = { gte: start, lt: end };
  }

  return where;
}

export async function listTransactions(
  userId: string,
  filters: ListTransactionsQuery,
): Promise<Transaction[]> {
  return prisma.transaction.findMany({
    where: buildTransactionWhere(userId, filters),
    orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
  });
}

export interface TransactionSummary {
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
}

export async function getTransactionSummary(
  userId: string,
  month: string | undefined,
): Promise<TransactionSummary> {
  const targetMonth = month ?? currentMonth();
  const { start, end } = monthRange(targetMonth);

  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: { user_id: userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });

  const totalOf = (type: TransactionType): number =>
    grouped.find((row) => row.type === type)?._sum.amount ?? 0;

  const total_income = totalOf('INCOME');
  const total_expense = totalOf('EXPENSE');

  return {
    month: targetMonth,
    total_income,
    total_expense,
    balance: total_income - total_expense,
  };
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<Transaction> {
  return prisma.transaction.create({
    data: {
      user_id: userId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note ?? null,
      date: toUtcDate(input.date ?? todayDateOnly()),
    },
  });
}

async function assertTransactionOwnership(userId: string, transactionId: string): Promise<void> {
  const found = await prisma.transaction.findFirst({
    where: { id: transactionId, user_id: userId },
    select: { id: true },
  });

  if (!found) {
    throw AppError.notFound('Transaction not found');
  }
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  await assertTransactionOwnership(userId, transactionId);

  const data: Prisma.TransactionUpdateInput = {};

  if (input.type !== undefined) data.type = input.type;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.category !== undefined) data.category = input.category;
  if (input.note !== undefined) data.note = input.note;
  if (input.date !== undefined) data.date = toUtcDate(input.date);

  return prisma.transaction.update({ where: { id: transactionId }, data });
}

export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<{ id: string }> {
  const result = await prisma.transaction.deleteMany({
    where: { id: transactionId, user_id: userId },
  });

  if (result.count === 0) {
    throw AppError.notFound('Transaction not found');
  }

  return { id: transactionId };
}