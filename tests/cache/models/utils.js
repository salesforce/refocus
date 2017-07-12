/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/utils.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const expect = require('chai').expect;
const utils = require('../../../cache/models/utils');

describe.only('cache utils test', () => {
  const ascArr = [
    { name: '___Subject1', absolutePath: '___Subject1' },
    { name: '___Subject2', 'absolutePath': '___Subject1.___Subject2' },
    { name: '___Subject3', absolutePath: '___Subject1.___Subject3' },
  ];

  // deep copy before reverse. Otherwise will also reverse original array
  const descArr = JSON.parse(JSON.stringify(ascArr)).reverse();
  console.log(ascArr[0], descArr[0])

  describe('given asc input', () => {
    it('asc name', () => {
      const result = utils.sortByOrder(ascArr, ['name']);
      expect(result).to.deep.equal(ascArr);
    });

    it('desc name', () => {
      const result = utils.sortByOrder(ascArr, ['-name']);
      expect(result).to.deep.equal(descArr);
    });

    it('asc absolutePath', () => {
      const result = utils.sortByOrder(ascArr, ['absolutePath']);
      expect(result).to.deep.equal(ascArr);
    });

    it('desc absolutePath', () => {
      const result = utils.sortByOrder(ascArr, ['-absolutePath']);
      expect(result).to.deep.equal(descArr);
    });
  });

  describe('given desc input', () => {
    it('asc name', () => {
      const result = utils.sortByOrder(descArr, ['name']);
      expect(result).to.deep.equal(ascArr);
    });

    it('desc name', () => {
      const result = utils.sortByOrder(descArr, ['-name']);
      expect(result).to.deep.equal(descArr);
    });

    it('asc absolutePath', () => {
      const result = utils.sortByOrder(descArr, ['absolutePath']);
      expect(result).to.deep.equal(ascArr);
    });

    it('desc absolutePath', () => {
      const result = utils.sortByOrder(descArr, ['-absolutePath']);
      expect(result).to.deep.equal(descArr);
    });
  });
});
