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
    process: 'None',
    recordCount: 0,
    requestBytes: 0,
    request_id: 'None',
    responseBytes: 0,
    token: 'None',
    totalTime: '0ms',
    uri: 'None',
    user: 'None',
  },
  collectorAssignment: {
    activity: 'collectorAssignment',
    generator: 'None',
    action: 'None',
    type: 'None',
    previousCollector: 'None',
    newCollector: 'None',
  },
  collectorHeartbeat: {
    activity: 'collectorHeartbeat',
    generatorsAdded: 0,
    generatorsDeleted: 0,
    generatorsUpdated: 0,
    memExternal: 0,
    memHeapTotal: 0,
    memHeapUsed: 0,
    memRss: 0,
    name: 'None',
    nodeVersion: 'None',
    uptime: 0,
    version: 'None',
  },
  env: {
    activity: 'env',
    name: 'None',
    value: 'None',
  },
  event: {
    activity: 'event',
    actionId: 'None',
    actionSuccess: 'None',
    botName: 'None',
    ipAddress: 'None',
    dbTime: '0ms',
    method: 'None', // one of HTTP verbs
    process: 'None',
    request_id: 'None',
    roomType: 'None',
    token: 'None',
    totalTime: '0ms',
    type: 'None',
    uri: 'None',
    user: 'None',
  },
  job: {
    activity: 'job',
    description: 'None',
    jobId: 'None',
    jobType: 'None',
    process: 'None',
    totalTime: '0ms',
  },
  jobCleanup: {
    activity: 'jobCleanup',
    iterations: 0,
    errors: 0,
    removed: 0,
    skipped: 0,
    totalTime: '0ms',
  },
  jobCreate: {
    activity: 'jobCreate',
    jobId: 'None',
    jobPriority: 'None',
    jobType: 'None',
    process: 'None',
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
  limiter: {
    activity: 'limiter',
    ipAddress: 'None',

    // limit that was hit: 500/60000 means they hit 500 requests in 60 seconds
    limit: '0/0',
    method: 'None', // one of HTTP verbs
    requestBytes: 0,
    request_id: 'None', // eslint-disable-line camelcase
    responseBytes: 0,
    token: 'None',
    totalTime: '0ms',
    uri: 'None',
    user: 'None',
  },
  missedHeartbeat: {
    activity: 'missedHeartbeat',
    collector: 'None',
    lastHeartbeat: 'None',
    delta: 'None',
  },
  pubsub: {
    activity: 'pubsub',
    key: 'None',
    process: 'None',
    pubCount: 0,
    pubTime: 0,
    subCount: 0,
    subTime: 0,
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
  sigterm: {
    activity: 'sigterm',
    status: 'None',
    totalTime: '0ms',
  },
  unauthorized: {
    activity: 'unauthorized',
    ipAddress: 'None',
    method: 'None',
    request_id: 'None', // eslint-disable-line camelcase
    uri: 'None',
  },
  worker: {
    activity: 'worker',
    dbTime: 'None',
    errorCount: 0,
    ipAddress: 'None',
    jobId: 'None',
    jobType: 'None',
    process: 'None',
    queueTime: 'None',
    queueResponseTime: 'None',
    recordCount: 0,
    request_id: 'None', // eslint-disable-line camelcase
    token: 'None',
    totalTime: 'None',
    user: 'None',
    workTime: 'None',
  },
};
