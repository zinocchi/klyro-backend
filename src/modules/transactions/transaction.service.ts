import type { Prisma, Transaction } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { todayDateOnly, toUtcDate, utcDayRange } from '../../utils/date.js';
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

  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: utcDayRange(filters.from).start } : {}),
      ...(filters.to ? { lt: utcDayRange(filters.to).end } : {}),
    };
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