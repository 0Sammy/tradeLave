import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

// Types
import { PlanType } from './plans.model';

const planCore = z.object({
  title: z.string({
    required_error: 'Title is required',
  }),
  type: z.nativeEnum(PlanType, {
    required_error: 'Plan type is required',
  }),
  minValue: z.number().nonnegative(),
  maxValue: z.number().nonnegative(),
  roi: z.number().nonnegative(),
  durationDays: z.number().int().min(1),
  maxExecutions: z.number().int().min(1),
});

const createPlanSchema = planCore;

const updatePlanSchema = z.object({
  planId: z.string({
    required_error: 'Plan ID is required',
  }),
}).merge(planCore.partial());

const fetchPlanSchema = z.object({
  planId: z.string({
    required_error: 'Plan ID is required',
  }),
});

const deletePlanSchema = z.object({
  planId: z.string({
    required_error: 'Plan ID is required',
  }),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type FetchPlanInput = z.infer<typeof fetchPlanSchema>;
export type DeletePlanInput = z.infer<typeof deletePlanSchema>;

export const { schemas: planSchemas, $ref: planRef } = buildJsonSchemas(
  {
    createPlanSchema,
    updatePlanSchema,
    fetchPlanSchema,
    deletePlanSchema,
  },
  { $id: 'PlanSchema' }
);
