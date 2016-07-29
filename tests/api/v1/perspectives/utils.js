/**
 * tests/api/v1/perspectives/utils.js
 */
'use strict'; // eslint-disable-line strict

const tu = require('../../../testUtils');
const path = require('path');
const fs = require('fs');

const testStartTime = new Date();

module.exports = {
  doSetup() {
    return new tu.db.Sequelize.Promise((resolve, reject) => {
      const willSendthis = fs.readFileSync(
        path.join(__dirname,
        '../apiTestsUtils/lens.zip')
      );
      const lens = {
        name: 'testLensName',
        sourceName: 'testSourceLensName',
        description: 'test Description',
        sourceDescription: 'test Source Description',
        isPublished: true,
        library: willSendthis,
      };
      tu.db.Lens.create(lens)
      .then((createdLens) => resolve(createdLens))
      .catch((err) => reject(err));
    });
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Perspective, testStartTime)
    .then(() => tu.forceDelete(tu.db.Lens, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
};
