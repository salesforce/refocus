/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/utils.js
 */
const commonUtils = require('../../../utils/common');
const noReadOnlyFieldsInReq = commonUtils.noReadOnlyFieldsInReq;
const validateAtLeastOneFieldPresent = commonUtils
                                          .validateAtLeastOneFieldPresent;

const ZERO = 0;
const ONE = 1;

/**
 * Given an array, return true if there
 * are duplicates. False otherwise.
 *
 * @param {Array} tagsArr The input array
 * @returns {Boolean} whether input array
 * contains duplicates
 */
function hasDuplicates(tagsArr) {
  const LEN = tagsArr.length - ONE;

  // store lowercase copies
  const copyArr = [];
  let toAdd;
  for (let i = LEN; i >= ZERO; i--) {
    let string = tagsArr[i];

    // if the string begins with -, use the rest of the string for comparison
    toAdd = string[0] === '-' ? string.slice(1).toLowerCase() :
      string.toLowerCase();

    // if duplicate found, return true
    if (copyArr.indexOf(toAdd) > -ONE) {
      return true;
    }

    copyArr.push(toAdd);
  }

  return false;
}

module.exports = {
  hasDuplicates,
  noReadOnlyFieldsInReq,
  validateAtLeastOneFieldPresent,
};
