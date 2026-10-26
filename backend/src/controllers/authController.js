import bcrypt from 'bcrypt';

import { User } from '../models/User.js';
import { signToken } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { isValidEmail, toText } from '../utils/validators.js';

const PASSWORD_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const userResponse = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

export const setupInitialUser = asyncHandler(async (req, res) => {
  const name = toText(req.body.name);
  const email = toText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || !email || !password) {
    throw httpError(400, 'Name, email and password are required.');
  }

  if (name.length > 100) {
    throw httpError(400, 'Name cannot be longer than 100 characters.');
  }

  if (!isValidEmail(email)) {
    throw httpError(400, 'Please enter a valid email address.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw httpError(400, `Password cannot be longer than ${MAX_PASSWORD_LENGTH} characters.`);
  }

  const existingUser = await User.exists({});
  if (existingUser) {
    throw httpError(409, 'Initial setup is already complete. Please sign in.');
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, 'Initial setup is already complete. Please sign in.');
    }
    throw error;
  }

  return res.status(201).json({
    message: 'Account created successfully.',
    user: userResponse(user),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const email = toText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    throw httpError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  const isMatch = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !isMatch) {
    throw httpError(401, 'Invalid email or password.');
  }

  const token = signToken({ sub: user._id.toString() });

  return res.status(200).json({
    token,
    user: userResponse(user),
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: userResponse(req.user) });
});
