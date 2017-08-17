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
const expect = require('chai').expect;
const utils = require('../../../cache/models/utils');

describe('tests/cache/models/utils.js >', () => {
  describe('given asc input >', () => {
    let ascArr;

    // sort is in-place. Hence need reset array for test independence.
    beforeEach(() => {
      ascArr = [
        { name: '___Subject1', absolutePath: '___Subject1' },
        { name: '___Subject2', absolutePath: '___Subject1.___Subject2' },
        { name: '___Subject3', absolutePath: '___Subject1.___Subject3' },
      ];
    });

    it('asc name', () => {
      const result = utils.sortByOrder(ascArr, ['name']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(1)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(3)).to.be.true;
    });

    it('desc name', () => {
      const result = utils.sortByOrder(ascArr, ['-name']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(3)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(1)).to.be.true;
    });

    it('asc absolutePath', () => {
      const result = utils.sortByOrder(ascArr, ['absolutePath']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(1)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(3)).to.be.true;
    });

    it('desc absolutePath', () => {
      const result = utils.sortByOrder(ascArr, ['-absolutePath']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(3)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(1)).to.be.true;
    });
  });

  describe('given desc input >', () => {
    let descArr;

    // sort is in-place. Hence need reset array for test independence.
    beforeEach(() => {
      descArr = [
        { name: '___Subject3', absolutePath: '___Subject1.___Subject3' },
        { name: '___Subject2', absolutePath: '___Subject1.___Subject2' },
        { name: '___Subject1', absolutePath: '___Subject1' },
      ];
    });

    it('asc name', () => {
      const result = utils.sortByOrder(descArr, ['name']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(1)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(3)).to.be.true;
    });

    it('desc name', () => {
      const result = utils.sortByOrder(descArr, ['-name']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(3)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(1)).to.be.true;
    });

    it('asc absolutePath', () => {
      const result = utils.sortByOrder(descArr, ['absolutePath']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(1)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(3)).to.be.true;
    });

    it('desc absolutePath', () => {
      const result = utils.sortByOrder(descArr, ['-absolutePath']);
      expect(result.length).to.equal(3);
      expect(result[0].name.endsWith(3)).to.be.true;
      expect(result[1].name.endsWith(2)).to.be.true;
      expect(result[2].name.endsWith(1)).to.be.true;
    });
  });
});
