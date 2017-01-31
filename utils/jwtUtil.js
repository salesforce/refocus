/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/jwtUtil.js
 */
'use strict'; // eslint-disable-line strict

const jwt = require('jsonwebtoken');
const apiErrors = require('../api/v1/apiErrors');
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const User = require('../db/index').User;

/**
 * Attaches the resource type to the error and passes it on to the next
 * handler.
 *
 * @param {Function} next - The next middleware function in the stack
 * @param {Error} err - The error to handle
 * @param {String} modelName - The DB model name, used to disambiguate field
 *  names
 */
function handleError(next, err, modelName) {
  err.resource = modelName;
  next(err);
}

/**
 * create and handle Invalid Token error
 * @param  {Function} cb - callback function
 */
function handleInvalidToken(cb) {
  const err = new apiErrors.ForbiddenError({
    explanation: 'Invalid Token.',
  });
  handleError(cb, err, 'ApiToken');
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
        User.findOne({ where: { name: decodedData.username } })
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
    handleError(cb, err, 'ApiToken');
  }
}

/**
 * Get token details: username, token name from the token string.
 *
 * @param  {String} s - The token string
 * @returns {Promise} - Resolves to an object containing "username" and
 *  "tokenname" attributes.
 */
function getTokenDetailsFromTokenString(s) {
  return new Promise((resolve, reject) => {
    if (s) {
      jwt.verify(s, env.tokenSecret, {}, (err, decodedData) => {
        if (err !== null || !decodedData) {
          return reject(new apiErrors.ForbiddenError({
            explanation: 'No authorization token was found',
          }));
        }

        const username = decodedData.username;
        const tokenname = decodedData.tokenname;
        return resolve({ username, tokenname });
      });
    } else {
      reject(new apiErrors.ForbiddenError({
        explanation: 'No authorization token was found',
      }));
    }
  });
} // getTokenDetailsFromTokenString

/**
 * Get token details (user name and token name) from the request.
 *
 * @param {Object} req - The request object.
 * @returns {Promise} - Resolves to an object containing "username" and
 *  "tokenname" attributes.
 */
function getTokenDetailsFromRequest(req) {
  let t = null;
  if (req && req.headers && req.headers.authorization) {
    t = req.headers.authorization;
  }

  return getTokenDetailsFromTokenString(t);
} // getTokenDetailsFromRequest

/**
 * Create jwt token.
 *
 * @param {string} tokenName - the name of the token
 * @param {string} userName - the name of the user
 * @returns {string} created token
 */
function createToken(tokenName, userName) {
  const jwtClaim = {
    tokenname: tokenName,
    username: userName,
    timestamp: Date.now,
  };
  const createdToken = jwt.sign(jwtClaim, env.tokenSecret);
  return createdToken;
}

module.exports = {
  verifyToken,
  createToken,
  getTokenDetailsFromRequest,
  getTokenDetailsFromTokenString,
};
