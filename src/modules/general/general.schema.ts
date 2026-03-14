import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

export const responseCore = {
  status: z.number(),
  success: z.boolean(),
  message: z.string(),
};

const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

const responseSchema = z.object(responseCore);
const badRequestSchema = z.object(responseCore);
const conflictRequestSchema = z.object(responseCore);
const unauthorizedSchema = z.object(responseCore);
const forbiddenSchema = z.object(responseCore);
const unavailableSchema = z.object(responseCore);
const payloadSchema = z.object(responseCore);
const unsupportedSchema = z.object(responseCore);

export type PaginationInput = z.infer<typeof paginationSchema>;

export const { schemas: generalSchemas, $ref: generalRef } = buildJsonSchemas(
  {
    responseSchema,
    badRequestSchema,
    conflictRequestSchema,
    unauthorizedSchema,
    forbiddenSchema,
    unavailableSchema,
    payloadSchema,
    unsupportedSchema,
    paginationSchema,
  },
  { $id: 'GeneralSchema' }
);
