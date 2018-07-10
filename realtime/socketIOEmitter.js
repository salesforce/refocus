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

module.exports = (io, key, obj) => {
  // newObjectAsString contains { key: {new: obj }}
  let newObjectAsString = rtUtils.getNewObjAsString(key, obj);

  // Initialize namespace when perspective initialize namespace event is sent
  if (key.startsWith(initPerspectiveEvent)) {
    rtUtils.initializePerspectiveNamespace(obj, io);
  }

  if (key.startsWith(initBotEvent)) {
    rtUtils.initializeBotNamespace(obj, io);
  }

  // Iterate over all the initialized namespaces.
  for (const nsp in io.nsps) {
    if (!nsp) break;

    // Load the namespace from socket.io.
    const namespace = io.of(nsp);
    if (!namespace) break;

    /*
     * Emit events only if the namespace for *this* process has connected
     * clients, i.e. a perspective or room actively waiting for real-time
     * events.
     *
     * Ref. https://socket.io/docs/server-api/#namespace-connected.
     */
    const connections = Object.keys(namespace.connected);
    if (connections.length < 1) break;

    // Check the perspective/room filters before emitting.
    if (rtUtils.shouldIEmitThisObj(nsp, obj)) {
      if (obj.pubOpts) {
        delete obj.pubOpts;
        newObjectAsString = rtUtils.getNewObjAsString(key, obj);
      }

      namespace.emit(key, newObjectAsString);
    }
  }
};
