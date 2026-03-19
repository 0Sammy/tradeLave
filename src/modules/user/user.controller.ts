import { type FastifyRequest, type FastifyReply } from 'fastify';
import { app } from '../../app';
import path from 'path';
import { randomUUID } from 'crypto';

// Services
import { createUser, fetchUser, fetchUsers, findUser, findUserByEmail, findUserById, updateUser, } from './user.service';
import { findAdminById } from '../admin/admin.service';
import { createSession } from '../auth/auth.service';
import { getLocationFromIP } from '../auth/auth.controller';
import { createReferral } from '../referral/referral.services';

// Schemas, Configs, Emails
import { type CreateUserInput, type EditUserInput, emailValidationSchema, type FetchUserInput, type VerifyUserInput } from './user.schema';
import { FILE_SIZE } from '../../config';
import welcome from '../../emails/UserMails/welcome';
import verificationEmail from '../../emails/UserMails/verificationEmail';
import suspensionEmail from '../../emails/UserMails/suspension';
import unsuspensionEmail from '../../emails/UserMails/unsuspended';
import kyc from '../../emails/UserMails/kyc';
import generalTemplate from '../../emails/AdminMails/general';
import { PaginationInput } from '../general/general.schema';

// Utils
import { sendResponse } from '../../utils/response.utils';
import { sendAdminEmail, sendEmail } from '../../libs/mailer';
import { encrypt } from '../../utils/encrypt';
import { deleteFileFromS3, uploadFileToS3 } from '../../libs/upload';
import { emitAndSaveNotification } from '../../utils/socket';

// Constants
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = FILE_SIZE * 1024 * 1024;

//Create new user
export const createUserHandler = async (request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) => {

  const { email, ip, device, referral } = request.body;

  // Validate the email
  const validationResult = emailValidationSchema.safeParse(email);
  if (!validationResult.success) {
    return sendResponse(reply, 403, false, "It looks like emails from that domain aren't accepted. Please use a different email address.");
  }

  //Check if user exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) return sendResponse(reply, 409, false, 'An account with this email address already exists. Please log in or use a different email address to create a new account.');

  //Encrypt Password and generate passPhrase
  const encryptedPassword = encrypt(request.body.password);

  // Create user and Notify Admin
  const newUser = await createUser({
    ...request.body,
    encryptedPassword,
  });

  // Admin Email Notification
  const template = generalTemplate({
    action: "A New User Just Created An Account",
    message: `The user with the email ${newUser.email} and username ${newUser.userName} just created a new account kindly login and continue`,
    name: newUser.userName,
    email: newUser.email,
    accountId: newUser.accountId,
  })
  await sendAdminEmail(template.html);

  const userId = newUser._id.toString();

  // Check referral if it exists
  if (referral !== undefined && referral.length === 12) {

    const referralUser = await findUser({ accountId: referral });
    if (!referralUser) return sendResponse(reply, 400, false, "Referral not found.")

    // Create new referral document
    await createReferral({ referrer: referralUser._id.toString(), referredUser: userId })
  }

  const jti = randomUUID();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 1000 * 60 * 60 * 24 * 7; // 7 days

  const accessToken = app.jwt.sign({ userId, jti, role: "user" }, { expiresIn: '7d' });

  // Get location details from IP Address
  const loginDetails = await getLocationFromIP(ip);

  // Create Session
  await createSession(jti, userId, {
    userId,
    issuedAt,
    expiresAt,
    ip: ip,
    device,
    loginDetails,
    lastSeen: new Date()
  });

  // Generate Email templates and send Emails
  const welcomeEmailContent = welcome({ name: newUser.userName });
  await sendEmail({ to: newUser.email, subject: 'Welcome to Trade Lave', html: welcomeEmailContent.html });

  return sendResponse(reply, 201, true, 'Welcome! Your account is ready.', accessToken);
};

// Verify User Handler
export const verifyUserHandler = async (request: FastifyRequest<{ Body: VerifyUserInput }>, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const verificationCode = request.body.verificationCode;

  // Find the userId and throw an error if there is no user
  const user = await findUserById(decodedDetails.userId);
  if (!user) return sendResponse(reply, 400, false, 'The specified user account does not exist.');

  // Check if the user is already verified
  if (user.isVerified) return sendResponse(reply, 409, false, 'Your Email is already verified');

  // Check if the code is still valid, and send a new one if it is not
  const now = new Date();
  if (user.verificationCode === verificationCode && user.verificationCodeExpiry < now) {
    const newCode = await user.generateNewVerificationCode();
    const emailContent = verificationEmail({ name: user.userName, verificationCode: newCode });
    await sendEmail({ to: user.email, subject: 'Email Verification', html: emailContent.html });
    return sendResponse(reply, 400, false, 'Your verification code has expired. A new code has been sent to your email');
  }

  // Throw an error if verification code doesn't match
  if (user.verificationCode !== verificationCode) {
    return sendResponse(reply, 400, false, 'Invalid Verification Code, kindly try again later.');
  }

  user.isVerified = true;
  await user.save();

  return sendResponse(reply, 200, true, 'Your email was verified successfully.');
};

// Resend Email Verification
export const resendVerification = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;

  // Find the userId and throw an error if there is no user
  const user = await findUserById(decodedDetails.userId);
  if (!user) return sendResponse(reply, 400, false, 'The specified user account does not exist.');

  // Check if the user is already verified
  if (user.isVerified) return sendResponse(reply, 409, false, 'Your Account is already verified');

  // Generate a new code and send
  const newCode = await user.generateNewVerificationCode();
  const emailContent = verificationEmail({ name: user.userName, verificationCode: newCode });
  await sendEmail({ to: user.email, subject: 'Email Verification', html: emailContent.html });

  //Return a response
  return sendResponse(reply, 200, true, 'A new verification code has been sent to your email');
};

// Handler a user KYC
export const kycUploadHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const parts = request.parts();

  const userDetails = await findUserById(decodedDetails.userId);
  if (!userDetails) return sendResponse(reply, 400, false, "Couldn't find your profile, kindly try again later");

  // Delete Previous KYC Image
  if (userDetails.kyc?.images && userDetails.kyc.images.length > 0) {
    for (const imageUrl of userDetails.kyc.images) {
      const deleted = await deleteFileFromS3(imageUrl);
      if (!deleted) return sendResponse(reply, 500, false, 'Something went wrong while deleting old KYC images. Please try again later.');
    }
  }

  const imageUrls: string[] = [];
  let gender: 'male' | 'female' | 'prefer not to say' | undefined;
  let idType: string | undefined;


  let fileCount = 0;
  for await (const part of parts) {

    if (part.type === 'file') {
      fileCount++;
      if (fileCount > 2) {
        throw new Error('TOO_MANY_FILES');
      }
    }

    if (part.type === 'file') {
      if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) throw new Error('UNSUPPORTED_MEDIA_TYPE');

      const buffer = await part.toBuffer();
      if (buffer.length > MAX_FILE_SIZE_BYTES) return sendResponse(reply, 413, false, `Each file must be under ${FILE_SIZE}MB.`)

      const ext = path.extname(part.filename || '');
      const filename = `kyc/${randomUUID()}${ext}`;
      const imageUrl = await uploadFileToS3(filename, buffer, part.mimetype);
      imageUrls.push(imageUrl);
    } else if (typeof part.value === 'string' && (part.value === 'male' || part.value === 'female' ||
      part.value === 'prefer not to say')) {
      gender = part.value;
    } else if (part.type === 'field' && part.fieldname === 'idType') {
      if (typeof part.value === 'string') {
        idType = part.value;
      }
    }
  }

  if (!idType) return sendResponse(reply, 400, false, 'Your ID Type is required.');

  // Edit user details
  const updatedUser = await updateUser({
    email: userDetails.email, gender,
    kyc: { images: imageUrls, idType, lastSubmissionDate: new Date(), status: 'pending' },
  });

  if (!updatedUser) return sendResponse(reply, 403, false, 'User details was not updated. The user profile could not be accessed.');

  // User Socket Notification
  await emitAndSaveNotification({
    user: decodedDetails.userId,
    type: 'system',
    subType: "kyc",
    title: `Your KYC Submission is Under Review!`,
    message: `Thanks for submitting your Know Your Customer (KYC) documents. We've received your information and it's currently being reviewed.`,
  });

  // Admin Email Notification
  const template = generalTemplate({
    action: "A User Submitted Their KYC",
    message: `The user with the email ${updatedUser.email} and username ${updatedUser.userName} submitted their KYC, kindly login and continue`,
    name: updatedUser.userName,
    email: updatedUser.email,
    accountId: updatedUser.accountId,
  })
  await sendAdminEmail(template.html);

  // Return a response
  return sendResponse(reply, 200, true, 'KYC submitted. Results pending; you will be updated soon.');
};

// Update Profile Picture
export const updateProfilePictureHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const parts = request.parts();

  const userDetails = await findUserById(decodedDetails.userId);
  if (!userDetails) return sendResponse(reply, 400, false, "Couldn't find your profile, kindly try again later");

  // Delete Previous Profile Picture
  if (userDetails.profilePicture) {
    const deleted = await deleteFileFromS3(userDetails.profilePicture);
    if (!deleted) return sendResponse(reply, 500, false, 'Something went wrong, kindly try again later.');
  }

  const imageUrls: string[] = [];

  for await (const part of parts) {
    if (part.type === 'file') {

      if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) return sendResponse(reply, 415, false, 'Only JPG, PNG, and WEBP images are allowed.');

      const buffer = await part.toBuffer();
      if (buffer.length > MAX_FILE_SIZE_BYTES) return sendResponse(reply, 413, false, `Each file must be under ${FILE_SIZE}MB.`);

      const ext = path.extname(part.filename || '');
      const filename = `profile/${randomUUID()}${ext}`;
      const imageUrl = await uploadFileToS3(filename, buffer, part.mimetype);
      imageUrls.push(imageUrl);
    }
  }

  // Edit user details
  if (imageUrls.length === 0) return sendResponse(reply, 400, false, 'No valid image uploaded.');

  const updatedUser = await updateUser({
    email: userDetails.email,
    profilePicture: imageUrls[0],
  });

  if (!updatedUser) return sendResponse(reply, 403, false, 'User details was not updated. The user profile could not be accessed.');
  return sendResponse(reply, 200, true, 'Your new Profile picture was updated successfully.');
};

// Update User Details Handler
export const updateUserHandler = async (request: FastifyRequest<{ Body: EditUserInput }>, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  // Fetch User Details
  const userDetails = await findUserById(userId);
  if (!userDetails) return sendResponse(reply, 400, false, "Couldn't find your profile, kindly try again later");

  // Update user details and send a notification
  await updateUser({ email: userDetails.email, ...request.body });
  await emitAndSaveNotification({
    user: userId,
    type: 'alert',
    subType: 'profile',
    title: 'Profile Update',
    message: 'Your profile was updated successfully!, kindly verify your new details.',
  });

  // Return
  return sendResponse(reply, 200, true, 'User details was updated successfully');
};

// Get Current User Handler
export const fetchCurrentUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;

  //Fetch user details
  const user = await findUserById(decodedDetails.userId);
  if (!user) return sendResponse(reply, 404, false, "Couldn't fetch user details, kindly try again later.");

  return sendResponse(reply, 200, true, 'Your user details was fetched successfully', user);
};

// Admin Endpoints

// Edit any user details
export const editUserHandler = async (request: FastifyRequest<{ Body: EditUserInput }>, reply: FastifyReply) => {

  const decodedAdmin = request.user;

  // Make sure admin exists and it is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 400, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  // Make sure user exists
  if (!request.body.email) return sendResponse(reply, 400, false, "User Email not found");
  const user = await findUserByEmail(request.body.email);
  if (!user) return sendResponse(reply, 404, false, 'The specified user account does not exist.');

  const wasSuspended = user.isSuspended;
  const isSuspended = request.body.isSuspended;

  const updatedUser = await updateUser(request.body);

  if (!updatedUser) return sendResponse(reply, 400, false, "Couldn't update user profile, kindly try again later");

  if (typeof isSuspended === 'boolean' && wasSuspended !== isSuspended) {
    const template = isSuspended
      ? suspensionEmail({ name: updatedUser.userName }).html
      : unsuspensionEmail({ name: updatedUser.userName }).html;

    await sendEmail({ to: user.email, subject: isSuspended ? 'Account Suspended' : 'Account Unsuspended', html: template, });
  }

  // Check if it was a KYC update
  const isKyc = request.body.kyc;
  if (isKyc) {

    // Get Email Template
    const template = kyc({ name: updatedUser.userName, status: request.body.kyc?.status as 'accepted' | 'rejected' });

    // Send Email
    await sendEmail({ to: user.email, subject: template.subject, html: template.html, });
  }

  return sendResponse(reply, 200, true, 'User details was updated successfully');
};

// Fetch User Using Their AccountID or Emails
export const fetchUserHandler = async (request: FastifyRequest<{ Params: FetchUserInput }>, reply: FastifyReply) => {

  const value = request.params.value;
  const decodedAdmin = request.user;

  // Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 400, false, 'Sorry, but you are not authorized to perform this action');

  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  const fetchedUser = await fetchUser(value);
  if (!fetchedUser) return sendResponse(reply, 404, false, 'Sorry, no user matched the entered credentials');

  return sendResponse(reply, 200, true, 'User was fetched successfully', fetchedUser);
};

// Fetch all users
export const fetchAllUsersHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>,
  reply: FastifyReply
) => {
  const page = parseInt(request.query.page ?? '1');
  const limit = parseInt(request.query.limit ?? '20');
  const decodedAdmin = request.user;

  //Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 400, false, 'Sorry, but you are not authorized to perform this action');

  const users = await fetchUsers(page, limit);
  return sendResponse(reply, 200, true, 'All users accounts was fetched successfully', users);
};
