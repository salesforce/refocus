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
  QUEUE_TIME: 'queueTime',
  PUBLISH_TIME: 'publishTime',
};

/**
 * Send a message (to the kafka-cluster) containing the time it took
 * for a particular publish to happen to the redis instances
 * @param  {Date}  startTime - The time publish began
 * @param  {String} sampleName - The sample name
 * @param {String} updatedAt - The time ((Date.toISOString)) sample was updated at
 */
const sendPublishTracking = (startTime, sampleName, updatedAt) => {
  if (!(startTime instanceof Date) || typeof sampleName !== 'string' ||
    typeof updatedAt !== 'string') {
    throw new Error('Invalid args');
  }

  logger.log({
    publishTime: new Date() - startTime,
    type: MESSAGE_TYPES.PUBLISH_TIME,
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
const sendUpdateReceivedTracking = (sampleName, updatedAt) => {
  if (typeof sampleName !== 'string' || typeof updatedAt !== 'string') {
    throw new Error('Invalid args');
  }

  logger.log({
    type: MESSAGE_TYPES.RECEIVED,
  }, 'info', AGGR_TOPIC, {
    sampleName,
    updatedAt,
  });
};

/**
 * Send a message (to the kafka-cluster) containing the time it took
 * for a particular publish to happen to the redis instances
 * @param  {number}  queueTime - The time publish began
 * @param  {String} sampleName - The sample name
 * @param {String} updatedAt - The time (Date.toISOString) sample was updated at
 */
const sendQueueTracking = (queueTime, sampleName, updatedAt) => {
  if (typeof queueTime !== 'number' || typeof sampleName !== 'string' ||
    typeof updatedAt !== 'string') {
    throw new Error('Invalid args');
  }

  logger.log({
    type: MESSAGE_TYPES.QUEUE_TIME,
    queueTime,
  }, 'info', AGGR_TOPIC, {
    sampleName,
    updatedAt,
  });
};

module.exports = {
  sendPublishTracking,
  sendUpdateReceivedTracking,
  sendQueueTracking,
  AGGR_TOPIC,
  MESSAGE_TYPES,
};
