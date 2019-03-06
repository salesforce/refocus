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
const lensUtil = require('../lenses/utils');

const testStartTime = new Date();

const basic = {
  name: `${tu.namePrefix}testPersp`,
  lensId: '...',
  rootSubject: 'myMainSubject',
  aspectFilter: ['temperature', 'humidity'],
  aspectFilterType: 'INCLUDE',
  aspectTagFilter: ['temp', 'hum'],
  aspectTagFilterType: 'INCLUDE',
  subjectTagFilter: ['ea', 'na'],
  subjectTagFilterType: 'INCLUDE',
  statusFilter: ['Critical', '-OK'],
  statusFilterType: 'INCLUDE',
};

module.exports = {
  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  doSetup(props={}) {
    const { createdBy, name } = props;
    return lensUtil.createBasic({ installedBy: createdBy, name })
    .then((lens) => {
      const createdIds = {
        lensId: lens.id,
      };
      return createdIds;
    });
  },

  createBasic(overrideProps={}) {
    const { createdBy, name } = overrideProps;
    return this.doSetup({ createdBy, name })
    .then(({ lensId }) => {
      Object.assign(overrideProps, { lensId });
      const toCreate = this.getBasic(overrideProps);
      return tu.db.Perspective.create(toCreate);
    });
  },

  getDependencyProps() {
    return ['lensId'];
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
