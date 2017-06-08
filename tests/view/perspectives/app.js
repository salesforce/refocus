/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/perspectives/app.js
 */
'use strict';

const chai = require('chai');
const expect = chai.expect;
import { getFilterQuery,
  getTagsFromArrays } from '../../../view/perspective/utils.js';

describe('get filter query', () => {
  it('given default exclude and no filter, should return ' +
    'empty string', () => {
    const perspectiveObject = {
      aspectFilter: [],
      aspectFilterType: 'EXCLUDE',
      statusFilter: [],
      statusFilterType: 'EXCLUDE',
      subjectTagFilterType: 'EXCLUDE',
      subjectTagFilter: [],
      aspectTagFilterType: 'EXCLUDE',
      aspectTagFilter: [],
    };

    const url = getFilterQuery(perspectiveObject);
    expect(url).to.equal('');
  });

  describe('mix INCLUDE with EXCLUDE', () => {
    it('one of each', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'INCLUDE',
        statusFilter: ['Critical'],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: [],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: [],
      };

      const url = getFilterQuery(perspectiveObject);
      expect(url).to.equal('?aspect=aspect1&status=-Critical');
    });

    it('two of each', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1', 'aspect2'],
        aspectFilterType: 'INCLUDE',
        statusFilter: ['Critical', 'OK'],
        statusFilterType: 'INCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: ['subjectTag1', 'subjectTag2'],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: ['aspectTag1', 'aspectTag2'],
      };

      const url = '?aspect=aspect1,aspect2&aspectTags=-' +
        'aspectTag1,-aspectTag2&subjectTags=-subjectTag1,-subjectTag2&status=Critical,OK';
      expect(getFilterQuery(perspectiveObject)).to.equal(url);
    });
  });

  describe('all EXCLUDE', () => {
    it('one filter', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1', 'aspect2'],
        aspectFilterType: 'EXCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: [],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: [],
      };

      const url = getFilterQuery(perspectiveObject);
      expect(url).to.equal('?aspect=-aspect1,-aspect2');
    });

    it('two filters', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'EXCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: [],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: ['aspectTag1'],
      };

      const url = getFilterQuery(perspectiveObject);
      expect(url).to.equal('?aspect=-aspect1&aspectTags=-aspectTag1');
    });

    it('three filters', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'EXCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: ['subjectTag1'],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: ['aspectTag1'],
      };

      const url = '?aspect=-aspect1&aspectTags' +
        '=-aspectTag1&subjectTags=-subjectTag1';
      expect(getFilterQuery(perspectiveObject)).to.equal(url);
    });

    it('all filters', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1', 'aspect2'],
        aspectFilterType: 'EXCLUDE',
        statusFilter: ['Critical,OK'],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: ['subjectTag1', 'subjectTag2'],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: ['aspectTag1', 'aspectTag2'],
      };

      const url = '?aspect=-aspect1,-aspect2&aspectTags=-aspectTag1,-aspectTag2' +
        '&subjectTags=-subjectTag1,-subjectTag2&status=-Critical,-OK';
      expect(getFilterQuery(perspectiveObject))
        .to.equal(url);
    });
  });

  describe('all INCLUDE', () => {
    it('with one filter', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'INCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: [],
        aspectTagFilterType: 'EXCLUDE',
        aspectTagFilter: [],
      };

      const url = getFilterQuery(perspectiveObject);
      expect(url).to.equal('?aspect=aspect1');
    });

    it('with two filters', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'INCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'EXCLUDE',
        subjectTagFilter: [],
        aspectTagFilterType: 'INCLUDE',
        aspectTagFilter: ['aspectTag1', 'aspectTag2'],
      };

      const url = getFilterQuery(perspectiveObject);
      expect(url).to.equal('?aspect=aspect1&aspectTags=aspectTag1,aspectTag2');
    });

    it('with three filters', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'INCLUDE',
        statusFilter: [],
        statusFilterType: 'EXCLUDE',
        subjectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['subjectTag1', 'subjectTag2'],
        aspectTagFilterType: 'INCLUDE',
        aspectTagFilter: ['aspectTag1'],
      };

      const url = '?aspect=aspect1&aspectTags=aspectTag1' +
        '&subjectTags=subjectTag1,subjectTag2';
      expect(getFilterQuery(perspectiveObject)).to.equal(url);
    });

    it('all filters', () => {
      const perspectiveObject = {
        aspectFilter: ['aspect1'],
        aspectFilterType: 'INCLUDE',
        statusFilter: ['Critical'],
        statusFilterType: 'INCLUDE',
        subjectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['subjectTag1'],
        aspectTagFilterType: 'INCLUDE',
        aspectTagFilter: ['aspectTag1'],
      };

      const url = '?aspect=aspect1&aspectTags=aspectTag1' +
        '&subjectTags=subjectTag1&status=Critical';
      expect(getFilterQuery(perspectiveObject)).to.equal(url);
    });
  });
});

describe('get array:', () => {
  it('by default, returns nothing', () => {
    const array = [{ absolutePath: 'COOLCOOLCOOL' },
    { absolutePath: 'COOLCOOLCOOL' }];
    const result = getTagsFromArrays(array);
    expect(result).to.be.empty;
  });

  it('returns unique elements', () => {
    const tagsArr = ['a', 'b'];
    const array = [{ absolutePath: 'COOLCOOLCOOL', tags: tagsArr },
    { absolutePath: 'COOLCOOLCOOL', tags: tagsArr }];
    const result = getTagsFromArrays(array);
    expect(result).to.deep.equal(['a', 'b']);
  });

  it('returns all elements', () => {
    const tagsArr = ['a', 'b', 'c', 'd'];
    const array = [{ absolutePath: 'COOLCOOLCOOL', tags: tagsArr.slice(0, 2) },
    { absolutePath: 'COOLCOOLCOOL', tags: tagsArr.slice(2) }];
    const result = getTagsFromArrays(array);
    expect(result).to.deep.equal(tagsArr);
  });
});

