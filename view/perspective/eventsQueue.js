/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/perspective/eventsQueue.js
 *
 */

'use strict';
const ZERO = 0;

let queue = [];

const eventType = {
  INTRNL_SUBJ_ADD: 'refocus.internal.realtime.subject.add',
  INTRNL_SUBJ_DEL: 'refocus.internal.realtime.subject.remove',
  INTRNL_SUBJ_UPD: 'refocus.internal.realtime.subject.update',
  INTRNL_SMPL_ADD: 'refocus.internal.realtime.sample.add',
  INTRNL_SMPL_DEL: 'refocus.internal.realtime.sample.remove',
  INTRNL_SMPL_UPD: 'refocus.internal.realtime.sample.update',
  INTRNL_SMPL_NC: 'refocus.internal.realtime.sample.nochange',
  LENS_CHANGE: 'refocus.lens.realtime.change',
};

/**
 * Push event data to corresponding event queue.
 * @param  {String} eventName - Event type name.
 * @param  {Object} eventData - JSON Data recieved with event.
 */
function enqueueEvent(eventName, eventData) {
  if (eventName === eventType.INTRNL_SUBJ_ADD) {
    queue.push({ 'subject.add': eventData });
  } else if (eventName === eventType.INTRNL_SUBJ_DEL) {
    queue.push({ 'subject.remove': eventData });
  } else if (eventName === eventType.INTRNL_SUBJ_UPD) {
    queue.push({ 'subject.update': eventData });
  } else if (eventName === eventType.INTRNL_SMPL_ADD) {
    queue.push({ 'sample.add': eventData });
  } else if (eventName === eventType.INTRNL_SMPL_DEL) {
    queue.push({ 'sample.remove': eventData });
  } else if (eventName === eventType.INTRNL_SMPL_UPD) {
    queue.push({ 'sample.update': eventData });
  } else if (eventName === eventType.INTRNL_SMPL_NC) {
    queue.push({ 'sample.nochange': eventData });
  }
}

/**
 * Create and dispatch custom event from event queue and empty the same for
 * another batch of events.
 * @param  {Object} queueToFlush - event queue to flush
 */
function createAndDispatchLensEvent(queueToFlush, lensElement) {
  if (queueToFlush !== undefined && queueToFlush.length > ZERO) {
    const evt = new CustomEvent(
      eventType.LENS_CHANGE, { detail: queueToFlush }
    );
    lensElement.dispatchEvent(evt);
  }
}

/**
 * schedule flushing of queue after given time interval.
 * @param  {Object} lensElement - document lens element
 */
function scheduleFlushQueue(lensElement, realtimeEventThrottleMilliseconds) {
  // clone and clear the events queue, dispatch events from the clone
  setInterval(() => {
    const queueCopy = queue.splice(0);
    createAndDispatchLensEvent(queueCopy, lensElement);
  }, realtimeEventThrottleMilliseconds);
}

module.exports = {
  enqueueEvent,
  scheduleFlushQueue,
  eventType,
  queue,
  createAndDispatchLensEvent,
};
