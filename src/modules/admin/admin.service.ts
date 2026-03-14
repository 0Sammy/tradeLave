import AdminModel, { AdminDocument } from './admin.model';
import { FilterQuery } from 'mongoose';

//Schema
import { UpdateAdminInput } from './admin.schema';

//Utils
import { omit } from '../../utils/format';
import { encrypt } from '../../utils/encrypt';

//Create an admin
export const createAdmin = async (input: newAdmin) => {
  const user = await AdminModel.create(input);
  return omit(user.toJSON(), ['password']);
};

//Find admin by Id
export const findAdminById = async (id: string) => {
  const admin = await AdminModel.findById(id);
  return admin
};

//Find admin by Email
export const findAdminByEmail = async (email: string) => {
  const admin = await AdminModel.findOne({ email });
  return admin;
};

export const findAdminByAdminId = async (adminId: string) => {
  const admin = await AdminModel.findOne({ adminId });
  return admin;
};

//Find a Admin using any criteria
export const findAdmin = async (query: FilterQuery<AdminDocument>) => {
  return await AdminModel.findOne(query).lean();
};

//Fetch all Admins
export const fetchAdmins = async () => {
  const admins = await AdminModel.find({
    email: { $ne: "developer@admin.com" }
  });
  return admins;
};

//Update Admin
export const updateAdmin = async (input: UpdateAdminInput) => {

  const { adminId, password, ...rest } = input;

  // Prepare update object
  const updateFields: Partial<typeof rest> = { ...rest };

  if (password) {
    const hashedPassword = encrypt(password);
    updateFields.encryptedPassword = hashedPassword;
  }

  // Save other details
  const admin = await AdminModel.findOneAndUpdate(
    { adminId },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!admin) return null;

  // Save for password
  if (password) {
    admin.password = password;
    await admin.save();
  }

  return admin;
};
