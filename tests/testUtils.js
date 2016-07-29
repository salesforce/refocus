/**
 * tests/testUtils.js
 */

'use strict';

var pfx = '___';
const jwtUtil = require('../api/v1/helpers/jwtUtil');

module.exports = {
  db: require('../db'),
  dbErrorName: 'SequelizeDatabaseError',
  dbError: new Error('expecting SequelizeDatabaseError'),
  fkErrorName: 'SequelizeForeignKeyConstraintError',
  fkError: new Error('expecting SequelizeForeignKeyConstraintError'),
  namePrefix: pfx,
  uniErrorName: 'SequelizeUniqueConstraintError',
  uniError: new Error('expecting SequelizeUniqueConstraintError'),
  valErrorName: 'SequelizeValidationError',
  valError: new Error('expecting SequelizeValidationError'),

  /*
   * By convention, all the resources we create in our tests are named using
   * the prefix so we can just do the destroy this way!
   */
  forceDelete(model, testStartTime) {
    return model.destroy({
      where: {
        name: {
          $ilike: pfx + '%',
        },
        createdAt: {
          $lt: new Date(),
          $gte: testStartTime,
        },
      },
      force: true,
    });
  },

  gotExpectedLength(stringOrArray, len) {
    return stringOrArray.length === len;
  },

  gotArrayWithExpectedLength(arr, len) {
    return Array.isArray(arr) && this.gotExpectedLength(arr, len);
  },

  createToken() {
    const createdToken = jwtUtil.createToken({ email: 'test@refocus.com' });
    return createdToken;
  },

}; // exports
