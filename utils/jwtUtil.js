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

        const username = decodedData.username;
        resolve(username);
      });
    } else {
      reject(new apiErrors.ForbiddenError({
        explanation: 'No authorization token was found',
      }));
    }
  });
} // getUsernameFromToken

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
  getUsernameFromToken,
};
