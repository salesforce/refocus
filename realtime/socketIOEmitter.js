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
const featureToggles = require('feature-toggles');

module.exports = (io, key, obj, pubOpts) => {
  // newObjectAsString contains { key: {new: obj }}
  const newObjectAsString = rtUtils.getNewObjAsString(key, obj);

  // NEW
  if (featureToggles.isFeatureEnabled('useNewNamespaceFormat')) {
    const eventType = key.split('.')[3];
    if (eventType === 'subject' || eventType === 'sample') {
      rtUtils.connectedPerspectives.forEach((roomName) => {
        if (rtUtils.shouldIEmitThisObj(roomName, obj)) {
          io.of('perspectives').to(roomName).emit(key, newObjectAsString);
        }
      });
    } else if (eventType === 'bot') {
      io.of('rooms').to(obj.roomId).emit(key, newObjectAsString);
      io.of('bots').to(obj.botId).emit(key, newObjectAsString);
    } else if (eventType === 'room') {
      io.of('rooms').to(obj.roomId).emit(key, newObjectAsString);
      if (obj.type && obj.type.bots) {
        obj.type.bots.forEach((bot) => {
          io.of('bots').to(bot.id).emit(key, newObjectAsString);
        });
      }
    }
  }

  // OLD
  if (featureToggles.isFeatureEnabled('useOldNamespaceFormat')) {
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
  }
};
