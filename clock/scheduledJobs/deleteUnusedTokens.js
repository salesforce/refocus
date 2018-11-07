/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/deleteUnusedTokens.js
 *
 * Deletes unused tokens.
 */
const Token = require('../../db/index').Token;
const since = require('../../config').deleteUnusedTokensSince;

module.exports = {

  /**
   * Delete unused tokens based on threshold from config.
   *
   * @returns {Promise<Object>} containing recordCount and errorCount for
   *  activity=worker logging
   */
  execute: () => Token.deleteUnused(since)
    .then((numDeleted) => ({ recordCount: numDeleted, errorCount: 0 })),
};
