/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./viewConfig.js
 *
 * Configuration Settings for Views
 */
'use strict'; // eslint-disable-line strict
const pe = process.env; // eslint-disable-line no-process-env

/**
 * Browser clients can get jittery or start to feel stuck when receiving large
 * bursts of realtime events when each event requires some client-side
 * processing and DOM manipulation and graphics re-rendering.
 * We use realtimeEventThrottleMilliseconds to bundle up multiple
 * server-side events into a single client-side event, so that the lens
 * implementation can minimize the graphics re-rendering.
 */
const DEFAULT_THROTTLE_MILLISECS = 4000;
const realtimeEventThrottleMilliseconds =
 pe.realtimeEventThrottleMilliseconds || DEFAULT_THROTTLE_MILLISECS;

const socketIOtransportProtocol = pe.SOCKETIO_TRANSPORT_PROTOCOL || null;
module.exports = {
  // Password stored in the db for SSO users (never used for authentication).
  dummySsoPassword: pe.DUMMY_SSO_PASSWORD || 'ssopassword',

  // Make the Google Analytics trackingId available in /view.
  trackingId: pe.GOOGLE_ANALYTICS_ID || 'N/A',

  // Make the throttle time available in /view.
  realtimeEventThrottleMilliseconds,

  // Expose the socketIOtransportProtocol variable in the /view
  socketIOtransportProtocol,
};
