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

let requireSslToRemoteDataSource = false;
if (pe.COLLECTOR_REQUIRE_SSL_TO_REMOTE_DATA_SOURCE &&
  pe.COLLECTOR_REQUIRE_SSL_TO_REMOTE_DATA_SOURCE.toLowerCase() === 'true') {
  requireSslToRemoteDataSource = true;
}

let timeoutResponseMillis = 10000;
if (Number(pe.COLLECTOR_TIMEOUT_RESPONSE_MILLIS) > 0) {
  timeoutResponseMillis = Number(pe.COLLECTOR_TIMEOUT_RESPONSE_MILLIS);
}

let timeoutDeadlineMillis = 30000;
if (Number(pe.COLLECTOR_TIMEOUT_DEADLINE_MILLIS) > 0) {
  timeoutDeadlineMillis = Number(pe.COLLECTOR_TIMEOUT_DEADLINE_MILLIS);
}

let maxRetries = 3;
if (Number(pe.COLLECTOR_MAX_RETRIES) > -1) {
  maxRetries = Number(pe.COLLECTOR_MAX_RETRIES);
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
   * If flagged true, Refocus Collector will accept only external sources
   * as HTTPS.
   */
  requireSslToRemoteDataSource,

  /*
   * Retry behavior
   */
  timeoutResponseMillis,
  timeoutDeadlineMillis,
  maxRetries,
};
