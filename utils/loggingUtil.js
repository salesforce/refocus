/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * loggingUtil.js
 *
 * Utility for Audit logs
 */
'use strict'; // eslint-disable-line strict
const winston = require('winston');

/**
 * Create log for api. If token not enabled and an api request is made,
 * username will be undefined in log.
 * @param  {string} req - Request object
 * @param  {String} modelName - Model name
 * @param  {string} obj - name of object being modified
 * @param  {string} associationInfo - changes corresponding to object
 * associations like tags
 */
function logAuditAPI(req, modelName, obj, associationInfo) {
  let username;
  let objName;
  let objId;

  if (obj) {
    objId = obj.id;
    if (obj.name) {
      objName = obj.name;
    }
  }

  if (req.user) {
    username = req.user.email;
  }

  let associationInfoStr = '';
  if (associationInfo) {
    associationInfoStr += `association=${associationInfo.association}`;
    if (associationInfo.key) {
      associationInfoStr += `, associationKey=${associationInfo.key}`;
    }
  }

  winston.log(
    'info',
    `Timestamp=${new Date()}; ` +
    'LogModule=API; ' +
    `ObjectType=${modelName}; ` +
    `Action=${req.method}; ` +
    `Instance ID=${objId}; ` +
    `Instance Name=${objName}; ` +
    `User=${username};` +
    `${associationInfoStr}`);
}

/**
 * Create log for DB
 * @param  {string} instanceIdentifier - Instance id or name
 * @param  {string} action - Action on instance
 * @param  {String} changedVals - Changed attr previous and new values
 */
function logDB(instanceIdentifier, action, changedVals) {
  winston.log(
    'info',
    `Timestamp=${new Date()}; ` +
    'LogModule=DB; ' +
    `Instance={${instanceIdentifier}}; ` +
    `Action={${action}}; ` +
    `Changes={${changedVals}}`);
}

module.exports = {
  logAuditAPI,
  logDB,
};
