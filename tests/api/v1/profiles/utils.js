/**
 * tests/api/v1/profiles/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.User, testStartTime)
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
};
