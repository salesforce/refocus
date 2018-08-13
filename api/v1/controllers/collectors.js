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
const Promise = require('bluebird');
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
const status = require('../../../db/constants').collectorStatuses;
const decryptSGContextValues = require('../../../utils/cryptUtils')
  .decryptSGContextValues;
const encrypt = require('../../../utils/cryptUtils').encrypt;
const GlobalConfig = require('../helpers/nouns/globalconfig').model;
const config = require('../../../config');
const GeneratorTemplate = require('../../../db/index').GeneratorTemplate;
const Generator = require('../../../db/index').Generator;
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
 * GET /collectors
 *
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
 * GET /collectors/{key}
 *
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
 * GET /collectors/{key}/status
 *
 * Get the status for the collector specified by id or name.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollectorStatus(req, res, next) {
  const resultObj = { reqStartTime: req.timestamp };
  u.findByKey(helper, req.swagger.params, ['status'])
  .then((o) => {
    const returnObj = o.get ? o.get() : o;
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    u.logAPI(req, resultObj, returnObj);
    res.status(httpStatus.OK).json(returnObj);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // getCollectorStatus

/**
 * PATCH /collectors/{key}
 *
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

  // If patching restricted fields, make sure this is collector token.
  if (verifyCtrToken && !req.headers.IsCollector) {
    const err = new apiErrors.ForbiddenError({
      explanation: 'Authentication Failed',
    });
    return u.handleError(next, err, helper.modelName);
  };

  return doPatch(req, res, next, helper);
} // patchCollector

/**
 * POST /collectors/{key}/deregister
 *
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
 * POST /collectors/{key}/reregister
 *
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
 * POST /collectors/{key}/heartbeat
 *
 * Send heartbeat from collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function heartbeat(req, res, next) {
  const resultObj = { reqStartTime: req.timestamp };
  if (!req.headers.IsCollector) {
    throw new apiErrors.ForbiddenError({
      explanation: 'Authentication Failed',
    });
  }

  const authToken = req.headers.authorization;
  const timestamp = req.body.timestamp;
  const collectorNameFromToken = req.headers.TokenName;
  let collectorName;

  const retval = {
    collectorConfig: config.collector,
    generatorsAdded: [],
    generatorsDeleted: [],
    generatorsUpdated: [],
  };

  u.findByKey(helper, req.swagger.params)
  .then((o) => {
    collectorName = o.name;

    /*
     * TODO: remove this 'if block', once spoofing between collectors can be
     * detected and rejected in the middleware.
     */
    if (collectorNameFromToken !== o.name) {
      throw new apiErrors.ForbiddenError({
        explanation: 'Authentication Failed',
      });
    } else if (o.status === status.Stopped) {
      throw new apiErrors.ForbiddenError({
        explanation: `Collector cannot send a heartbeat if stopped. Status: ${o.status}`,
      });
    }

    if (o.status === status.MissedHeartbeat) {
      o.set('status', status.Running);
    }

    retval.collectorConfig.status = o.status;
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

  // get the ids for changed generators
  .then(() => heartbeatUtils.getChangedIds(collectorName))

  // find the generator objects for the changed ids
  .then((changedIds) => Promise.all(
    ['added', 'deleted', 'updated'].map((changeType) => {
      const ids = changedIds[changeType];
      const where = { where: { id: ids } };
      return ids.length ? Generator.findForHeartbeat(where) :
        Promise.resolve([]);
    })
  ))

  // assign the changed generators to retval
  .then((generators) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    retval.generatorsAdded = generators[0];
    retval.generatorsDeleted = generators[1];
    retval.generatorsUpdated = generators[2];
  })

  // reset the tracked changes for this collector
  .then(() => heartbeatUtils.resetChanges(collectorName))

  // re-encrypt context values for added and updated generators
  .then(() => Promise.all(
    retval.generatorsAdded.map((sg) =>
      attachTemplate(sg)
      .then((sg) => {
        const userName = sg.user.dataValues.name;
        const generatorName = sg.name;
        sg.token = jwtUtil.createToken(generatorName, userName,
          { IsGenerator: true });
        return reEncryptSGContextValues(sg, authToken, timestamp);
      })
    )
  ))
  .then((added) => retval.generatorsAdded = added)
  .then(() => Promise.all(
    retval.generatorsUpdated.map((sg) =>
      attachTemplate(sg)
      .then((sg) => {
        const userName = sg.user.dataValues.name;
        const generatorName = sg.name;
        sg.token = jwtUtil.createToken(generatorName, userName,
          { IsGenerator: true });
        return reEncryptSGContextValues(sg, authToken, timestamp);
      })
    )
  ))
  .then((updated) => retval.generatorsUpdated = updated)
  .then(() => {
    u.logAPI(req, resultObj, retval);
    res.status(httpStatus.OK).json(u.cleanAndStripNulls(retval));
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // heartbeat

/**
 * POST /collectors/start
 *
 * Starts a collector by setting the status to "Running". If the collector is
 * not found, a new collector is created.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @returns {Object} - Response of the start endpoint
 */
function startCollector(req, res, next) {
  const resultObj = { reqStartTime: req.timestamp };
  const body = req.swagger.params.queryBody.value;
  body.status = status.Running;
  body.createdBy = req.user.id;

  // Set lastHeartbeat to make collector alive for generators to be assigned
  body.lastHeartbeat = Date.now();
  let collToReturn;
  return helper.model.findOne({ where: { name: body.name } })
  /* Already exists? Verify that this user has write permission. */
  .then((coll) => {
    if (coll) return u.isWritable(req, coll);
    return coll;
  })
  /* Already exists and is running or paused? Error! */
  .then((coll) => {
    if (coll) {
      if (coll.status === status.Running || coll.status === status.Paused) {
        throw new apiErrors.ForbiddenError({
          explanation: 'Cannot start--only a stopped collector can start',
        });
      }

      if (!coll.registered) {
        throw new apiErrors.ForbiddenError({
          explanation: 'You must reregister this collector before you can ' +
            'start it',
        });
      }
    }

    return coll;
  })
  /* Update or create */
  .then((coll) => coll ? coll.update(body) : helper.model.create(body))
  .then((coll) => {
    collToReturn = coll;
    /* TODO: change to use currentGenerators once that includes current gens only */
    return Generator.findAll({ where: { collectorId: coll.id } });
  })
  /* Add all the attributes necessary to send back to collector. */
  .then((gens) => Promise.all(gens.map((g) => g.updateForHeartbeat())))
  .then((gens) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    collToReturn.dataValues.generatorsAdded = gens.map((g) => {
      g.token = jwtUtil.createToken(g.name, g.user.name,
        { IsGenerator: true });
      delete g.GeneratorCollectors;
      delete g.possibleCollectors;
      return g;
    });

    /*
     * When a collector registers itself with Refocus, Refocus sends back a
     * special token for that collector to use for all subsequent heartbeats.
     */
    collToReturn.dataValues.token = jwtUtil.createToken(body.name,
      req.headers.UserName, { IsCollector: true });

    collToReturn.dataValues.collectorConfig = config.collector;
    collToReturn.dataValues.collectorConfig.status = collToReturn.status;
    u.logAPI(req, resultObj, collToReturn);
    return res.status(httpStatus.OK)
      .json(u.responsify(collToReturn, helper, req.method));
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // startCollector

/**
 * POST /collectors/{key}/stop
 *
 * Change collector status to Stopped. Invalid if the collector's status is
 * Stopped.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function stopCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: status.Stopped },
  };
  doPatch(req, res, next, helper);
} // stopCollector

/**
 * POST /collectors/{key}/pause
 *
 * Change collector status to Paused. Invalid if the collector's status is not
 * Running.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function pauseCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: status.Paused },
  };
  doPatch(req, res, next, helper);
} // pauseCollector

/**
 * POST /collectors/{key}/resume
 *
 * Change collector status from Paused to Running. Invalid if the collector's
 * status is not Paused.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function resumeCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: status.Running },
  };
  doPatch(req, res, next, helper);
} // resumeCollector

/**
 * GET /collectors/{key}/writers
 *
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
 * POST /collectors/{key}/writers
 *
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
 * GET /collectors/{key}/writers/{userNameOrId}
 *
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
 * DELETE /collectors/{key}/writers/{userNameOrId}
 *
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
  findCollectors,
  getCollector,
  getCollectorStatus,
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
