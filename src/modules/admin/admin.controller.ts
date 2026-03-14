import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import { createAdmin, fetchAdmins, findAdminByAdminId, findAdminByEmail, findAdminById, updateAdmin } from './admin.service';

// Schemas
import { CreateAdminInput, UpdateAdminInput } from './admin.schema';

// Utils
import { sendResponse } from '../../utils/response.utils';
import { encrypt } from '../../utils/encrypt';

export const createAdminHandler = async (request: FastifyRequest<{ Body: CreateAdminInput }>, reply: FastifyReply) => {

  const decodedAdmin = request.user;

  //Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 401, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  //Check if admin with such email already exists
  const existingAdmin = await findAdminByEmail(request.body.email);
  if (existingAdmin) return sendResponse(reply, 409, false, 'An admin with the same email already exists');

  //Encrypt Password
  const encryptedPassword = encrypt(request.body.password);

  //Create new admin
  const newAdmin = await createAdmin({ ...request.body, encryptedPassword });
  return sendResponse(reply, 201, true, 'Admin was created successfully', newAdmin);
};

//Creation of Admin without login details
export const sampleAdminCreationHandler = async (request: FastifyRequest<{ Body: CreateAdminInput }>, reply: FastifyReply) => {

  //Check if admin with such email already exists
  const existingAdmin = await findAdminByEmail(request.body.email);
  if (existingAdmin) return sendResponse(reply, 409, false, 'An admin with the same email already exists');

  //Encrypt Password
  const encryptedPassword = encrypt(request.body.password);

  //Create new admin
  const newAdmin = await createAdmin({ ...request.body, encryptedPassword });
  return sendResponse(reply, 201, true, 'Admin was created successfully', newAdmin);
};

//Fetch current admin
export const getAdminHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedAdmin = request.user;

  //Fetch admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 401, false, 'Sorry, but you are not authorized to perform this action');

  return sendResponse(reply, 200, true, 'Your details was fetched successfully', admin);
};

//Fetch all admins
export const fetchAdminsHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedAdmin = request.user;

  //Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 401, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  const admins = await fetchAdmins();
  return sendResponse(reply, 200, true, 'Your admin was fetched successfully', admins);
};

//Update an admin
export const updateAdminHandler = async (request: FastifyRequest<{ Body: UpdateAdminInput }>, reply: FastifyReply) => {

  const decodedAdmin = request.user;
  const { adminId } = request.body;

  //Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 401, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  //Fetch the admin by their AdminId
  const existingAdmin = await findAdminByAdminId(adminId);
  if (!existingAdmin) return sendResponse(reply, 400, false, 'Admin not found');

  const updatedAdmin = await updateAdmin(request.body);
  return sendResponse(reply, 200, true, 'Admin was updated successfully', updatedAdmin);
};
