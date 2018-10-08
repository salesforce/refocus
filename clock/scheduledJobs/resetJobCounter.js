/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/resetJobCounter.js
 *
 * Executes the process to clean up jobs
 */
const Promise = require('bluebird');
const kue = require('kue');
kue.Job.rangeByStateAsync = Promise.promisify(kue.Job.rangeByState);
kue.Job.prototype.removeAsync = Promise.promisify(kue.Job.prototype.remove);

/**
 * Reset the job counter so job ids will be assigned starting from zero again
 */
function execute() {
  const client = kue.Job.client;
  const key = client.getKey('ids');
  client.del(key);
  return Promise.resolve();
} // execute

module.exports = {
  execute,
};
