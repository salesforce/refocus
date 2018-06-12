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

module.exports = {
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
};
