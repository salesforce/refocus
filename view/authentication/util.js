/**
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Check if the input string is a valid URL of protocol http or https
 * This should invalidate protocal 'javascript:'
 * @param {String} url url string to be validated
 * @returns {Boolean} true if the URL is valid
 */
function isValidURL(string) {
  console.log('\n\nisValidURL ~~~~~~~~~~~~~~~~~~~~~~~~');
  const decodedString = decodeURIComponent(string);
  let url;
  try {
    url = new URL(decodedString);
  } catch (_) {
    return false;
  }
  return url.protocol === 'https:' || url.protocol === 'http:';
}

module.exports = {
  isValidURL,
};
