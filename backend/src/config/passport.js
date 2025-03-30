const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const config = require('./index');
const User = require('../models/user.model');

const setupPassport = () => {
  // JWT Strategy for token authentication
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwt.secret
  }, async (payload, done) => {
    try {
      // Find the user by the ID in the JWT payload
      const user = await User.findById(payload.id);
      
      if (!user) {
        return done(null, false);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
  
  // Local Strategy for username/password login
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      // Find the user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }
      
      // Check if the password is correct
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
};

module.exports = { setupPassport };