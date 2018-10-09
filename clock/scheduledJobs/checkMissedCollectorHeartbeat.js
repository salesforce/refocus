/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/checkMissedCollectorHeartbeat.js
 *
 * Executes the checkMissedHeartbeat process. If worker process is enabled,
 * enqueues a job, otherwise just executes work directly in this process.
 */
const Collector = require('../../db/index').Collector;

/**
 * Execute the call to check for missed heartbeat.
 * @returns {Promise}
 */
function execute() {
  return Collector.checkMissedHeartbeat();
} // execute

module.exports = {
  execute,
};
