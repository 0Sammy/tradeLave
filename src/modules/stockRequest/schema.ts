import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

export const createRequestSchema = z.object({
    stockSymbol: z.string({ required_error: "Stock Symbol must be a String" }),
    shares: z.number({ required_error: "Shares must be a number" }).min(1),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const { schemas: requestSchemas, $ref: requestRef } = buildJsonSchemas(
    {
        createRequestSchema
    },
    { $id: 'RequestSchema' }
);