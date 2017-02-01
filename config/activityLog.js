/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/activityLog.js
 * Config for activity logs
 */

module.exports = {
  activityType: {
    realtime: {
      activity: 'realtime',
      ipAddress: 'None',
      perspective: 'None',
      token: 'None',
      totalTime: 'None',
      user: 'None',
    },
    api: {
      activity: 'api',
      dbTime: '0ms',
      ipAddress: 'None',
      method: 'None', // one of HTTP verbs
      recordCount: 0,
      requestBytes: 0,
      responseBytes: 0,
      token: 'None',
      totalTime: '0ms',
      uri: 'None',
      user: 'None',
    },
    worker: {
      activity: 'worker',
      dbTime: 'None',
      errorCount: 0,
      ipAddress: 'None',
      jobType: 'None',
      queueTime: 'None',
      recordCount: 0,
      token: 'None',
      totalTime: 'None',
      user: 'None',
      workTime: 'None',
    },
  },
};
