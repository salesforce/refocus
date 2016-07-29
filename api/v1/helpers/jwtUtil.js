/**
 * api/v1/helpers/jwt.js
 */
'use strict'; // eslint-disable-line strict

const jwt = require('jsonwebtoken');
const u = require('./verbs/utils');
const apiErrors = require('../apiErrors');
const conf = require('../../../config');

/**
 * Verify jwt token.
 * @param  {string}   secret - secret to create token
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 */
function verifyToken(secret, req, cb) {
  const authorization = req.headers.authorization;
  let token;

  if (authorization) {
    token = req.headers.authorization;
  }

  if (token) {
    jwt.verify(token, secret, {}, (err) => {
      if (err) {
        const _err = new apiErrors.ForbiddenError({
          explanation: 'Invalid Token.',
        });
        u.handleError(cb, _err, 'ApiToken');
      } else {
        return cb();
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
 * Create jwt token
 * @param  {object}   user - user object
 * @returns {string} created token
 */
function createToken(user) {
  const env = conf.environment[conf.nodeEnv];
  const createdToken = jwt.sign(user.email, env.tokenSecret);
  return createdToken;
}

module.exports = {
  verifyToken,
  createToken,
};
