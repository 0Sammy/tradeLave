import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';


const createReferralSchema = z.object({
    referrer: z.string({
        required_error: 'Referrer is required',
    }),
    referredUser: z.string({
        required_error: 'Referred user is required',
    }),
});

const updateReferralSchema = z.object({
    referralId: z.string({
        required_error: 'Referral ID is required',
    }),
    rewardClaimed: z.number().int().nonnegative(),
});

const fetchReferralSchema = z.object({
    userId: z.string({
        required_error: 'User ID is required',
    }),
});

const deleteReferralSchema = z.object({
    referralId: z.string({
        required_error: 'Referral ID is required',
    }),
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;
export type FetchReferralInput = z.infer<typeof fetchReferralSchema>;
export type DeleteReferralInput = z.infer<typeof deleteReferralSchema>;

export const { schemas: referralSchemas, $ref: referralRef } =
    buildJsonSchemas(
        {
            createReferralSchema,
            updateReferralSchema,
            fetchReferralSchema,
            deleteReferralSchema,
        },
        { $id: 'ReferralSchema' }
    );
