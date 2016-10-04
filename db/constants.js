/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/constants.js
 */

module.exports = {
  fieldlen: {
    email: 254,
    longish: 4096,
    normalName: 60,
    reallyShort: 5,
    shortish: 10,
    url: 2082, // sequelize validator default
  },
  nameRegex: /^[0-9a-z_-]+$/i,
  sampleNameSeparator: '|',
  defaultJsonArrayValue: [],
  defaultArrayValue: [],
  statuses: {
    Critical: 'Critical',
    Invalid: 'Invalid',
    Timeout: 'Timeout',
    Warning: 'Warning',
    Info: 'Info',
    OK: 'OK',
  },
};
