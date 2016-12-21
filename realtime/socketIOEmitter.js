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

module.exports = (io, key, mssgObj) => {
  const obj = rtUtils.parseObject(mssgObj[key], key);
  const newObjectAsString = rtUtils.getNewObjAsString(key, obj);

  /*
   * initialize a namespace when an perspective initialize namespace event is
   * sent
   */
  if (key.startsWith('refocus.internal.realtime.perspective.namespace' +
                                                              '.initialize')) {
    rtUtils.initializeNamespace(obj, io);
  }
  for (const nsp in io.nsps) {
    if (nsp && rtUtils.shouldIEmitThisObj(nsp, obj)) {
      // newObjectAsString contains {key: {new: obj }}
      io.of(nsp).emit(key, newObjectAsString);
    }
  }
};
