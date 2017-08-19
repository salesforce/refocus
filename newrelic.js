/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
'use strict';
const conf = require('./config');

exports.config = {
  /**
   * Array of application names.
   */
  app_name: ['Refocus'],

  /**
   * Your New Relic license key.
   */
  license_key: conf.newRelicKey,
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when
     * diagnosing issues with the agent, 'info' and higher will impose the
     * least overhead on production applications.
     */
    level: 'info',
  },
};
