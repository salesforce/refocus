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
'use strict'; // eslint-disable-line strict

const LocalStrategy = require('passport-local').Strategy;
const User = require('../db/index').User.scope('withSensitiveInfo');
const Profile = require('../db/index').Profile;
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
   * @param  {String}   userName - Username provided by the user
   * @param  {String}   userPassword - User Password
   * @param  {Function} done - Callback function
   */
  function signupStrategy(req, userName, userPassword, done) {
    // to do: We need to create default profiles in db.
    // find user with this email
    User.findOne({ where: { name: userName } })
    .then((foundUser) => {
      // if sso user, then update password and sso boolean.
      if (foundUser) {
        if (foundUser.sso === true) {
          return foundUser.update({ password: userPassword, sso: false });
        }

        // If not sso user, error - user already exists.
        throw new Error('User already exists');
      }

      // if user not found, return null
      return null;
    })
    .then((updatedUser) => {
      // if null, create profile and then user, else return updated user.
      if (updatedUser) {
        return done(null, updatedUser);
      }

      return Profile.findOne({ where: { name: 'RefocusUser' } });
    })
    .then((foundProfile) => {
      if (foundProfile) {
        return foundProfile;
      }

      return Profile.create({ name: 'RefocusUser' });
    })
    .then((profile) =>

    /**
     * if non-sso register, create new user and token object.
     * Note: Used User.findById after creation so that we can get profile
     * attached to user object.
     */
      User.create({
        profileId: profile.id,
        name: userName,
        email: req.body.email,
        password: userPassword,
      })
    )
    .then((userCreated) => User.findById(userCreated.id))
    .then((foundUser) => done(null, foundUser))
    .catch((err) => done(err));
  }

  /**
   * Login strategy for passport to use which checks user credentials and logs
   * in user
   * @param  {IncomingMessage}   req - The request object
   * @param  {String}   userName - Username provided by the user
   * @param  {String}   userPassword - User Password
   * @param  {Function} done - Callback function
   */
  function loginStrategy(req, userName, userPassword, done) {
    User.findOne({ where: { name: userName }, scope: null })
    .then((foundUser) => { // profile name is attached by default
      if (foundUser && foundUser.sso) {
        throw new Error('Invalid credentials');
      }

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
        return done(null, false);
      }
    })
    .catch((err) => done(err));
  }

  // enable passport to use local signup strategy for registering users.
  passportModule.use('local-signup', new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true,
    }, signupStrategy)
  );

  // enable passport to use local login strategy for authenticating users
  passportModule.use('local-login', new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true,
    }, loginStrategy)
  );
};
