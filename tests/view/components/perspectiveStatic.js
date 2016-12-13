/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/perspectiveStatic.js
 */

import { expect } from 'chai';
import CreatePerspective from '../../../view/perspective/CreatePerspective.js';
import { getArray } from '../../../view/perspective/configCreatePerspective.js';

describe('Test static functions', () => {
  const ZERO = 0;
  const POPULAR_SAYING = 'The quick brown fox jumps over the lazy dog';

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

  it('getArray returns only published resources', () => {
    const NUM = 10;
    const unPublished = getArray(
      'absolutePath',
      getSubjects(NUM, 'absolutePath')
    );
    expect(unPublished.length).to.be.empty;

    const published = getArray(
      'absolutePath',
      getSubjects(NUM, 'absolutePath', true)
    );
    expect(published.length).to.equal(NUM);
    // input is in decreasing order
    // should preserve order
    expect(published[ZERO]).to.equal(NUM);
  });

  it('getArray should preserve order of input resources', () => {
    const NUM = 10;
    const published = getArray(
      'absolutePath',
      getSubjects(NUM, 'absolutePath', true),
    );
    // input is in decreasing order
    expect(published[ZERO]).to.equal(NUM);
  });

  it('on select option, dropdown removes that option ' +
    'from available options', () => {
    // remove empty spaces
    const filteredArray = CreatePerspective.filteredArray(
      POPULAR_SAYING.split(''),
      ' ',
    );
    expect(filteredArray).to.not.contain(' ');
  });
});
