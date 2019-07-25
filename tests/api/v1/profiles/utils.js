/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const testStartTime = new Date();

const basic = {
  name: `${tu.namePrefix}testProfileName`,
};

module.exports = {
  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const toCreate = this.getBasic(overrideProps);
    return tu.db.Profile.create(toCreate);
  },

  forceDelete(done, startTime=testStartTime) {
    tu.forceDelete(tu.db.User, startTime)
    .then(() => tu.forceDelete(tu.db.Profile, startTime))
    .then(() => done())
    .catch(done);
  },
};
