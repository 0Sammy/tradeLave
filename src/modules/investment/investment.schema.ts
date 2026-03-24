import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { InvestmentStatus } from "./investment.model";

// Types
import { TransactionCoin } from '../transaction/transaction.model';

// Configs
import { INVESTMENT_MINIMUM } from "../../config";

const investmentCore = z.object({
    user: z.string().optional(),
    coin: z.nativeEnum(TransactionCoin),
    plan: z.string({ required_error: "Plan is required" }),
    amount: z.number().int().min(INVESTMENT_MINIMUM),
    rate: z.number().int().nonnegative(),
});

const createInvestmentSchema = investmentCore.extend({
    status: z.nativeEnum(InvestmentStatus).optional(),
});

const fetchUserInvestmentsSchema = z.object({
    userId: z.string({ required_error: "User ID is required" }),
});

const updateInvestmentStatusSchema = z.object({
    investmentId: z.string({ required_error: "Investment ID is required" }),
    status: z.nativeEnum(InvestmentStatus, {
        required_error: "Status is required",
    }),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type FetchUserInvestmentsInput = z.infer<typeof fetchUserInvestmentsSchema>;
export type UpdateInvestmentStatusInput = z.infer<typeof updateInvestmentStatusSchema>;

export const {
    schemas: investmentSchemas,
    $ref: investmentRef,
} = buildJsonSchemas(
    {
        createInvestmentSchema,
        fetchUserInvestmentsSchema,
        updateInvestmentStatusSchema,
    },
    { $id: "InvestmentSchema" }
);
