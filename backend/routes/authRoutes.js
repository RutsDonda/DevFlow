import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, googleAuth, getMe } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRequest, register);

router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, login);

router.post('/google', [
  body('email').isEmail().withMessage('Valid email is required')
], validateRequest, googleAuth);

router.get('/me', protect, getMe);

export default router;
