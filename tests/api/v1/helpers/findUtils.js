/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/helpers/findUtils.js
 */
'use strict';
const filterArrFromArr = require('../../../../api/v1/helpers/verbs/findUtils.js').filterArrFromArr;
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('filter subject array with tags array', () => {
  it('filter returns some elements with INCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, 'a');
    expect(result).to.deep.equal([sArr[ZERO]]);
  });

  it('filter returns one element with INCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b', 'c'] }];
    const result = filterArrFromArr(sArr, 'b,c');
    expect(result).to.deep.equal([sArr[ONE]]);
  });

  it('filter returns no elements with multiple INCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, 'a,b');
    expect(result).to.deep.equal([]);
  });

  it('filter returns no elements with EXCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, '-a,-b');
    expect(result.length).to.equal(ZERO);
  });

  it('filter returns no elements with EXCLUDE, ' +
    'with leading -', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, '-a,b');
    expect(result.length).to.equal(ZERO);
  });

  it('filter returns some elements with EXCLUDE', () => {
    const sArr = [{ tags: ['a'] }, { tags: ['b'] }];
    const result = filterArrFromArr(sArr, '-a');
    expect(result).to.deep.equal([sArr[ONE]]);
  });
});
