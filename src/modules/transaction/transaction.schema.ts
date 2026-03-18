import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';
import { TransactionType, TransactionStatus, TransactionCoin } from './transaction.model';

//General Schema
import { responseCore } from '../general/general.schema';

// Transaction Core
const transactionCore = z.object({
  coin: z.nativeEnum(TransactionCoin, {
    required_error: 'Coin is required',
  }),
  transactionType: z.nativeEnum(TransactionType, {
    required_error: 'Transaction type is required',
  }),
  amount: z.number({
    required_error: 'Amount is required',
  }).int().min(1),
  network: z.string().optional(),
  transactionHash: z.string().optional(),
  walletAddress: z.string().optional(),
});

// Transaction With Meta
const transactionWithMeta = transactionCore.extend({
  user: z.string(),
  _id: z.string(),
  status: z.string(),
  details: z.record(z.string(), z.any()),
  createdAt: z.string().datetime(),
});

// Create Transaction Schema
const createTransactionSchema = transactionCore;

// Create User Transactions
const createUserTransactionSchema = createTransactionSchema.extend({
  user: z.string({
    required_error: 'User is required',
  }),
  status: z.nativeEnum(TransactionStatus, {
    required_error: 'Status is required',
  }),
});

// Fetch Transactions
const fetchTransactionSchema = z.object({
  transactionId: z.string({
    required_error: 'TransactionID is required',
  }),
});

// Fetch User Balance
const fetchUserBalanceSchema = z.object({
  userId: z.string({
    required_error: 'UserID is required',
  }),
});

// Get Coin Details
const getCoinDetailsSchema = z.object({
  coin: z.string({
    required_error: 'Coin is Required',
  }),
});

// Get Transaction With Types
const getTransactionWithTypesSchema = z.object({
  type: z.nativeEnum(TransactionType, {
    required_error: 'Transaction type is required',
  }),
})

const patchTransactionSchema = z.object({
  hash: z.string({
    required_error: 'Transaction Hash is required',
  }),
  Id: z.string({
    required_error: 'TransactionID is required',
  }),
});



// Get Transactions Response Schema
const getTransactionsResponseSchema = z.object({
  ...responseCore,
  data: z.array(transactionWithMeta),
});

// Get Transaction Response Schema
const getTransactionResponseSchema = z.object({
  ...responseCore,
  data: transactionWithMeta,
});

// Get Balance Response Schema
const getBalanceResponseSchema = z.object({
  ...responseCore,
  data: z.record(z.nativeEnum(TransactionCoin), z.number()),
});


// Administrative Schemas

// Update Transaction
const updateTransactionSchema = z.object({
  status: z.nativeEnum(TransactionStatus, {
    required_error: 'Status is required',
  }),
  transactionId: z.string({
    required_error: 'TransactionID is required',
  }),
});

// Get Type Transactions
const getTransactionsWithTypeSchema = z.object({
  transactionType: z.nativeEnum(TransactionType).optional(),
});

// Get User Transactions
const getUserTransactionsSchema = z.object({
  userId: z.string({
    required_error: 'UserId is required',
  }),
  transactionType: z.nativeEnum(TransactionType).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateUserTransactionInput = z.infer<typeof createUserTransactionSchema>;
export type FetchTransactionInput = z.infer<typeof fetchTransactionSchema>;
export type GetCoinDetailsInput = z.infer<typeof getCoinDetailsSchema>;
export type GetTransactionWithTypesInput = z.infer<typeof getTransactionWithTypesSchema>;
export type PatchTransactionInput = z.infer<typeof patchTransactionSchema>;

//Administrative
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsWithTypeInput = z.infer<typeof getTransactionsWithTypeSchema>;
export type GetUserTransactionInput = z.infer<typeof getUserTransactionsSchema>;
export type FetchUserBalanceInput = z.infer<typeof fetchUserBalanceSchema>;

export const { schemas: transactionSchemas, $ref: transactionRef } =
  buildJsonSchemas(
    {
      createTransactionSchema, createUserTransactionSchema, fetchTransactionSchema, fetchUserBalanceSchema, getCoinDetailsSchema, getTransactionWithTypesSchema, patchTransactionSchema, getTransactionsResponseSchema, getTransactionResponseSchema, getBalanceResponseSchema, updateTransactionSchema, getTransactionsWithTypeSchema, getUserTransactionsSchema,
    },
    { $id: 'TransactionSchema' }
  );
