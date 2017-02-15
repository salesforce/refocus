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
import { getArray,
  getTagsFromResources,
  getConfig,
  filteredArray,
  getOptions,
} from '../../../view/perspective/configCreatePerspective';
import { getSubjects } from './utils';

describe('Config perspective functions', () => {
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

  it('dropdown removes all options, if values === options', () => {
    // remove empty spaces
    const arr = getOptions(
      ARR,
      ARR,
    );
    expect(arr).to.be.empty;
  });

  it('dropdown removes existing option ' +
    'from available options', () => {
    // remove empty spaces
    const arr = filteredArray(
      POPULAR_SAYING.split(''),
      ' ',
    );
    expect(arr).to.not.contain(' ');
  });

  describe('getConfig', () => {
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

  describe('getArray', () => {
    it('returns all items except ' +
      'for the item whose field === third param key');

    it('does not return unPublished resources', () => {
      const unPublished = getArray(
        'absolutePath',
        // unpublished
        getSubjects(NUM, 'absolutePath', false)
      );
      expect(unPublished.length).to.be.empty;
    });

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
});
