/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/authUtils.js
 */
'use strict';
const Profile = require('./nouns/profiles').model;
const User = require('./nouns/users').model;
const jwtUtil = require('../../../utils/jwtUtil');
const apiErrors = require('../apiErrors');
const u = require('./verbs/utils');

/**
 * Retrieves the user record from the token (from the request header) or
 * directly from the request object.
 *
 * @param {Request} req - The request object
 * @returns {Promise} - A promise which resolves to the user record
 */
function getUser(req) {
  return new Promise((resolve, reject) => {
    if (req.user) {
      resolve(req.user);
    } else if (req.headers.authorization) { // use the token
      jwtUtil.getTokenDetailsFromRequest(req)
      .then((resObj) => User.findOne({ where: { name: resObj.username } }))
      .then((user) => resolve(user))
      .catch(reject);
    } else {
      reject(new apiErrors.ForbiddenError({
        explanation: 'Forbidden.',
      }));
    }
  });
} // getUser

function getModel(req) {
  let operationId = req.swagger.operation.operationId;
  while(operationId[0] != operationId[0].toUpperCase()){
    operationId = operationId.slice(1, operationId.length);
  }
  return(operationId);
} // getModel

/**
 * Determines whether the user has write access to a model
 *
 * @param {Request} req - The request object
 * @param {String} modelName - The name of the model to write to
 * @returns {Promise} - A promise which resolves to true if the user has
 *  write access to the resource
 */
function hasWriteAccess(req, cb) {
    const modelName = getModel(req);

    if(modelName === 'User'){
      return cb();
    }

    getUser(req)
    .then((user) => {
      if (user) {
        Profile.hasWriteAccess(user.profileId, modelName)
        .then((ok) => {
          if (ok) {
            return cb();
          } else {
            u.Forbidden(cb);
          }
        })
        .catch((err) => {
          u.forbidden(cb);
        });
      } else {
        return cb();
      }
    })
    .catch((err) => {
      u.forbidden(cb);
    });
} // hasWriteAccess

/**
 * Determines whether the user is an admin user, i.e. has a profile which is
 * designated as an admin profile.
 *
 * @param {Request} req - The request object
 * @returns {Promise} - A promise which resolves to true if the user has an
 *  admin profile
 */
function isAdmin(req) {
  return new Promise((resolve, reject) => {
    getUser(req)
    .then((user) => {
      if (user) {
        resolve(Profile.isAdmin(user.profileId));
      } else {
        resolve(false);
      }
    })
    .catch(reject);
  });
} // isAdmin

module.exports = {
  getUser,
  getModel,
  hasWriteAccess,
  isAdmin,
};
