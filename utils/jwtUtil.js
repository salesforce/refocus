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
const secret = conf.environment[conf.nodeEnv].tokenSecret;
const User = require('../db/index').User;
const Token = require('../db/index').Token;
const Collector = require('../db/index').Collector;
const Promise = require('bluebird');
const jwtVerifyAsync = Promise.promisify(jwt.verify);

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
 * Verify jwt token. If verify successful, also check the token record in the
 * db (exists AND is not revoked) and load the user record from the db and add
 * to the request. (Skip the token record check if the token is the default UI
 * token.)
 *
 * @param {object} t - The Token object from the db
 * @returns {boolean} true if ok, otherwise throws error
 */
function checkTokenRecord(t) {
  if (t && t.isRevoked === '0') {
    return true;
  }

  if (!t) {
    const err = new apiErrors.ForbiddenError({
      explanation: 'Missing token for the specified user. ' +
        'Please contact your Refocus administrator.',
    });
    throw err;
  }

  if (t.isRevoked !== '0') {
    const err = new apiErrors.ForbiddenError({
      explanation: 'Token was revoked. Please contact your ' +
        'Refocus administrator.',
    });
    throw err;
  }

  const err = new apiErrors.ForbiddenError({
    explanation: 'Invalid Token.',
  });
  throw err;
} // checkTokenRecord

/**
 * Function to verify if a collector token is valid or not.
 * @param  {object} req - request object
 * @param  {Function} cb - callback function - Optional
 * @returns {Function|undefined} - Callback function or undefined
 * @throws {ForbiddenError} If a collector record matching the username is
 *   not found
 */
function verifyCollectorToken(req, cb) {
  const token = req.session.token || req.headers.authorization;
  return jwtVerifyAsync(token, secret, {})
  .then((decodedData) => Collector.findOne({
    where: { name: decodedData.username },
  }))
  .then((collector) => {
    if (!collector) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Invalid Token.',
      });
    }

    if (cb) {
      return cb();
    }

    return undefined;
  })
  .catch(() => {
    throw new apiErrors.ForbiddenError({
      explanation: 'Invalid/No Token provided.',
    });
  });
} // verifyCollectorToken

/**
 * Function to verify if an user token is valid or not. If verification is
 * successful, also check the token record in the db (exists AND is not revoked)
 * and load the user record from the db and add to the request.
 * (Skip the token record check if the token is the default UI token.)
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 * @throws {ForbiddenError} If a collector record matching the username is
 *   not found
 */
function verifyUserToken(req, cb) {
  const token = req.session.token || req.headers.authorization;
  let decodedData;
  return jwtVerifyAsync(token, secret, {})
  .then((payLoad) => {
    decodedData = payLoad;
    return User.findOne({ where: { name: decodedData.username } });
  })
  .then((user) => {
    if (!user) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Invalid Token.',
      });
    }

    req.user = user;

    /*
     * No need to check the token record if this is the default UI
     * token.
     */
    if (decodedData.username === decodedData.tokenname) {
      return cb();
    }

    return Token.findOne({
      where: {
        name: decodedData.tokenname,
        createdBy: user.id,
      },
    })
    .then(checkTokenRecord)
    .then(() => cb());
  });
} // verifyUserToken

/**
 * Verify jwt token. The token is verified against an user record first; if
 * the verification fails, verify the token against a collector record.
 *
 * TODO: look at the req object and call either verifyUser or verifyCollector
 * based on the api path.
 *
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 */
function verifyToken(req, cb) {
  const token = req.session.token || req.headers.authorization;

  if (token) {
    verifyUserToken(req, cb)
    .then((ret) => ret)
    .catch((err) => {
      if (err.explanation &&
          err.explanation.endsWith('Refocus administrator.')) {
        return handleError(cb, err, 'ApiToken');
      }

      return verifyCollectorToken(req, cb)
      .then((_ret) => _ret)
      .catch(() => handleInvalidToken(cb));
    });
  } else {
    const err = new apiErrors.ForbiddenError({
      explanation: 'No authorization token was found.',
    });
    handleError(cb, err, 'ApiToken');
  }
} // verifyToken

/**
 * Get token details: username, token name from the token string.
 *
 * @param  {String} s - The token string
 * @returns {Promise} - Resolves to an object containing "username" and
 *  "tokenname" attributes.
 */
function getTokenDetailsFromTokenString(s) {
  const err = new apiErrors.ForbiddenError({
    explanation: 'No authorization token was found',
  });

  if (!s) {
    return Promise.reject(err);
  }

  return jwtVerifyAsync(s, secret, {})
    .then((decodedData) => {
      const username = decodedData.username;
      const tokenname = decodedData.tokenname;
      return { username, tokenname };
    })
    .catch(() => Promise.reject(err));
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

  // if token is null and request from UI
  if (!t && req.session && req.session.token) {
    const username = req.session.passport.user.name;
    const tokenname = '__UI';
    return Promise.resolve({ username, tokenname });
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
  const createdToken = jwt.sign(jwtClaim, secret);
  return createdToken;
}

module.exports = {
  verifyToken,
  createToken,
  getTokenDetailsFromRequest,
  getTokenDetailsFromTokenString,
  verifyCollectorToken,
};
