/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/activityLog.js
 *
 * Configure the attributes for each of the activity log lines.
 */
module.exports = {
  api: {
    activity: 'api',
    dbTime: '0ms',
    ipAddress: 'None',
    method: 'None', // one of HTTP verbs
    recordCount: 0,
    requestBytes: 0,
    request_id: 'None',
    responseBytes: 0,
    token: 'None',
    totalTime: '0ms',
    uri: 'None',
    user: 'None',
  },
  job: {
    activity: 'job',
    description: 'None',
    jobId: 'None',
    jobType: 'None',
    pid: 'None',
    totalTime: '0ms',
  },
  kueStats: {
    activity: 'kueStats',
    activeCount: 0,
    completeCount: 0,
    failedCount: 0,
    inactiveCount: 0,
    workTimeMillis: 0,
  },
  pubStats: {
    activity: 'pubStats',
    key: 'None',
    count: 0,
  },
  queueStats: {
    activity: 'queueStats',
    averageQueueTimeMillis: 0,
    jobCount: 0,
    medianQueueTimeMillis: 0,
    queueTime95thMillis: 0,
    recordCount: 0,
    timestamp: 'None',
  },
  realtime: {
    activity: 'realtime',
    ipAddress: 'None',
    perspective: 'None',
    token: 'None',
    totalTime: 'None',
    user: 'None',
  },
  unauthorized: {
    activity: 'unauthorized',
    ipAddress: 'None',
    method: 'None',
    request_id: 'None',
    uri: 'None',
  },
  worker: {
    activity: 'worker',
    dbTime: 'None',
    errorCount: 0,
    ipAddress: 'None',
    jobId: 'None',
    jobType: 'None',
    queueTime: 'None',
    queueResponseTime: 'None',
    recordCount: 0,
    request_id: 'None',
    token: 'None',
    totalTime: 'None',
    user: 'None',
    workTime: 'None',
  },
};
