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

/**
 * Retrieves the model name from the request object
 *
 * @param {Request} req - The request object
 * @returns {String} - The name of the model
 */
function getModel(req) {
  let modelName = req.swagger.operation.operationId;
  while(modelName[0] != modelName[0].toUpperCase()){
    modelName = modelName.slice(1, modelName.length);
  }
  return(modelName);
} // getModel

/**
 * Determines whether the user has write access to a model
 *
 * @param {Request} req - The request object
 * @param {Function} cb - The function to be called next in middleware
 * @returns {Promise} - A promise which resolves to true if the user has
 *  write access to the model
 */
function hasWriteAccess(req) {
  const modelName = getModel(req);
  return new Promise((resolve, reject) => {
    if(modelName === 'Collector' || 'User' || null){
      resolve(true);
    } else {
      getUser(req)
      .then((user) => {
        if (user) {
          resolve(Profile.hasWriteAccess(user.profileId, modelName));
        } else {
          resolve(false);
        }
      })
      .catch(reject);
    }
  });
}

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
