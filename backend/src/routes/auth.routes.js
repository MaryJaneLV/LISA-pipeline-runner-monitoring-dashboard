const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin, validateChangePassword } = require('../middlewares/validators');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateRegister, authController.register);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  authController.getCurrentUser
);

/**
 * @route PUT /api/auth/change-password
 * @desc Change password
 * @access Private
 */
router.put(
  '/change-password',
  passport.authenticate('jwt', { session: false }),
  validateChangePassword,
  authController.changePassword
);

module.exports = router;