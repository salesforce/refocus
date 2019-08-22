/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /kafkaTracking.js
 */
const logger = require('@salesforce/refocus-logging-client');

const AGGR_TOPIC = 'pubSub-aggregation';

const MESSAGE_TYPES = {
  RECEIVED: 'received',
  PUBLISH_TIME: 'publishTime',
};

/**
 * Send a message (to the kafka-cluster) containing the time it took
 * for a particular publish to happen to the redis instances
 * @param  {String} sampleName - The sample name
 * @param {String} updatedAt - The time (Date.toISOString) sample was updated at
 */
const sendPublishTracking = (sampleName, updatedAt) => {
  if (typeof sampleName !== 'string' || typeof updatedAt !== 'string') {
    logger.error(`Received invalid args: ${sampleName} ${updatedAt} `);
    return;
  }

  logger.track({
    type: MESSAGE_TYPES.PUBLISH_TIME,
    publishCompletedAt: Date.now(),
  },
  'info', AGGR_TOPIC, {
    sampleName,
    updatedAt,
  });
};

/**
 * Send a message (to the kafka-cluster) informing that an update was received
 * @param  {String} sampleName - The sample name
 * @param {String} updatedAt - The time (Date.toISOString) sample was updated at
 */
const sendUpdateReceivedTracking = (sampleName, updatedAt,
  reqStartTime, jobStartTime) => {
  if (typeof sampleName !== 'string' || typeof updatedAt !== 'string' ||
      typeof reqStartTime !== 'number') {
    logger.error(`Received invalid args: ${sampleName} ${updatedAt} 
      ${reqStartTime} ${jobStartTime}`);
    return;
  }

  logger.track({
    type: MESSAGE_TYPES.RECEIVED,
    reqStartTime,
    jobStartTime: jobStartTime ? jobStartTime : reqStartTime,
  }, 'info', AGGR_TOPIC, {
    sampleName,
    updatedAt,
  });
};

module.exports = {
  sendPublishTracking,
  sendUpdateReceivedTracking,
  AGGR_TOPIC,
  MESSAGE_TYPES,
};
