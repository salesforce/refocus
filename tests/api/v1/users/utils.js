/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const profileUtil = require('../profiles/utils');

const testStartTime = new Date();

const basic = {
  name: `${tu.namePrefix}testUserName`,
  fullName: `${tu.namePrefix}testUserFullName`,
  email: `${tu.namePrefix}testEmailName@email.com`,
  password: 'testpassword',
}

module.exports = {
  doSetup(props={}) {
    const { createdBy, name } = props;
    return profileUtil.createBasic({ createdBy, name })
      .then((profile) => {
        const createdIds = {
          profileId: profile.id,
        };
        return createdIds;
      });
  },

  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }
    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const { createdBy, name } = overrideProps;
    return this.doSetup({ createdBy, name })
      .then(({ profileId }) => {
        Object.assign(overrideProps, { profileId });
        const toCreate = this.getBasic(overrideProps);
        return tu.db.User.create(toCreate);
      });
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Token, testStartTime)
      .then(() => tu.forceDelete(tu.db.User, testStartTime))
      .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
      .then(() => done())
      .catch(done);
  },

  forceDeleteAllRecords(done) {
    tu.forceDeleteAllRecords(tu.db.Token)
      .then(() => tu.forceDeleteAllRecords(tu.db.User))
      .then(() => tu.forceDeleteAllRecords(tu.db.Profile))
      .then(() => done())
      .catch(done);
  },
};
