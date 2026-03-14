import { FastifyRequest, FastifyReply } from 'fastify';
import fetch from 'node-fetch';
import { app } from '../../app';
import { randomUUID } from 'crypto';

//Services
import { findUserByEmail, findUserById } from '../user/user.service';
import { findAdminByEmail } from '../admin/admin.service';
import { createSession, hasActiveSession } from './auth.service';

//Schemas, templates
import { ChangePasswordInput, LoginAdminInput, LoginUserInput, PasswordResetEmailInput, ResetPasswordInput, VerifyPasswordResetInput } from './auth.schema';
import forgotPassword from '../../emails/UserMails/forgotPassword';
import generalTemplate from '../../emails/AdminMails/general';

//Utils, Configs
import { sendResponse } from '../../utils/response.utils';
import { formatWithTimezone } from '../../utils/format';
import { customAlphabet } from 'nanoid';
import { sendEmail, sendAdminEmail } from '../../libs/mailer';
import { encrypt } from '../../utils/encrypt';

//Email Templates
import login from '../../emails/UserMails/login';

//Fetch user location
const FALLBACK: LocationInfo = {
  city: 'Unknown',
  region: 'Unknown',
  country: 'Unknown',
  timezone: 'UTC',
};

const normalizeIp = (ip: string): string =>
  ip.replace('::ffff:', '').trim();

const isPrivateIp = (ip: string): boolean =>
  ip === '127.0.0.1' ||
  ip === '::1' ||
  ip.startsWith('10.') ||
  ip.startsWith('192.168.') ||
  ip.startsWith('172.16.');

export const getLocationFromIP = async (ip: string): Promise<LocationInfo> => {
  if (!ip) return FALLBACK;

  const normalizedIp = normalizeIp(ip);
  if (isPrivateIp(normalizedIp)) return FALLBACK;

  try {
    const res = await fetch(`https://ipwho.is/${normalizedIp}`, {
      headers: { 'User-Agent': 'kyc-service/1.0' },
    });

    if (!res.ok) return FALLBACK;

    const data = (await res.json()) as IpWhoIsResponse;
    if (!data.success) return FALLBACK;

    return {
      city: data.city ?? 'Unknown',
      region: data.region ?? 'Unknown',
      country: data.country ?? 'Unknown',
      timezone: data.timezone?.id ?? 'UTC',
    };
  } catch {
    return FALLBACK;
  }
};

//Authenticate a user
export const loginHandler = async (request: FastifyRequest<{ Body: LoginUserInput }>, reply: FastifyReply) => {

  const ip = request.ip;
  const { email, password, device } = request.body;

  //Fetch user by email
  const user = await findUserByEmail(email);
  if (!user) return sendResponse(reply, 400, false, 'Incorrect Email or Password');

  //Compare password
  const isCorrect = await user.comparePassword(password);
  if (isCorrect) {

    //Get location details from IP Address
    const loginDetails = await getLocationFromIP(ip);

    const userId = user._id as string;
    const activeSession = await hasActiveSession(userId);

    //Get JTI
    const jti = randomUUID();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 1000 * 60 * 60 * 24 * 7; // 7 days

    const accessToken = app.jwt.sign({ userId, jti, role: "user" }, { expiresIn: '7d' });

    await createSession(jti, userId, {
      userId,
      issuedAt,
      expiresAt,
      ip: ip,
      device,
      loginDetails,
      lastSeen: new Date()
    });

    // User Email Notification
    const loginTemplate = login({
      name: user.userName,
      ip,
      userAgent: device.ua || 'Unknown',
      location: loginDetails,
      date: formatWithTimezone(loginDetails.timezone),
    }).html;

    await sendEmail({
      to: user.email,
      subject: 'New Login to Your Trade Lave Account',
      html: loginTemplate,
    });

    // Admin Email Notification
    const template = generalTemplate({
      action: "User Login",
      message: `The user with the email ${user.email} and username ${user.userName} just logged into their account`,
      name: user.userName,
      email: user.email,
      accountId: user.accountId,
      ip,
      location: loginDetails,
    })
    await sendAdminEmail(template.html);

    const redirect = !user.isVerified
      ? 'verification'
      : !user.kyc.lastSubmissionDate || user.kyc.status === 'rejected'
        ? 'kyc'
        : 'user/dashboard';

    const message: string = activeSession !== null ? "Welcome — authentication successful. You have been logged out of your previous device." : "Authentication Successful. Welcome!!!"
    return sendResponse(reply, 200, true, message, { accessToken, redirect, id: userId })
  }

  return sendResponse(reply, 400, false, 'Incorrect Email or Password');
};

//Send password reset otp
export const sendPasswordReset = async (request: FastifyRequest<{ Body: PasswordResetEmailInput }>, reply: FastifyReply) => {

  const { email } = request.body;

  //Fetch user by email, throw an error if it doesn't exist, or if the user hasn't verified their account
  const user = await findUserByEmail(email.toLowerCase());
  if (!user) return sendResponse(reply, 400, false, 'Incorrect Email or Password');
  if (!user.isVerified) return sendResponse(reply, 403, false, 'Please verify your account before proceeding.');

  // Generate 4 Random Digits and Save
  const randomSixNumbers = customAlphabet('0123456789', 6)();

  //Save the number to the database
  user.passwordResetCode = randomSixNumbers;
  await user.save();

  //Send email to the email address with the 4 Digit
  const emailContent = forgotPassword({
    name: user.userName,
    verificationCode: randomSixNumbers,
  });
  await sendEmail({
    to: user.email,
    subject: 'Reset Password Verification',
    html: emailContent.html,
  });

  return sendResponse(reply, 200, true, 'A verification code will be sent if the email is associated with an account.');
};

// Verify password reset otp
const otpStorage = new Map();
export const verifyPasswordResetHandler = async (request: FastifyRequest<{ Body: VerifyPasswordResetInput }>, reply: FastifyReply) => {

  const { email, otp } = request.body;

  //Fetch user and throw an error if user doesn't exist or entered a wrong OTP
  const user = await findUserByEmail(email);
  if (!user) return sendResponse(reply, 400, false, 'User does not exist');
  if (user.passwordResetCode !== otp)
    return sendResponse(reply, 400, false, 'Incorrect OTP');

  //Make the user password field null again
  user.passwordResetCode = '';
  await user.save();
  otpStorage.set(email, email);

  return sendResponse(reply, 200, true, 'Email was verified successfully.');
};

//Create new password
export const passwordResetHandler = async (request: FastifyRequest<{ Body: ResetPasswordInput }>, reply: FastifyReply) => {

  const { email, password } = request.body;
  const user = await findUserByEmail(email);

  if (!user) return sendResponse(reply, 400, false, 'User does not exist');

  // Check if the User has been verified
  if (!otpStorage.has(email)) return sendResponse(reply, 400, false, 'Something went wrong kindly restart the password reset process.');

  //Save users new password
  const hashedPassword = encrypt(password);
  user.password = password;
  user.encryptedPassword = hashedPassword;
  await user.save();

  return sendResponse(reply, 200, true, 'Your password was updated successfully.');
};

//Change password while being authenticated
export const changePasswordHandler = async (request: FastifyRequest<{ Body: ChangePasswordInput }>, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  //Fetch user
  const currentUser = await findUserById(userId);
  if (!currentUser) return sendResponse(reply, 404, false, "User not found");

  const { currentPassword, newPassword } = request.body;

  //Make sure the new password isn't the old one
  if (currentPassword === newPassword) return sendResponse(reply, 409, false, 'Your new password must differ from your old one.');

  //Fetch user
  const user = await findUserByEmail(currentUser.email);
  if (!user) return sendResponse(reply, 400, false, 'Something went wrong, please try again later.');

  //Compare users password and return response if it doesn't match
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return sendResponse(reply, 403, false, 'Wrong Password.');

  //Update password
  const hashedPassword = encrypt(newPassword);
  user.password = newPassword;
  user.encryptedPassword = hashedPassword;
  await user.save();

  return sendResponse(reply, 200, true, 'Your password was updated successfully.');
};

// Administrative Endpoint


// Authenticate Admin
export const adminLoginHandler = async (request: FastifyRequest<{ Body: LoginAdminInput }>, reply: FastifyReply) => {

  const { email, password } = request.body;

  //Fetch user by email
  const admin = await findAdminByEmail(email);
  if (!admin) return sendResponse(reply, 400, false, 'Incorrect Email or Password');

  //Compare password
  const isCorrect = await admin.comparePassword(password);
  if (isCorrect) {

    const adminId = admin._id as string;
    const activeSession = await hasActiveSession(adminId);

    //Get JTI
    const jti = randomUUID();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 1000 * 60 * 60 * 24 * 7; // 7 days

    const accessToken = app.jwt.sign({ userId: adminId, jti, role: admin.role as Role }, { expiresIn: '7d' });

    await createSession(jti, adminId, {
      adminId,
      issuedAt,
      expiresAt,
      lastSeen: new Date()
    });

    const message: string = activeSession !== null ? "Welcome — authentication successful. You have been logged out of your previous device." : "Authentication Successful. Welcome!!!"
    return sendResponse(reply, 200, true, message, { accessToken })
  }

  return sendResponse(reply, 400, false, 'Incorrect Email or Password');
};
