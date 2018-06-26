/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/perspectives/utils.js
 */

import { expect } from 'chai';
import { getArray,
  getTagsFromResources,
  getConfig,
  arrayFilter,
  getTagsFromArrays,
} from '../../../view/perspective/utils';

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

describe('tests/view/perspectives/utils.js, Config perspective functions >',
() => {
  const ZERO = 0;
  const NUM = 10;
  const POPULAR_SAYING = 'The quick brown fox jumps over the lazy dog';
  const ARR = POPULAR_SAYING.split(' ');
  const WORD = 'fox';

  it('getTagsFromResources does not return duplicates', () => {
    const arr = [
      { tags: [ WORD ] },
      { tags: [] },
      { tags: [ WORD ] },
    ];
    const resultArr = getTagsFromResources(arr);
    expect(resultArr.length).to.equal(1);
    expect(resultArr).to.deep.equal([WORD]);
  });

  describe('arrayFilter >', () => {
    it('filters out numbers', () => {
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3];
      const filtered = arrayFilter(arr1, arr2);
      expect(filtered).to.deep.equal([4, 5]);
    });

    it('dropdown removes all options, if values === options', () => {
      // remove empty spaces
      const arr = arrayFilter(
        ARR,
        ARR,
      );
      expect(arr).to.be.empty;
    });

    it('dropdown removes existing option ' +
      'from available options', () => {
      // remove empty spaces
      const arr = arrayFilter(
        POPULAR_SAYING.split(''),
        ' ',
      );
      expect(arr).to.not.contain(' ');
    });

    it('pass in null value', () => {
      const arr = arrayFilter(ARR);
      expect(arr).to.deep.equal(ARR);
    });
  })

  describe('getConfig >', () => {
    it('config options contain the expected number of options', () => {
      const key = 'statusFilter'; // any string
      const values = {};
      values[key] = POPULAR_SAYING.split(' ');
      const value = [WORD];
      const config = getConfig(values, key, value);
      expect(config.options.length).to.equal(values[key].length - 1);
    });

    it('options contain only values not in field', () => {
      const key = 'statusFilter'; // any string
      const values = {};
      values[key] = POPULAR_SAYING.split(' ');
      const value = [WORD];
      const config = getConfig(values, key, value);
      expect(config.options).to.not.contain(WORD);
    });
  });

  describe('getArray >', () => {
    it('returns published resources', () => {
      const published = getArray(
        'absolutePath',
        // published
        getSubjects(NUM, 'absolutePath', true)
      );
      expect(published.length).to.equal(NUM);
      // input is in decreasing order
      // should preserve order
      expect(published[ZERO]).to.equal(NUM);
    });

    it('preserves the order of input resources', () => {
      const published = getArray(
        'absolutePath',
        // published
        getSubjects(NUM, 'absolutePath', true),
      );
      // input is in decreasing order
      expect(published[ZERO]).to.equal(NUM);
    });
  });

  describe('getTagsFromArrays >', () => {
    it('not an array', () => {
      const tags = getTagsFromArrays('not-an-arr');
      expect(tags.length).to.equal(0);
    });

    it('null array', () => {
      const tags = getTagsFromArrays();
      expect(tags.length).to.equal(0);
    });

    it('empty array', () => {
      const tags = getTagsFromArrays([]);
      expect(tags.length).to.equal(0);
    });

    it('array with one object having one tag', () => {
      const arr = [{ tags: ['tag1'] }];
      const tags = getTagsFromArrays(arr);
      expect(tags.length).to.equal(1);
      expect(tags).to.deep.equal(['tag1']);
    });

    it('array with one object having multiple tags', () => {
      const arr = [{ tags: ['tag1', 'tag2'] }];
      const tags = getTagsFromArrays(arr);
      expect(tags.length).to.equal(2);
      expect(tags).to.deep.equal(['tag1', 'tag2']);
    });

    it('array with one object having duplicate tags', () => {
      const arr = [{ tags: ['tag1', 'tag1'] }];
      const tags = getTagsFromArrays(arr);
      expect(tags.length).to.equal(1);
      expect(tags).to.deep.equal(['tag1']);
    });

    it('array with multiple objects having tags, result sorted', () => {
      const arr = [
        { tags: ['tag2', 'tag1'] },
        { tags: ['tag2', 'tag4', 'tag3'] },
      ];
      const tags = getTagsFromArrays(arr);
      expect(tags.length).to.equal(4);
      expect(tags).to.deep.equal(['tag1', 'tag2', 'tag3', 'tag4']);
    });
  });
});
