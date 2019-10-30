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

/*
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

/*
 * Designate a separate real-time application for serving up real-time events.
 * If not specified, the default is "/" which means real-time events are served
 * via the main Refocus application itself.
 */
const realtimeApplication = pe.REALTIME_APPLICATION || '/';
const realtimeApplicationImc = pe.REALTIME_APPLICATION_IMC || '/';

/**
 * By supplying a mapping from a specific url parameter to different roomTypes
 * we can select the correct roomType for a specific user or use case.
 */
const roomTypeMapping = pe.ROOMTYPE_MAPPING || {};

const defaultRoomType = pe.DEFAULT_ROOMTYPE || '';

module.exports = {
  // Password stored in the db for SSO users (never used for authentication).
  dummySsoPassword: pe.DUMMY_SSO_PASSWORD || 'ssopassword',

  // Make the Google Analytics trackingId available in /view.
  trackingId: pe.GOOGLE_ANALYTICS_ID || 'N/A',

  // Make the real-time app endpoint available in /view for perspectives
  realtimeApplication,

  // Make the real-time app endpoint available in /view for Imc rooms
  realtimeApplicationImc,

  // Make the throttle time available in /view.
  realtimeEventThrottleMilliseconds,

  // Make the roomType mapping available in /view for IMC rooms
  roomTypeMapping,
  defaultRoomType

};
