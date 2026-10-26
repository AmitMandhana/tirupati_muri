import { User } from '../models/User.js';
import { verifyToken } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    throw httpError(401, 'Authentication required.');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw httpError(401, 'Your session has expired. Please sign in again.');
  }

  const user = await User.findById(decoded.sub).select('name email createdAt');

  if (!user) {
    throw httpError(401, 'Your session is no longer valid. Please sign in again.');
  }

  req.user = user;
  next();
});
