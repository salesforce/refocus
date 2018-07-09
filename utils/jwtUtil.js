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
const Generator = require('../db/index').Generator;
const Bot = require('../db/index').Bot;
const Promise = require('bluebird');
const jwtVerifyAsync = Promise.promisify(jwt.verify);
const Profile = require('../db/index').Profile;

// these headers will be assigned default values if not present in token.
const headersWithDefaults = {
  ProfileName: '',
  IsAdmin: false,
  IsCollector: false,
  IsBot: false,
  IsGenerator: false,
};

/**
 * Adds a key and its value to the passed in object.
 * @param  {Object} object - The object to which the key value pair needs to be
 * assgined
 * @param  {String} key - The key that will be added to the object
 * @param  {String} value  - The value that will be assigned to the key
 */
function assignKeyValue(object, key, value) {
  object[key] = value;
} // assignKeyValue

/**
 * Assign request headers using token info.
 *
 * @param  {Object} req - Request object
 * @param  {Object} payload - decoded data from token
 */
function assignHeaderValues(req, payload) {
  /*
   * username and tokenname should always be there if createToken function is
   * used for creating token
   */
  if (payload.username) {
    assignKeyValue(req.headers, 'UserName', payload.username);
  }

  if (payload.ProfileName) {
    assignKeyValue(req.headers, 'ProfileName', payload.username);
  }

  if (payload.tokenname) {
    assignKeyValue(req.headers, 'TokenName', payload.tokenname);
  }

  Object.keys(headersWithDefaults).forEach((h) => {
    assignKeyValue(req.headers, h,
      payload.hasOwnProperty(h) ? payload[h] : headersWithDefaults[h]);
  });
} // assignHeaderValues

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
 * Function to verify if a collector token is valid or not, i.e. does the token
 * name match an actual collector name.
 *
 * @param {Object} payload - the decoded payload
 * @param  {object} req - request object
 * @param  {Function} cb - callback function - Optional
 * @returns {Function|undefined} - Callback function or undefined
 * @throws {ForbiddenError} If a collector record matching the username is
 *   not found
 */
function verifyCollectorToken(payload, req, cb) {
  return setUser(payload, req)
  .then((p) => payload = p)
  .then(() => Collector.findOne({ where: { name: payload.tokenname } }))
  .then((coll) => {
    if (!coll) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Authentication Failed',
      });
    }

    assignHeaderValues(req, payload);
    return cb ? cb() : undefined;
  })
  .catch((err) => {
    throw new apiErrors.ForbiddenError({
      explanation: 'Authentication Failed',
    });
  });
} // verifyCollectorToken

/**
 * Function to verify if a generator token is valid or not, i.e. does the token
 * name match an actual generator name.
 *
 * @param {Object} payload - the decoded payload
 * @param  {object} req - request object
 * @param  {Function} cb - callback function - Optional
 * @returns {Function|undefined} - Callback function or undefined
 * @throws {ForbiddenError} If a generator record matching the token name is
 *   not found
 */
function verifyGeneratorToken(payload, req, cb) {
  return setUser(payload, req)
  .then((p) => payload = p)
  .then(() => Generator.findOne({ where: { name: payload.tokenname } }))
  .then((gen) => {
    if (!gen) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Authentication Failed',
      });
    }

    assignHeaderValues(req, payload);
    return cb ? cb() : undefined;
  })
  .catch(() => {
    throw new apiErrors.ForbiddenError({
      explanation: 'Authentication Failed',
    });
  });
} // verifyGeneratorToken

/**
 * Function to verify if a bot token is valid or not.
 *
 * @param {Object} payload - the decoded payload
 */
function verifyBotToken(token) {
  return jwtVerifyAsync(token, secret, {})
  .then((payload) => Bot.findOne({ where: { name: payload.username } }));
} // verifyBotToken

function setUser(payload, req) {
  return User.findOne({ where: { name: payload.username } })
  .then((user) => {
    if (!user) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Authentication Failed',
      });
    }

    req.user = user.get();

    /*
     * For tokens with no ProfileName and IsAdmin set (e.g. old existing
     * tokens) we set IsAdmin and ProfileName after decoding the payload.
     */
    if (!payload.hasOwnProperty('ProfileName')) {
      payload.ProfileName = user.profile.name;
    }

    return payload.hasOwnProperty('IsAdmin') ? payload.IsAdmin :
      Profile.isAdmin(req.user.profileId);
  })
  .then((isAdmin) => payload.IsAdmin = isAdmin)
  .then(() => payload);
} // setUser

/**
 * Function to verify if a user token is valid or not. If verification is
 * successful, also check the token record in the db (exists AND is not revoked)
 * and load the user record from the db and add to the request.
 * (Skip the token record check if the token is the default UI token.)
 *
 * @param {Object} payload - the decoded payload
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 * @throws {ForbiddenError} If a collector record matching the username is
 *   not found
 */
function verifyUserToken(payload, req, cb) {
  return setUser(payload, req)
  .then((p) => {
    assignHeaderValues(req, p);

    // No need to check the token record if this is the default UI token.
    if (p.username === p.tokenname) return cb();

    return Token.scope({ method: ['notRevoked', p.tokenname, req.user.id] })
    .findOne()
    .then((found) => {
      if (!found) throw new apiErrors.ForbiddenError();
    })
    .then(() => cb());
  });
} // verifyUserToken

/**
 * Verify jwt token. Perform any additional verification based on the type of
 * user. For a collector or generator, make sure the name matches a collector
 * or generator name. For a person, make sure the named token exists for this
 * user.
 *
 * @param  {object}   req - request object
 * @param  {Function} cb - callback function
 */
function verifyToken(req, cb) {
  const token = req.session.token || req.headers.authorization;
  if (token) {
    return jwtVerifyAsync(token, secret, {})
    .then((payload) => {
      let extraVerification;
      if (payload.IsCollector) {
        extraVerification = verifyCollectorToken;
      } else if (payload.IsGenerator) {
        extraVerification = verifyGeneratorToken;
      } else {
        extraVerification = verifyUserToken;
      }

      return extraVerification(payload, req, cb);
    })
    .catch((err) => {
      const e = new apiErrors.ForbiddenError({
        explanation: 'Authentication Failed',
      });
      return handleError(cb, e, 'ApiToken');
    });
  }

  const err = new apiErrors.ForbiddenError({
    explanation: 'Authentication Failed',
  });
  return handleError(cb, err, 'ApiToken');
} // verifyToken

/**
 * Create jwt token.
 *
 * @param {string} tokenName - the name of the token
 * @param {string} userName - the name of the user
 * @param {Object} payloadObj - optional additional info to be included in
 *  jwt claim
 * @returns {string} created token
 */
function createToken(tokenName, userName, payloadObj) {
  const jwtClaim = {
    tokenname: tokenName,
    username: userName,
    timestamp: Date.now(),
  };

  /**
   * If payload not given, no additional headers are set.
   * If payload is given, set only the headers which matches the headers in
   * headersWithDefaults.
   */
  if (payloadObj) {
    Object.keys(payloadObj).forEach((key) => {
      if (headersWithDefaults.hasOwnProperty(key)) {
        jwtClaim[key] = payloadObj[key];
      }
    });
  }

  const createdToken = jwt.sign(jwtClaim, secret);
  return createdToken;
}

module.exports = {
  verifyToken,
  createToken,
  verifyCollectorToken, // for testing purposes only
  verifyGeneratorToken, // for testing purposes only
  verifyBotToken,
  assignHeaderValues, // for testing purposes only
  headersWithDefaults, // for testing purposes only
};
