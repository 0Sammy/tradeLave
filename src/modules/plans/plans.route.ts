import { FastifyInstance } from 'fastify';

// Handlers
import { createPlanHandler, deletePlanHandler, getAllPlansHandler, updatePlanHandler } from './plans.controller';

// Middlewares
import { hasPermission } from '../../middlewares/auth';

// Schemas
import { CreatePlanInput, DeletePlanInput, planRef, UpdatePlanInput } from './plans.schema';
import { generalRef } from '../general/general.schema';


// Plans routes
export default async function plansRoutes(app: FastifyInstance) {

    // Create new plan
    app.post<{ Body: CreatePlanInput }>('/create',
        {
            preHandler: [
                app.authenticate,
                hasPermission(["super_admin"])
            ],
            schema: {
                tags: ['Plans'],
                security: [{ bearerAuth: [] }],
                body: planRef('createPlanSchema'),
                response: {
                    404: generalRef('unavailableSchema'),
                    401: generalRef('unauthorizedSchema'),
                    201: generalRef('responseSchema')
                },
            },
        },
        createPlanHandler
    );

    // Update Plan
    app.patch<{ Body: UpdatePlanInput }>('/update', {
        preHandler: [
            app.authenticate,
            hasPermission(["super_admin"])
        ],
        schema: {
            tags: ['Plans'],
            security: [{ bearerAuth: [] }],
            body: planRef('updatePlanSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                401: generalRef('unauthorizedSchema'),
                200: generalRef('responseSchema')
            },
        },
    }, updatePlanHandler
    )

    // Get all plans
    app.get("/get", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Plans'],
            security: [{ bearerAuth: [] }],
            response: {
                401: generalRef('unauthorizedSchema'),
            },
        },
    }, getAllPlansHandler
    )

    // Delete Plan
    app.delete<{ Params: DeletePlanInput }>('/delete/:planId', {
        preHandler: [
            app.authenticate,
            hasPermission(["super_admin"])
        ],
        schema: {
            tags: ['Plans'],
            security: [{ bearerAuth: [] }],
            params: planRef('deletePlanSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                401: generalRef('unauthorizedSchema'),
                204: generalRef('responseSchema')
            },
        },
    }, deletePlanHandler
    )
}