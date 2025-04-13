const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/user.model');
const config = require('../config');
const createError = require('http-errors');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return next(createError(409, 'User already exists'));
    }
    
    const user = new User({
      name,
      email,
      password
    });
    
    await user.save();
    
    const minioService = require('../services/minio.service');
    await minioService.initUserStorage(user.id);
    
    const token = jwt.sign({ id: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    next(error);
  }
};

exports.login = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return next(createError(401, info ? info.message : 'Invalid credentials'));
    }
    
    // Generate token
    const token = jwt.sign({ id: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
    
    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  })(req, res, next);
};

exports.getCurrentUser = (req, res) => {
  res.json({
    user: req.user.toJSON()
  });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Check current password
    const isMatch = await user.isValidPassword(currentPassword);
    
    if (!isMatch) {
      return next(createError(401, 'Current password is incorrect'));
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};