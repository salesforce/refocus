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
const jwtUtil = require('../../../utils/jwtUtil');
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/collectors');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const u = require('../helpers/verbs/utils');
const heartbeatUtils = require('../helpers/verbs/heartbeatUtils');
const httpStatus = require('../constants').httpStatus;
const decryptSGContextValues = require('../../../utils/cryptUtils')
  .decryptSGContextValues;
const encrypt = require('../../../utils/cryptUtils').encrypt;
const GlobalConfig = require('../helpers/nouns/globalconfig').model;
const config = require('../../../config');
const GeneratorTemplate = require('../../../db/index').GeneratorTemplate;
const encryptionAlgoForCollector = config.encryptionAlgoForCollector;
const MINUS_ONE = -1;

/**
 * Decrypt sample generator context values marked as 'encrypted' in sample
 * generator template. Then, encrypt the values again with secret key, which is
 * a combination of collector auth token and timestamp.
 * @param  {Object}   sg - Sample generator having generator template as an
 * attribute.
 * @param  {String}   authToken - Collector authentication token
 * @param  {String}   timestamp - Timestamp sent by collector in heartbeat
 * @returns {Object} Sample generator with reencrypted context values.
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
  })
  .catch(() => {
    throw new apiErrors.SampleGeneratorContextDecryptionError();
  });
}

/**
 * Find the matching generator template and attach it to the generator
 *
 * @param  {Object} sg - Sample generator object
 * @return {Object} Sample generator with generatorTemplate attribute set to the
 *  full matching generator template object.
 */
function attachTemplate(sg) {
  const { name, version } = sg.generatorTemplate;
  return GeneratorTemplate.getSemverMatch(name, version)
  .then((gt) => {
    if (sg.context && gt.contextDefinition) {
      sg.generatorTemplate = gt;
      return sg;
    }
  });
}

/**
 * TODO: delete this once the auto-registration has been set up and the heartbeat
 * has been updated to use it
 */
/**
 * Register a collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function postCollector(req, res, next) {
  const toPost = req.swagger.params.queryBody.value;
  helper.model.create(toPost)
  .then((o) => {
    /*
     * When a collector registers itself with Refocus, Refocus sends back a
     * special token for that collector to use for all further communication
     */
    o.dataValues.token = jwtUtil
      .createToken(toPost.name, toPost.name, { IsCollector: true });
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
 * Some fields are only writable by the collector itself. So, if any of those
 * fields are being updated, check that the token provided in request belongs to
 * a collector.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function patchCollector(req, res, next) {
  // verify controller token if atleast one field is writable by collector
  let verifyCtrToken = false;
  const reqBodyKeys = Object.keys(req.body);
  const cltrWritableFields = helper.fieldsWritableByCollectorOnly;

  for (let i = 0; i < cltrWritableFields.length; i++) {
    const fieldName = cltrWritableFields[i];
    if (reqBodyKeys.indexOf(fieldName) > MINUS_ONE) {
      verifyCtrToken = true;
      break;
    }
  }

  if (verifyCtrToken) { // verify that token belongs to collector
    return jwtUtil.verifyCollectorToken(req)
    .then(() => doPatch(req, res, next, helper))
    .catch((err) => u.handleError(next, err, helper.modelName));
  }

  return doPatch(req, res, next, helper);
} // patchCollector

/**
 * Deregister a collector.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deregisterCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { registered: false },
  };

  doPatch(req, res, next, helper);
} // deregisterCollector

/**
 * Reregister a collector.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function reregisterCollector(req, res, next) {
  return u.findByKey(helper, req.swagger.params)
  .then((collector) => {
    if (collector.registered) {
      throw new apiErrors.ForbiddenError({ explanation:
        'Cannot reregister--this collector is already registered.',
      });
    }

    req.swagger.params.queryBody = {
      value: { registered: true },
    };

    return doPatch(req, res, next, helper);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // reregisterCollector

/**
 * Send heartbeat from collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function heartbeat(req, res, next) {
  if (!req.headers.IsCollector) {
    throw new apiErrors.ForbiddenError({
      explanation: `The token: ${req.headers.TokenName} does not belong to ' +
      'a collector`,
    });
  }

  const authToken = req.headers.authorization;
  const timestamp = req.body.timestamp;
  const collectorNameFromToken = req.headers.UserName;
  const retval = {
    collectorConfig: config.collector,
    generatorsAdded: [],
    generatorsDeleted: [],
    generatorsUpdated: [],
  };

  u.findByKey(helper, req.swagger.params)
  .then((o) => {
    /*
     * TODO: remove this 'if block', once spoofing between collectors can be
     * detected and rejected in the middleware.
     */
    if (collectorNameFromToken !== o.name) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Token does not match the specified collector',
      });
    } else if (o.status !== 'Running' && o.status !== 'Paused') {
      throw new apiErrors.ForbiddenError({
        explanation: `Collector must be running or paused. Status: ${o.status}`,
      });
    }

    // setup retval
    if (heartbeatUtils.collectorMap[o.name]) {
      retval.generatorsAdded = heartbeatUtils.collectorMap[o.name].added;
      retval.generatorsDeleted = heartbeatUtils.collectorMap[o.name].deleted;
      retval.generatorsUpdated = heartbeatUtils.collectorMap[o.name].updated;
      delete heartbeatUtils.collectorMap[o.name];
    }

    // set lastHeartbeat
    o.set('lastHeartbeat', timestamp);

    // update metadata
    const changedConfig = req.body.collectorConfig;
    if (changedConfig) {
      if (changedConfig.osInfo) {
        const osInfo = o.osInfo ? o.osInfo : {};
        Object.assign(osInfo, changedConfig.osInfo);
        o.set('osInfo', osInfo);
      }

      if (changedConfig.processInfo) {
        const processInfo = o.processInfo ? o.processInfo : {};
        Object.assign(processInfo, changedConfig.processInfo);
        o.set('processInfo', processInfo);
      }

      if (changedConfig.version) {
        o.set('version', changedConfig.version);
      }
    }

    return o.save();
  })

  // re-encrypt context values for added and updated generators
  .then(() => Promise.all(
    retval.generatorsAdded.map((sg) =>
      attachTemplate(sg)
      .then((sg) => reEncryptSGContextValues(sg, authToken, timestamp))
    )
  ))
  .then((added) => retval.generatorsAdded = added)
  .then(() => Promise.all(
    retval.generatorsUpdated.map((sg) =>
      attachTemplate(sg)
      .then((sg) => reEncryptSGContextValues(sg, authToken, timestamp))
    )
  ))
  .then((updated) => retval.generatorsUpdated = updated)

  // send response
  .then(() => res.status(httpStatus.OK).json(retval))
  .catch((err) => u.handleError(next, err, helper.modelName));
} // heartbeat

/**
 * Creates a collector if name not found, with the user as the sole writer.
 * Change collector status to Running and returns a new collector token.
 * Reject if the user is not among the writers.
 * Invalid if the collector's status is not Stopped.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function startCollector(req, res, next) {
  const requestBody = req.swagger.params.queryBody.value;
  requestBody.status = 'Running';
  let returnedCollector;

  // returns null if no collector found
  return helper.model.findOne({ where: { name: requestBody.name } })
  .then((_collector) => {
    if (!_collector) {
      if (featureToggles.isFeatureEnabled('returnUser')) {
        requestBody.createdBy = req.user.id;
      }

      return helper.model.create(requestBody)
      .then((collector) => {

        /*
         * When a collector registers itself with Refocus, Refocus sends back a
         * special token for that collector to use for all subsequent heartbeats.
         */
        collector.dataValues.token = jwtUtil.createToken(
          requestBody.name, requestBody.name, { IsCollector: true }
        );
        return res.status(httpStatus.OK)
          .json(u.responsify(collector, helper, req.method));
      });
    }

    // found collector
    returnedCollector = _collector;
    if (!returnedCollector.registered) {
      throw new apiErrors.ForbiddenError({ explanation:
        'Cannot start--this collector is not registered.',
      });
    }

    if (returnedCollector.status === 'Running' ||
      returnedCollector.status === 'Paused') {
      throw new apiErrors.ForbiddenError({ explanation:
        'Cannot start--only stopped collectors can start.',
      });
    }

    // check write permissions, and add the token
    return u.isWritable(req, returnedCollector);
  })
  .then(() => returnedCollector.update(requestBody))
  .then((retVal) => {
    retVal.dataValues.token = jwtUtil.createToken(
      retVal.name, retVal.name, { IsCollector: true }
    );
    return res.status(httpStatus.OK)
      .json(u.responsify(retVal, helper, req.method));
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
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
  reregisterCollector,
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
