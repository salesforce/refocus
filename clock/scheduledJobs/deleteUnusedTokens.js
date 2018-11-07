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
   * Delete unused tokens based on threshold from config. Turn on this feature
   * by defining two environment variables, one to set the schedule for the
   * clock job and the other to set the threshold for what to consider
   * "unused".
   *
   * Use environment variable name "CLOCK_JOB_INTERVAL_deleteUnusedTokens" to
   * set the frequency of the clock job, i.e. how often should we check for
   * unused tokens. Set the value to a time offset like "12h" if you want to
   * run the clock job every twelve hours or "1d" if you want to run the job
   * once a day.
   *
   * Use environment variable name "DELETE_UNUSED_TOKENS_SINCE" to set the
   * threshold of what we should consider "unused". Set the value to a negative
   * time offset like "-30d" if you want to consider a token unused if it has
   * not been used in the last 30 days, or "-3m" for three months, etc.
   *
   * @returns {Promise<Object>} containing recordCount and errorCount for
   *  activity=worker logging
   */
  execute: () => Token.deleteUnused(since)
    .then((numDeleted) => ({ recordCount: numDeleted, errorCount: 0 })),
};
