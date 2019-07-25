/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/sampleTimeout.js
 *
 * Executes the sample timeout process. If worker process is enabled, enqueues
 * a job, otherwise just executes work directly in this process.
 */
const dbSubject = require('../../db/index').Subject;
const publisher = require('../../realtime/redisPublisher');
const sampleEvent = require('../../realtime/constants').events.sample;
const sampleStoreTimeout = require('../../cache/sampleStoreTimeout');
/**
 * Execute the call to check for sample timeouts.
 *
 * @returns {Promise}
 */
function execute() {
  return sampleStoreTimeout.doTimeout()
  .then((dbRes) => ({
    recordCount: dbRes.numberTimedOut,
    errorCount: dbRes.numberEvaluated - dbRes.numberTimedOut,
  }));
} // execute

module.exports = {
  execute,
};
