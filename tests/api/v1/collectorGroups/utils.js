/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const collectorUtil = require('../collectors/utils');
const testStartTime = new Date();
const colltoCreate = {
  name: tu.namePrefix + 'Coll',
  version: '1.0.0',
};

const basic = {
  name: 'coll-group1',
  description: 'description...',
  collectors: [],
};

module.exports = {
  getCollectorToCreate() {
    return JSON.parse(JSON.stringify(colltoCreate));
  },

  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  doSetup(props={}) {
    const { createdBy, name } = props;
    return collectorUtil.createBasic({ createdBy, name })
    .then((collector) => {
      const createdIds = {
        collectorName: collector.name,
      };
      return createdIds;
    });
  },

  createBasic(overrideProps={}) {
    const { createdBy, name } = overrideProps;
    return this.doSetup({ createdBy, name })
    .then(({ collectorName }) => {
      Object.assign(overrideProps, { collectors: [collectorName] });
      const toCreate = this.getBasic(overrideProps);
      return tu.db.CollectorGroup.create(toCreate);
    });
  },

  getDependencyProps() {
    return ['collectorName'];
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Generator, testStartTime)
      .then(() => tu.forceDelete(tu.db.GeneratorTemplate, testStartTime))
      .then(() => tu.forceDelete(tu.db.Collector, testStartTime))
      .then(() => tu.forceDelete(tu.db.CollectorGroup, testStartTime))
      .then(() => done())
      .catch(done);
  },

  forceDeleteAllRecords(done) {
    tu.forceDeleteAllRecords(tu.db.Generator)
      .then(() => tu.forceDeleteAllRecords(tu.db.GeneratorTemplate))
      .then(() => tu.forceDeleteAllRecords(tu.db.Collector))
      .then(() => tu.forceDeleteAllRecords(tu.db.CollectorGroup))
      .then(() => done())
      .catch(done);
  },
};
