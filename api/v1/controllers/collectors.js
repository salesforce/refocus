/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/collectors.js
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const utils = require('./utils');
const jwtUtil = require('../../../utils/jwtUtil');
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/collectors');
const userProps = require('../helpers/nouns/users');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const decryptSGContextValues = require('../../../utils/cryptUtils')
                                .decryptSGContextValues;
const encrypt = require('../../../utils/cryptUtils').encrypt;
const GlobalConfig = require('../../../db/index').GlobalConfig;
const encryptionAlgoForCollector = require('../../../config')
                                    .encryptionAlgoForCollector;
const ZERO = 0;

/**
 * Decrypt sample generator context values marked as 'encrypted' in sample
 * generator template. Then, encrypt the values again with secret key, which is
 * a combination of collector auth token and timestamp.
 * @param  {Object}   sg - Sample generator having generator template as an
 * attribute.
 * @param  {String}   authToken - Collector authentication token
 * @param  {String}   timestamp - Timestamp sent by collector in heartbeat
 * @return {Object} Sample generator with reencrypted context values.
 */
function reEncryptSGContextValues(sg, authToken, timestamp) {
  if (!authToken || !timestamp) {
    const err = new apiErrors.ValidationError({
      explanation: 'Collector authentication token or timestamp not ' +
      'available to encrypt the context values',
    });
    return Promise.reject(err);
  }

  if (!sg.generatorTemplate) {
    const err = new apiErrors.ValidationError({
      explanation: 'Sample generator template not found in sample generator.',
    });
    return Promise.reject(err);
  }

  const sgt = sg.generatorTemplate;
  return decryptSGContextValues(GlobalConfig, sg, sgt)
  .then((sampleGenerator) => { // sample generator with decrypted context values
    const secretKey = authToken + timestamp;

    Object.keys(sgt.contextDefinition).forEach((key) => {
      if (sgt.contextDefinition[key].encrypted) {
        // encrypt context values in sample generator
        sampleGenerator.context[key] = encrypt(sampleGenerator.context[key],
          secretKey, encryptionAlgoForCollector);
      }
    });

    return sampleGenerator; // reencrypted sample generator
  });
}

/**
 * Register a collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function postCollector(req, res, next) {
  const collectorToPost = req.swagger.params.queryBody.value;
  const resultObj = { reqStartTime: new Date() };
  const toPost = req.swagger.params.queryBody.value;
  helper.model.create(toPost)
  .then((o) => {
    if (helper.loggingEnabled) {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      utils.logAPI(req, resultObj, o);
    }

    /*
     * When a collector registers itself with Refocus, Refocus sends back a
     * special token for that collector to use for all further communication
     */
    o.dataValues.token = jwtUtil
      .createToken(collectorToPost.name, collectorToPost.name);
    return res.status(httpStatus.CREATED)
      .json(u.responsify(o, helper, req.method));
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // postCollector

/**
 * Find a collector or collectors. You may query using field filters with
 * asterisk (*) wildcards. You may also optionally specify sort, limit, offset,
 * and a list of fields to include in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function findCollectors(req, res, next) {
  doFind(req, res, next, helper);
} // findCollectors

/**
 * Retrieve the specified collector metadata by the collector's id or name. You
 * may also optionally specify a list of fields to include in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollector(req, res, next) {
  doGet(req, res, next, helper);
} // getCollector

/**
 * Update the specified collector's config data. If a field is not included in
 * the querybody, that field will not be updated.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function patchCollector(req, res, next) {
  doPatch(req, res, next, helper);
} // patchCollector

/**
 * Deregister a collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deregisterCollector(req, res, next) {
  // TODO reject if caller's token is not a collector token
  req.swagger.params.queryBody = {
    value: { registered: false },
  };

  doPatch(req, res, next, helper);
} // deregisterCollector

/**
 * Send heartbeat from collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function heartbeat(req, res, next) {
  // TODO reject if caller's token is not a collector token
  const retval = {
    collectorConfig: {},
    generatorsAdded: [],
    generatorsDeleted: [],
    generatorsUpdated: [],
  };

  /*
   * TODO update the lastHeartbeat column for this collector
   */

  /*
   * TODO Populate collectorConfig
   * - look up any changes made to this collector since the last heartbeat
   */

  /*
   * TODO populate generatorsAdded
   * - look up any new generators assigned to this collector since the last
   *   heartbeat
   * - reEncrypt context values using reEncryptSGContextValues function
   */

  /*
   * TODO populate generatorsDeleted
   * - look up any generators UNassigned from this collector since the last
   *   heartbeat
   */

  /*
   * TODO populate generatorsUpdated
   * - for generators which were already assigned to this collector, look up
   *   any changes made to the generator since the last heartbeat
   * - reEncrypt context values using reEncryptSGContextValues function
   */

  res.status(httpStatus.OK).json(retval);
} // heartbeat

/**
 * Change collector status to Running. Invalid if the collector's status is
 * not Stopped.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function startCollector(req, res, next) {
  // TODO reject if caller's token is not a collector token
  req.swagger.params.queryBody = {
    value: { status: 'Running' },
  };
  doPatch(req, res, next, helper);
} // startCollector

/**
 * Change collector status to Stopped. Invalid if the collector's status is
 * Stopped.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function stopCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: 'Stopped' },
  };
  doPatch(req, res, next, helper);
} // stopCollector

/**
 * Change collector status to Paused. Invalid if the collector's status is not
 * Running.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function pauseCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: 'Paused' },
  };
  doPatch(req, res, next, helper);
} // pauseCollector

/**
 * Change collector status from Paused to Running. Invalid if the collector's
 * status is not Paused.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function resumeCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: 'Running' },
  };
  doPatch(req, res, next, helper);
} // resumeCollector

/**
 * Returns a list of users permitted to modify this collector. DOES NOT use
 * wildcards.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollectorWriters(req, res, next) {
  doGetWriters.getWriters(req, res, next, helper);
} // getCollectorWriters

/**
 * Add one or more users to a collector's list of authorized writers.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function postCollectorWriters(req, res, next) {
  doPostWriters(req, res, next, helper);
} // postCollectorWriters

/**
 * Determine whether a user is an authorized writer for a Collector. If user is
 * unauthorized, there is no writer by this name for this collector.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollectorWriter(req, res, next) {
  doGetWriters.getWriter(req, res, next, helper);
}

/**
 * Remove a user from a collector’s list of authorized writers.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deleteCollectorWriter(req, res, next) {
  const userNameOrId = req.swagger.params.userNameOrId.value;
  doDeleteOneAssoc(req, res, next, helper,
      helper.belongsToManyAssoc.users, userNameOrId);
} // deleteCollectorWriter

/**
 * DELETE /collectors/{keys}/writers
 *
 * Deletes all the writers associated with this resource.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deleteCollectorWriters(req, res, next) {
  doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
} // deleteCollectorWriters

module.exports = {
  postCollector,
  findCollectors,
  getCollector,
  patchCollector,
  deregisterCollector,
  heartbeat,
  startCollector,
  stopCollector,
  pauseCollector,
  resumeCollector,
  getCollectorWriters,
  postCollectorWriters,
  getCollectorWriter,
  deleteCollectorWriter,
  deleteCollectorWriters,
  reEncryptSGContextValues, // exporting for testing purposes only
};
