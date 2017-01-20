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
      jobType: 'None',
      activity: 'worker',
      user: 'None',
      token: 'None',
      ipAddress: 'None',
      totalTime: 'None',
      queueTime: 'None',
      workTime: 'None',
      dbTime: 'None',
      recordCount: 0,
      errorCount: 0,
    },
  },
};
