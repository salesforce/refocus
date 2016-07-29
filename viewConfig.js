/**
 * ./viewConfig.js
 *
 * Configuration Settings for Views
 */
'use strict'; // eslint-disable-line strict
const pe = process.env;
const DEFAULT_THROTTLE_MILLISECS = 2000;
const trackingId = pe.trackingId || 'UA-75732905-1';

/**
 * Browser clients can get jittery or start to feel stuck when receiving large
 * bursts of realtime events when each event requires some client-side
 * processing and DOM manipulation and graphics re-rendering.
 * We use realtimeEventThrottleMilliseconds to bundle up multiple
 * server-side events into a single client-side event, so that the lens
 * implementation can minimize the graphics re-rendering.
 */
const realtimeEventThrottleMilliseconds =
 pe.realtimeEventThrottleMilliseconds || DEFAULT_THROTTLE_MILLISECS;

module.exports = {

  trackingId,
  realtimeEventThrottleMilliseconds,

};
