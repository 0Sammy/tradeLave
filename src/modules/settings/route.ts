import { FastifyInstance } from 'fastify';

// Handlers
import { getSettingsHandler, updateSettingsHandler } from './controller';

// Middlewares
import { isSuperAdmin } from './../../middlewares/role';

// Schemas
import { settingsRef, UpdateSettingsInput } from './schema';

export default async function settingsRoutes(app: FastifyInstance) {

    app.get("/get", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Settings', 'Users'],
            security: [{ bearerAuth: [] }]
        }
    }, getSettingsHandler);

    // Admin
    app.put<{ Body: UpdateSettingsInput }>("/update", {
        preHandler: [app.authenticate, isSuperAdmin],
        schema: {
            tags: ['Settings', 'Admins'],
            security: [{ bearerAuth: [] }],
            body: settingsRef('updateSettingsSchema')
        }
    }, updateSettingsHandler);
}