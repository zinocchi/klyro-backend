import { z } from 'zod';
import { dateOnlySchema } from '../../utils/date.js';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export const transactionIdParamsSchema = z.object({
  id: z.uuid('Transaction id must be a valid UUID'),
});

export const listTransactionsQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  category: z.string().trim().min(1).max(50).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z
    .number('Amount must be a number')
    .int('Amount must be a whole number of rupiah')
    .positive('Amount must be greater than zero')
    .max(1_000_000_000_000, 'Amount is too large'),
  category: z.string().trim().min(1, 'Category is required').max(50, 'Category is too long'),
  note: z.string().trim().max(500, 'Note is too long').optional(),
  date: dateOnlySchema.optional(), // defaults to today (UTC)
});

export const updateTransactionSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    amount: z.number().int('Amount must be a whole number of rupiah').positive().max(1_000_000_000_000).optional(),
    category: z.string().trim().min(1, 'Category cannot be empty').max(50).optional(),
    note: z.string().trim().max(500, 'Note is too long').nullable().optional(),
    date: dateOnlySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type TransactionTypeInput = z.infer<typeof transactionTypeSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;