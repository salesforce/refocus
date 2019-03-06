/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/globalconfig/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const Op = require('sequelize').Op;

const testStartTime = new Date();
const basic = {
  key: `${tu.namePrefix}testKeyName`,
  value: 'some-value',
};

module.exports = {
  getBasic(overrideProps={}) {
    if (!overrideProps.key) {
      delete overrideProps.key;
    }

    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const toCreate = this.getBasic(overrideProps);
    return tu.db.GlobalConfig.create(toCreate);
  },

  forceDelete() {
    return tu.db.GlobalConfig.destroy({
      where: {
        key: {
          [Op.iLike]: tu.namePrefix + '%',
        },
        createdAt: {
          [Op.lt]: new Date(),
          [Op.gte]: testStartTime,
        },
      },
      force: true,
    })
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Token, testStartTime));
  },

  forceDeleteAllRecords(done) {
    tu.forceDeleteAllRecords(tu.db.GlobalConfig)
      .then(() => tu.forceDeleteAllRecords(tu.db.User))
      .then(() => tu.forceDeleteAllRecords(tu.db.Token))
      .then(() => done())
      .catch(done);
  },
};
