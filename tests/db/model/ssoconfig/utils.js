/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/ssoconfig/utils.js
 */
const tu = require('../../../testUtils');

const samlParams = {
  samlEntryPoint: 'http://someurl.com',
  samlIssuer: 'passport-saml',
};

module.exports = {
  forceDelete() {
    return tu.db.SSOConfig.destroy({
      where: {},
      force: true,
    });
  },

  creatSSOConfig() {
    return tu.db.SSOConfig.create(samlParams);
  },

  samlParams,
};
