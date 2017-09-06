/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config/collectorConfig.js
 *
 * Set up the collector configuration parameters.
 */
'use strict'; // eslint-disable-line strict
const pe = process.env; // eslint-disable-line no-process-env

module.exports = {
  /*
   * Collector will send a heartbeat every <heartbeatIntervalMillis>
   * milliseconds.
   */
  heartbeatIntervalMillis: +pe.COLLECTOR_HEARTBEAT_INTERVAL_MILLIS || 15000,

  /*
   * Collector will send a batch of samples up to Refocus at least every
   * <sampleUpsertQueueTimeMillis> milliseconds, or more frequently if there
   * are more than <maxSamplesPerBulkUpsert> samples queued up.
   */
  sampleUpsertQueueTimeMillis:
    +pe.COLLECTOR_SAMPLE_UPSERT_QUEUE_TIME_MILLIS || 15000,
  maxSamplesPerBulkUpsert: +pe.COLLECTOR_MAX_SAMPLES_PER_BULK_REQUEST || 1000,
};
