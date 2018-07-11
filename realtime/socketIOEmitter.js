/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./realtime/socketIOEmitter.js
 */
'use strict'; // eslint-disable-line strict
const rtUtils = require('./utils');
const initPerspectiveEvent =
  'refocus.internal.realtime.perspective.namespace.initialize';
const initBotEvent = 'refocus.internal.realtime.bot.namespace.initialize';

module.exports = (io, key, obj, pubOpts) => {
  // newObjectAsString contains { key: {new: obj }}
  const newObjectAsString = rtUtils.getNewObjAsString(key, obj);

  // Initialize namespace when perspective initialize namespace event is sent
  if (key.startsWith(initPerspectiveEvent)) {
    rtUtils.initializePerspectiveNamespace(obj, io);
  }

  if (key.startsWith(initBotEvent)) {
    rtUtils.initializeBotNamespace(obj, io);
  }

  /*
   * Socket.io does not expose any API to retrieve list of all the namespaces
   * which have been initialized. We use `Object.keys(io.nsps)` here, which
   * gives us an array of all the namespace names, where each namespace name
   * is a string which encodes the perspective/room filters neeeded to match
   * this real-time event to the perspectives/rooms to which it should be
   * emitted.
   */
  Object.keys(io.nsps).forEach((n) => {
    const namespace = io.of(n); // Load the namespace from socket.io

    /*
     * Emit this event only if *this* namespace in *this* process has one or
     * more connected clients, e.g. at least one user has this perspective or
     * room open in a browser.
     *
     * Ref. https://socket.io/docs/server-api/#namespace-connected.
     */
    const connections = Object.keys(namespace.connected);
    if (connections.length > 0) {
      /* Check the perspective/room filters before emitting. */
      if (rtUtils.shouldIEmitThisObj(n, obj, pubOpts)) {
        namespace.emit(key, newObjectAsString);
      }
    }
  });
};
