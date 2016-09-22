/**
 * tests/api/v1/globalconfig/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();

module.exports = {
  forceDelete(done) {
    return tu.db.GlobalConfig.destroy({
      where: {
        key: {
          $iLike: tu.namePrefix + '%',
        },
        createdAt: {
          $lt: new Date(),
          $gte: testStartTime,
        },
      },
      force: true,
    })
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
};
