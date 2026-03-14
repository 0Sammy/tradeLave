import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

// Types
import { TransactionCoin } from '../transaction/transaction.model';
import { DepositStatus } from './depositRequest.model';


const roleEnum = z.enum(['user', 'admin']);
const createDepositRequestSchema = z.object({
    coin: z.nativeEnum(TransactionCoin),
    amount: z.number().nonnegative(),
    notes: z.string().optional(),
});;

const editDepositRequestSchema = z.object({
    depositId: z.string({
        required_error: 'Deposit Id is required',
    }),
    hasPaid: z.boolean().optional(),
    details: z.object({
        role: roleEnum,
        message: z.any()
    }).optional(),
})

const createUserDepositRequestSchema = createDepositRequestSchema.extend({
    user: z.string({
        required_error: 'User is required',
    }),
    status: z.nativeEnum(DepositStatus, {
        required_error: 'Status is required',
    }),
    hasPaid: z.boolean(),
    details: z.object({
        role: roleEnum,
        message: z.any()
    }).optional(),
    createdAt: z.coerce.date().optional(),
});

const editUserDepositRequestSchema = z.object({
    depositId: z.string({
        required_error: 'Deposit Id is required',
    }),
    coin: z.nativeEnum(TransactionCoin).optional(),
    amount: z.number().nonnegative().optional(),
    status: z.nativeEnum(DepositStatus).optional(),
    hasPaid: z.boolean().optional(),
    details: z.object({
        role: roleEnum,
        message: z.any()
    }).optional(),
    createdAt: z.coerce.date().optional(),
})

const fetchUserDepositRequestSchema = z.object({
    userId: z.string({
        required_error: 'UserID is required',
    }),
});

const deleteDepositRequestSchema = z.object({
    depositId: z.string({
        required_error: "Deposit Request ID is required"
    })
})

export type CreateDepositRequestInput = z.infer<typeof createDepositRequestSchema>;
export type EditDepositRequestInput = z.infer<typeof editDepositRequestSchema>;
export type CreateUserDepositRequestInput = z.infer<typeof createUserDepositRequestSchema>;
export type FetchUserDepositRequestInput = z.infer<typeof fetchUserDepositRequestSchema>;
export type EditUserDepositRequestInput = z.infer<typeof editUserDepositRequestSchema>;
export type DeleteDepositRequestInput = z.infer<typeof deleteDepositRequestSchema>;

export const { schemas: depositRequestSchemas, $ref: depositRequestRef } =
    buildJsonSchemas(
        { createDepositRequestSchema, editDepositRequestSchema, createUserDepositRequestSchema, fetchUserDepositRequestSchema, editUserDepositRequestSchema, deleteDepositRequestSchema },
        { $id: 'DepositRequestSchema' }
    );