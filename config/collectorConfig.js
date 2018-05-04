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

// Don't allow admin to override heartbeat interval or latency less than 1 sec.
const FLOOR = 1000; // milliseconds
const INTERVAL_DEFAULT = 15; // seconds
const LATENCY_DEFAULT = 5; // seconds

let heartbeatIntervalMillis = 1000 *
  (+pe.COLLECTOR_HEARTBEAT_INTERVAL_SECS || INTERVAL_DEFAULT);
if (heartbeatIntervalMillis < FLOOR) {
  heartbeatIntervalMillis = 1000 * INTERVAL_DEFAULT;
}

let heartbeatLatencyToleranceMillis = 1000 *
  +pe.COLLECTOR_HEARTBEAT_LATENCY_TOLERANCE_SECS || LATENCY_DEFAULT;
if (heartbeatLatencyToleranceMillis < FLOOR) {
  heartbeatLatencyToleranceMillis = 1000 * LATENCY_DEFAULT;
}

module.exports = {
  /*
   * Each collector will send a heartbeat every <heartbeatIntervalMillis>
   * milliseconds.
   */
  heartbeatIntervalMillis,

  /*
   * Refocus will treat a collector as down (and try to reassign generators to
   * a different collector) if (<heartbeatIntervalMillis> +
   * <heartbeatLatencyToleranceMillis>) milliseconds go by without receiving a
   * new heartbeat.
   * For example, let's say heartbeatIntervalMillis=15000 and
   * heartbeatLatencyToleranceMillis=5000. If a collector's last heartbeat
   * was at 12:00:00:000 then Refocus will treat the collector as down at
   * 12:00:20:000.
   */
  heartbeatLatencyToleranceMillis,

  /*
   * Collector will send a batch of samples up to Refocus at least every
   * <sampleUpsertQueueTimeMillis> milliseconds, or more frequently if there
   * are more than <maxSamplesPerBulkUpsert> samples queued up.
   */
  sampleUpsertQueueTimeMillis:
    +pe.COLLECTOR_SAMPLE_UPSERT_QUEUE_TIME_MILLIS || 15000,
  maxSamplesPerBulkUpsert: +pe.COLLECTOR_MAX_SAMPLES_PER_BULK_REQUEST || 1000,
};
