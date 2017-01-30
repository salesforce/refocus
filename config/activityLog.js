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
      user: 'None',
      token: 'None',
      ipAddress: 'None',
      totalTime: 'None',
      method: 'None', // one of HTTP verbs
      uri: 'None',
      dbTime: 'None',
      requestBytes: 0,
      responseBytes: 0,
      recordCount: 0,
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
