/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/utils.js
 *
 * Utility functions
 */

/**
 * Returns the ISO formatted date
 *
 * ie. input: Mon Apr 03 2017 14:10:57 GMT-0700 (PDT)
 * output: 2017-03-14T02:22:42.255Z
 *
 * @param {Object} date Optional input
 * @return {String} If provided date object, return the ISO formatted date.
 * If no input, return the ISO formatted date with now time.
 */
function getISOdate(date) {
  const _date = date ? new Date(date) : new Date();
  return _date.toISOString();
}

module.exports = {
  getISOdate,
}