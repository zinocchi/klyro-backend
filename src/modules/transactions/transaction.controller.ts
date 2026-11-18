import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  createTransaction,
  deleteTransaction,
  getTransactionSummary,
  listTransactions,
  updateTransaction,
} from './transaction.service.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionSummaryQuery,
  UpdateTransactionInput,
} from './transaction.schema.js';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  return req.user.id;
}

/** GET /api/v1/transactions */
export const getTransactions: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const transactions = await listTransactions(
    requireUserId(req),
    req.query as ListTransactionsQuery,
  );

  sendSuccess(res, { transactions }, { message: 'Transactions retrieved successfully' });
};

/** GET /api/v1/transactions/summary */
export const getSummary: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const summary = await getTransactionSummary(
    requireUserId(req),
    (req.query as TransactionSummaryQuery).month,
  );

  sendSuccess(res, { summary }, { message: 'Transaction summary retrieved successfully' });
};

/** POST /api/v1/transactions */
export const postTransaction: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const transaction = await createTransaction(
    requireUserId(req),
    req.body as CreateTransactionInput,
  );

  sendSuccess(res, { transaction }, { statusCode: 201, message: 'Transaction created successfully' });
};

/** PATCH /api/v1/transactions/:id */
export const patchTransaction: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const transaction = await updateTransaction(
    requireUserId(req),
    req.params.id as string,
    req.body as UpdateTransactionInput,
  );

  sendSuccess(res, { transaction }, { message: 'Transaction updated successfully' });
};

/** DELETE /api/v1/transactions/:id */
export const removeTransaction: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const deleted = await deleteTransaction(requireUserId(req), req.params.id as string);

  sendSuccess(res, deleted, { message: 'Transaction deleted successfully' });
};