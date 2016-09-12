/**
 * api/v1/helpers/jwt.js
 */
'use strict'; // eslint-disable-line strict

const jwt = require('jsonwebtoken');
const u = require('./verbs/utils');
const apiErrors = require('../apiErrors');
const conf = require('../../../config');
const env = conf.environment[conf.nodeEnv];
const User = require('../../../db/index').User;

/**
 * create and handle Invalid Token error
 * @param  {Function} cb - callback function
 */
function handleInvalidToken(cb) {
  const err = new apiErrors.ForbiddenError({
    explanation: 'Invalid Token.',
  });
  u.handleError(cb, err, 'ApiToken');
}

/**
 * Verify jwt token.
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 */
function verifyToken(req, cb) {
  const authorization = req.headers.authorization;
  let token;

  if (authorization) {
    token = req.headers.authorization;
  }

  if (token) {
    jwt.verify(token, env.tokenSecret, {}, (err, decodedData) => {
      if (err) {
        handleInvalidToken(cb);
      } else {
        User.findOne({ where: { email: decodedData } })
        .then((user) => {
          if (user) {
            req.user = user;
            return cb();
          }

          return handleInvalidToken(cb);
        });
      }
    });
  } else {
    const err = new apiErrors.ForbiddenError({
      explanation: 'No authorization token was found',
    });
    u.handleError(cb, err, 'ApiToken');
  }
}

/**
 * Verify jwt token.
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 * @returns {User}
 */
function getUsernameFromToken(req) {
  return new Promise((resolve, reject) => {
    if (req && req.headers && req.headers.authorization) {
      jwt.verify(req.headers.authorization, env.tokenSecret, {},
      (err, decodedData) => {
        if (err !== null) {
          reject(err);
        }

        resolve(decodedData);
      });
    } else {
      reject(new apiErrors.ForbiddenError({
        explanation: 'No authorization token was found',
      }));
    }
  });
} // getUsernameFromToken

/**
 * Create jwt token
 * @param  {object}   user - user object
 * @returns {string} created token
 */
function createToken(user) {
  const createdToken = jwt.sign(user.email, env.tokenSecret);
  return createdToken;
}

module.exports = {
  verifyToken,
  createToken,
  getUsernameFromToken,
};
