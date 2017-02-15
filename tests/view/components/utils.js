/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/utils.js
 */

const ZERO = 0;

/**
 * Returns an array of resources with identical
 * isPublished property, with
 * fieldName field == index in loop
 *
 * @param {Integer} INT Make this many resources
 * @param {String} fieldName The field of each resource
 * @param {Boolean} isPublished All resources have
 * this value of isPublished
 * @returns {Array} Array with all published resources
 */
function getSubjects(INT, fieldName, isPublished) {
  let subjects = [];
  for (let i = INT; i > ZERO; i--) {
    const obj = {
      isPublished,
      absolutePath: i,
    };
    obj[fieldName] = i;
    subjects.push(obj);
  }
  return subjects;
}

module.exports = {
  getSubjects,
};
