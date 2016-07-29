/**
 * tests/db/model/sample/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();

module.exports = {
  forceDelete: (done) => {
    tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
};
