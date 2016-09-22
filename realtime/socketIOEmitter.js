/**
 * ./realtime/socketIOEmitter.js
 */

'use strict'; // eslint-disable-line strict

const rtUtils = require('./utils');

module.exports = (io, key, mssgObj) => {
  const obj = rtUtils.parseObject(mssgObj[key]);

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
      io.of(nsp).emit(key, JSON.stringify(mssgObj));
    }
  }
};
