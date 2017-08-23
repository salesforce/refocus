/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/platform.js
 */
module.exports = {
  isHeroku: () => {
    console.log('process.env.NODE', process.env.NODE);
    process.env.NODE && ~process.env.NODE.indexOf('heroku');
  },
};
