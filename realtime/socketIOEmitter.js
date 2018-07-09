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
const initPerspectiveEvent = 'refocus.internal.realtime.perspective.namespace.initialize';
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

  console.log(io);
  console.log(io.nsps);
  console.log(obj);

  for (const nsp in io.nsps) {
    // Send events only if namespace connections > 0
    const n = io.of(nsp);
    console.log('the namespace', n);
    console.log('the namespace connections', n.connected);

    io.of(nsp).clients((error, clients) => {
      console.log(clients);
    });

    if (nsp && rtUtils.shouldIEmitThisObj(nsp, obj)) {
      if (obj.pubOpts) {
        delete obj.pubOpts;
        newObjectAsString = rtUtils.getNewObjAsString(key, obj);
      }

      io.of(nsp).emit(key, newObjectAsString);
    }
  }
};
