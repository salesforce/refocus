/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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
        name: `${tu.namePrefix}testLensName`,
        sourceName: 'testSourceLensName',
        description: 'test Description',
        sourceDescription: 'test Source Description',
        isPublished: true,
        library: willSendthis,
      };
      tu.db.Lens.create(lens)
      .then(resolve)
      .catch(reject);
    });
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Perspective, testStartTime)
    .then(() => tu.forceDelete(tu.db.Lens, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
