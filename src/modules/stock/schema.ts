import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';
import { CryptoCoin } from './model';


// Deposit Schema
export const depositSchema = z.object({
    cryptoSymbol: z.nativeEnum(CryptoCoin),
    cryptoAmount: z.number(),
    usdEquivalent: z.number().min(1),
    hash: z.string().optional()
});

// Withdrawal Schema
export const withdrawSchema = z.object({
    cryptoSymbol: z.nativeEnum(CryptoCoin),
    cryptoAmount: z.number(),
    walletAddress: z.string().min(5),
    usdEquivalent: z.number().min(1),
});

// Buy Schema (Buying $X worth of stock using crypto)
export const buySchema = z.object({
    stockSymbol: z.string().min(4),
    usdInvestmentAmount: z.number().min(1),
    cryptoSymbol: z.nativeEnum(CryptoCoin),
    currentPrice: z.number().min(1), // Price per share
});

// Sell Schema (Selling X shares for crypto)
export const sellSchema = z.object({
    stockSymbol: z.string().min(4),
    sharesToSell: z.number().min(1),
    cryptoSymbol: z.nativeEnum(CryptoCoin),
    currentPrice: z.number().min(1),
});

// Update Transaction
export const updateSchema = z.object({
    id: z.string({
        required_error: "Transaction Id is required"
    }),
    status: z.string({
        required_error: "The new transaction status is required"
    })
})

// UserId
export const userIdParamsSchema = z.object({
    userId: z.string().length(24),
});

// Transaction Id
export const transactionIdParamsSchema = z.object({
    transactionId: z.string().length(24),
});

export const stockSymbolParamsSchema = z.object({
    stockSymbol: z.string().min(1).toUpperCase(),
})

export type StockDepositInput = z.infer<typeof depositSchema>;
export type StockWithdrawInput = z.infer<typeof withdrawSchema>;
export type StockBuyInput = z.infer<typeof buySchema>;
export type StockSellInput = z.infer<typeof sellSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type UserIdInput = z.infer<typeof userIdParamsSchema>;
export type TransactionIdInput = z.infer<typeof transactionIdParamsSchema>;
export type StockSymbolParams = z.infer<typeof stockSymbolParamsSchema>;

export const { schemas: stockSchemas, $ref: stockRef } = buildJsonSchemas(
    {
        depositSchema,
        withdrawSchema,
        buySchema,
        sellSchema,
        updateSchema,
        userIdParamsSchema,
        transactionIdParamsSchema,
        stockSymbolParamsSchema
    },
    { $id: 'StockSchema' }
);