/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /jobQueue/setup.js
 *
 * Setup the "Kue" library to process background jobs
 */

'use strict'; // eslint-disable-line strict

const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const urlParser = require('url');
const kue = require('kue');

let redisUrl = env.redisUrl;
const redisOptions = {};
if (redisUrl) {
  const redisInfo = urlParser.parse(redisUrl, true);

  if (redisInfo.protocol !== 'redis:') {
    redisUrl = 'redis:' + redisUrl;
  }

  redisOptions.redis = redisUrl;
}

// create a job queue using the redis options specified
const jobQueue = kue.createQueue(redisOptions);

module.exports = {
  jobQueue,
  jobType: {
    BULKUPSERTSAMPLES: 'bulkUpsertSamples',
  }
};
