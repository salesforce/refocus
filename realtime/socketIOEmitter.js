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
const initEvent = 'refocus.internal.realtime.perspective.namespace.initialize';

module.exports = (io, key, obj) => {
  // newObjectAsString contains { key: {new: obj }}
  const newObjectAsString = rtUtils.getNewObjAsString(key, obj);

  // Initialize namespace when perspective initialize namespace event is sent
  if (key.startsWith(initEvent)) {
    rtUtils.initializeNamespace(obj, io);
  }

  for (const nsp in io.nsps) {
    // Send events only if namespace connections > 0
    if (nsp && Object.keys(nsp).length &&
         rtUtils.shouldIEmitThisObj(nsp, obj)) {
      io.of(nsp).emit(key, newObjectAsString);
    }
  }
};
