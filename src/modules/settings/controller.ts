import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import { getSettings, updateSettings } from './service';

// Schemas
import { UpdateSettingsInput } from './schema';

// Utils
import { sendResponse } from '../../utils/response.utils';


// Get Settings
export const getSettingsHandler = async (_: FastifyRequest, reply: FastifyReply) => {
    const settings = await getSettings();
    return sendResponse(reply, 200, true, "Settings fetched successfully", settings);
};


// Admin

// Update Settings
export const updateSettingsHandler = async (request: FastifyRequest<{ Body: UpdateSettingsInput }>, reply: FastifyReply) => {
    const updateData = request.body;

    const settings = await updateSettings(updateData);
    return sendResponse(reply, 200, true, "Settings updated successfully", settings);
};