/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/persistSampleStore.js
 *
 * Executes the process to save the redis sample store to postgres db. If
 * worker process is enabled, enqueues a job, otherwise just executes directly
 * in this process.
 */
const sampleStorePersist = require('../../cache/sampleStorePersist');

/**
 * Execute the call to check for sample timeouts.
 *
 * @returns {Promise}
 */
function execute() {
  return sampleStorePersist.persist()
  .then((num) => ({ recordCount: num ? num : 0 }));
} // execute

module.exports = {
  execute,
};
