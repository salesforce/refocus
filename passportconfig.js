/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./passport.js
 * Passport strategies
 */
const LocalStrategy = require('passport-local').Strategy;
const User = require('./db/index').User;
const Profile = require('./db/index').Profile;
const bcrypt = require('bcrypt-nodejs');

module.exports = (passportModule) => {
  // used to serialize the user for the session
  passportModule.serializeUser((user, done) => {
    done(null, user);
  });

  // used to deserialize the user
  passportModule.deserializeUser((user, done) => {
    done(null, user);
  });

  /**
   * signupStrategy for passport which creates a new new user if already not
   * present
   * @param  {IncomingMessage}   req - The request object
   * @param  {String}   userEmail - User Email
   * @param  {String}   userPassword - User Password
   * @param  {Function} done - Callback function
   */
  function signupStrategy(req, userEmail, userPassword, done) {
    // to do: We need to create default profiles in db.
    Profile.findOrCreate({ where: { name: 'RefocusUser' } })
    .spread((profile, created) => { // eslint-disable-line no-unused-vars
      User.create({
        profileId: profile.id,
        name: userEmail,
        email: userEmail,
        password: userPassword,
      })
      .then((newUser) => done(null, newUser))
      .catch((_err) => done(_err));
    })
    .catch((err) => done(err));
  }

  /**
   * Login strategy for passport to use which checks user credentials and logs
   * in user
   * @param  {IncomingMessage}   req - The request object
   * @param  {String}   userEmail - User Email
   * @param  {String}   userPassword - User Password
   * @param  {Function} done - Callback function
   */
  function loginStrategy(req, userEmail, userPassword, done) {
    User.findOne({ where: { email: userEmail }, scope: null })
    .then((foundUser) => {
      if (foundUser) {
        bcrypt.compare(userPassword, foundUser.password, (err, res) => {
          if (err) {
            return done(err, false);
          }

          if (res) {
            return done(null, foundUser);
          }

          return done(null, false);
        });
      } else {
        done(null, false);
      }
    })
    .catch((err) => done(err));
  }

  // enable passport to use local signup strategy for registering users.
  passportModule.use('local-signup', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    }, signupStrategy)
  );

  // enable passport to use local login strategy for authenticating users
  passportModule.use('local-login', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    }, loginStrategy)
  );
};
