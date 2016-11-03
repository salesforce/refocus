/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
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
 * Clone object to handle race conditions.
 *
 * A note on performance: calling this "clone" function 3000 times with a
 * sample or subject event takes about ~70ms.
 * Running JSON.parse(JSON.stringify(...)) for the same objects takes ~129ms.
 *
 * @param  {Object} obj - Object to copy
 * @returns {Object} copy - New copied object
 */
function clone(obj) {
  let copy;

  // Handle simple types, and null or undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array
  if (obj instanceof Array) {
    copy = [];
    for (let i = 0, len = obj.length; i < len; i++) {
      copy[i] = clone(obj[i]);
    }

    return copy;
  }

  // Handle Object
  if (obj instanceof Object) {
    copy = {};
    for (const attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = clone(obj[attr]);
      }
    }

    return copy;
  }

  throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * schedule flushing of queue after given time interval.
 * @param  {Object} lensElement - document lens element
 */
function scheduleFlushQueue(lensElement, realtimeEventThrottleMilliseconds) {
  // clone events queue, initialize events queue, flush events queue copy.
  setInterval(() => {
    const queueCopy = clone(queue);
    queue.length = 0;
    createAndDispatchLensEvent(queueCopy, lensElement);
  }, realtimeEventThrottleMilliseconds);
}

module.exports = {
  enqueueEvent,
  scheduleFlushQueue,
  eventType,
  queue,
  clone,
  createAndDispatchLensEvent,
};
