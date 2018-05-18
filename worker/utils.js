/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/utils.js
 */
function onEnter(job) {
  const obj = {
    action: 'onEnter',
    cpuUsage: process.cpuUsage(),
    jobId: job.id,
    jobType: job.type,
    memoryUsage: process.memoryUsage(),
    pid: process.pid,
  };
  console.log(JSON.stringify(obj));
}

function beforeExit(job) {
  const obj = {
    action: 'beforeExit',
    cpuUsage: process.cpuUsage(),
    jobId: job.id,
    jobType: job.type,
    memoryUsage: process.memoryUsage(),
    pid: process.pid,
  };
  console.log(JSON.stringify(obj));
}

module.exports = {
  onEnter,
  beforeExit,
};
