/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/utils.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const path = require('path');
const fs = require('fs');

const testStartTime = new Date();
const name = `${tu.namePrefix}testLensName`;
const willSendthis = fs.readFileSync(
  path.join(__dirname,
    '../apiTestsUtils/lens.zip')
);
const basic = {
  name: `${tu.namePrefix}testLensName`,
  sourceName: 'testSourceLensName',
  description: 'test Description',
  sourceDescription: 'test Source Description',
  isPublished: true,
};

module.exports = {
  name,

  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }
    const defaultProps = JSON.parse(JSON.stringify(basic));
    defaultProps.library = willSendthis;
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const toCreate = this.getBasic(overrideProps);
    return tu.db.Lens.create(toCreate);
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Perspective, testStartTime)
    .then(() => tu.forceDelete(tu.db.Lens, testStartTime))
    .then(() => done())
    .catch(done);
  },

  forceDeleteAllRecords(done) {
    tu.forceDeleteAllRecords(tu.db.Perspective)
      .then(() => tu.forceDeleteAllRecords(tu.db.Lens))
      .then(() => done())
      .catch(done);
  },
};
