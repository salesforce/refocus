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
/* eslint-disable func-style*/
const logger = require('@salesforce/refocus-logging-client');
const featureToggles = require('feature-toggles');

const { pubSubAggregationTopic } = require('../config');

const MESSAGE_TYPES = {
  REQUEST_STARTED: 'requestStarted',
  PUBLISHED: 'published',
};

/**
 * Send a message (to the kafka-cluster) containing the time it took
 * for a particular publish to happen to the redis instances
 * @param  {String} sampleName - The sample name
 * @param {String} updatedAt - The time (Date.toISOString) sample was updated at
 */
const trackSamplePublish = (sampleName, updatedAt) => {
  if (featureToggles.isFeatureEnabled('enableKafkaPubSubAggregation')) {
    if (typeof sampleName !== 'string' || typeof updatedAt !== 'string') {
      logger.error(`Received invalid args in trackSamplePublish:
      ${sampleName} ${updatedAt}`);
      return;
    }

    logger.track({
      type: MESSAGE_TYPES.PUBLISHED,
      publishCompletedAt: Date.now(),
    },
    'info', pubSubAggregationTopic, {
      sampleName,
      updatedAt,
    });
  }
};

/**
 * Send a message (to the kafka-cluster) informing that an update was received
 * @param  {String} sampleName - The sample name
 * @param {String} updatedAt - The time (Date.toISOString) sample was updated at
 * @param {String} reqStartTime - The time (epoch) request was sent in
 * @param {String} jobStartTime - The time (epoch) request processing started
 */
const trackSampleRequest = (sampleName, updatedAt,
  reqStartTime, jobStartTime) => {
  if (featureToggles.isFeatureEnabled('enableKafkaPubSubAggregation')) {
    if (typeof sampleName !== 'string' || typeof updatedAt !== 'string' ||
        typeof reqStartTime !== 'number' ||
        (jobStartTime && typeof jobStartTime !== 'number')) {
      logger.error(`Received invalid args in trackSampleRequest: 
        ${sampleName} ${updatedAt} ${reqStartTime} ${jobStartTime}`);
      return;
    }

    logger.track({
      type: MESSAGE_TYPES.REQUEST_STARTED,
      reqStartTime,
      jobStartTime: jobStartTime ? jobStartTime : reqStartTime,
    }, 'info', pubSubAggregationTopic, {
      sampleName,
      updatedAt,
    });
  }
};

module.exports = {
  trackSamplePublish,
  trackSampleRequest,
};
