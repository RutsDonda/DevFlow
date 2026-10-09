import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.badRequest('An account with this email already exists. Please log in.');
    }
    const user = await User.create({ name, email: email.toLowerCase(), password });
    const token = user.generateAuthToken();
    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.password && user.googleId) {
      throw ApiError.badRequest('This account was created with Google Sign-In. Please click "Continue with Google".');
    }
    if (!(await user.matchPassword(password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    const token = user.generateAuthToken();
    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { email, name, googleId, avatar } = req.body;

    if (!email || (!googleId && !req.body.idToken)) {
      throw ApiError.badRequest('Missing required Google authentication parameters');
    }

    // Check if user exists by email
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // Email already exists
      if (existingUser.googleId) {
        // User already linked with Google, log them in
        const token = existingUser.generateAuthToken();
        return res.status(200).json({
          success: true,
          data: {
            token,
            user: {
              id: existingUser._id,
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              avatar: existingUser.avatar
            }
          }
        });
      } else {
        // Link Google credentials to existing account
        existingUser.googleId = googleId;
        existingUser.firebaseId = googleId;
        await existingUser.save();
        const token = existingUser.generateAuthToken();
        return res.status(200).json({
          success: true,
          data: {
            token,
            user: {
              id: existingUser._id,
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              avatar: existingUser.avatar
            }
          }
        });
      }
    }

    // No existing user, create new Google account
    const user = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      googleId,
      firebaseId: googleId,
      avatar: avatar || ''
    });

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    next(error);
  }
};
