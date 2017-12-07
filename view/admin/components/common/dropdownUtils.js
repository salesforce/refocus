/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/components/common/dropdownUtils.js
 *
 * Contains the logo and links to main sections.
*/
function getMatches(arr, value) {
  const matches = [];

  // items are sorted ie. A, B, ..., a, b, ...
  binarySearch(arr, value.toLowerCase(), matches);
  binarySearch(arr, value.toUpperCase(), matches);
  return matches;
}

function binarySearch(items, value, matches) {
  let startIndex = 0;
  let stopIndex = items.length - 1;
  let middle = Math.floor((stopIndex + startIndex) / 2);

  //make sure it's the right value
  const word = items[middle];
  if (!word) {
    return -1;
  } else if (!word.startsWith(value)) {
    if (word < value) {
      return binarySearch(items.slice(middle + 1, items.length), value, matches);
    } else { // word >= value
      return binarySearch(items.slice(0, middle), value, matches);
    }
  } else { // word.startsWith(value)
    matches.push(word);
    return binarySearch(items.slice(0, middle), value, matches) && binarySearch(items.slice(middle + 1, items.length), value, matches)
  }
}

module.exports = {
  getMatches,
}
