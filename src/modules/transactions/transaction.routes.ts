import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionIdParamsSchema,
  updateTransactionSchema,
} from './transaction.schema.js';
import {
  getTransactions,
  patchTransaction,
  postTransaction,
  removeTransaction,
} from './transaction.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listTransactionsQuerySchema }), getTransactions);
router.post('/', validate({ body: createTransactionSchema }), postTransaction);
router.patch(
  '/:id',
  validate({ params: transactionIdParamsSchema, body: updateTransactionSchema }),
  patchTransaction,
);
router.delete('/:id', validate({ params: transactionIdParamsSchema }), removeTransaction);

export default router;