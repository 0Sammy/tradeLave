import UserModel, { type UserDocument } from './user.model';
import { type FilterQuery } from 'mongoose';

//Schemas
import { type EditUserInput } from './user.schema';

//Utils
import { omit } from '../../utils/format';
import { encrypt } from '../../utils/encrypt';

//Create a user
export const createUser = async (input: newUser) => {
  const user = await UserModel.create(input);
  return omit(user.toJSON(), ['password']);
};

//Find user by ID
export const findUserById = async (id: string) => {
  const user = await UserModel.findById(id)

  if (!user) return null;

  return user;
};

//Find user by Email
export const findUserByEmail = async (email: string) => {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  return user;
};

//Find a User using any criteria
export const findUser = async (query: FilterQuery<UserDocument>) => {
  return await UserModel.findOne(query).lean();
};

//Fetch all users
export const fetchUsers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    UserModel.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    UserModel.countDocuments(),
  ]);

  return {
    data: users,
    pagination: { total, page, pages: Math.ceil(total / limit) },
  };
};

//Find user by name or accountId
export const fetchUser = async (value: string) => {
  const user = await UserModel.findOne({
    $or: [{ userName: value }, { accountId: value }, { email: value }],
  }).lean();

  if (!user) return null;

  return user;
};

//Update User Details
export const updateUser = async (input: EditUserInput) => {

  const { email, password, ...rest } = input;

  // Filter and save other details
  const updateFields: Record<string, any> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value)) {
        updateFields[`${key}.${subKey}`] = subValue;
      }
    } else {
      updateFields[key] = value;
    }
  }

  if (typeof input.isSuspended === 'boolean') {
    updateFields.suspendedDate = input.isSuspended
      ? new Date()
      : null;
  }

  if (password) {
    const hashedPassword = encrypt(password);
    updateFields.encryptedPassword = hashedPassword;
  }

  const user = await UserModel.findOneAndUpdate(
    { email },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!user) return null;

  // Save Password
  if (password?.trim()) {
    user.password = password;
    await user.save();
  }

  return user;
};


//Update User Session
export const updateUserSession = async (userId: string) => {
  const now = new Date();

  return await UserModel.findByIdAndUpdate(
    userId, { lastSession: now },
    { new: true }
  );
};
