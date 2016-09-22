/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/configUtil.js
 * Utilities for config
 */
'use strict'; // eslint-disable-line strict
/**
 * convert ipWhitelist string to array of ip ranges
 * @param  {String} strIPList - ip list eg. '[ [1.2.3.4,1.2.3.8], [7.6.5.4,7.6.9.9] ]'
 * @return {Array}  Array of ip list eg. [['1.2.3.4','1.2.3.8'],['7.6.5.4','7.6.9.9']]
 */
function parseIPlist(strIPList) {
  // remove spaces before or after any of the commas
  let ipList = strIPList.replace(/\s*,\s*/g, ',');

  // remove spaces before or after any of the opening bracket
  ipList = ipList.replace(/\s*\[\s*/g, '[');

  // remove spaces before or after any of the closing bracket
  ipList = ipList.replace(/\s*\]\s*/g, ']');

  const ipRanges = ipList === '' ? [] :
   ipList.slice(2, -2).split('],[');

  const iplist = [];

  // check every ipRanges element is of length 2, else throw an error.
  if (Array.isArray(ipRanges) === true &&
   ipRanges.every((elem) => elem.split(',').length === 2)) {
    for (let i = 0; i < ipRanges.length; i++) {
      iplist.push(ipRanges[i].split(','));
    }
  } else {
    throw new Error('Your IP address is not allowed.' +
    ' Verify your network address and your Refocus IP settings');
  }

  return iplist;
}

module.exports = {
  parseIPlist,
};
