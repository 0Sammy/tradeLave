import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

export const updateSettingsSchema = z.object({
    sharePrice: z.number().int().min(0).optional(),
    minShares: z.number().int().min(0).optional(),
    noWithdrawal: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const { schemas: settingsSchemas, $ref: settingsRef } = buildJsonSchemas(
    { updateSettingsSchema },
    { $id: 'SettingsSchema' }
);