

/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/admin.js
 */
'use strict'; // eslint-disable-line strict

const featureToggles = require('feature-toggles');
const sampleStore = require('../../../cache/sampleStore');
const sampleStoreInit = require('../../../cache/sampleStoreInit');
const apiErrors = require('../apiErrors');
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');

module.exports = {

  /**
   * POST /admin/sampleStore/rebuild
   *
   * Rebuild the redis sampleStore from the samples in the database. Admin
   * only.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  rebuildSampleStore(req, res, next) {
    if (!req.headers.IsAdmin) {
      return u.forbidden(next);
    }

    const enabled = featureToggles
        .isFeatureEnabled(sampleStore.constants.featureName);
    if (!enabled) {
      const err = new apiErrors.InvalidSampleStoreState({
        explanation: 'You cannot rebuild the sample store if the ' +
          'ENABLE_REDIS_SAMPLE_STORE feature is not enabled.',
      });
      return next(err);
    }

    return sampleStoreInit.eradicate()
      .then(() => sampleStoreInit.populate())
      .then(() => res.status(httpStatus.NO_CONTENT).json())
      .catch(() => u.forbidden(next));
  },
}; // exports
