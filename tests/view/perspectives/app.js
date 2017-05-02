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
'use strict';

const expect = require('chai').expect;
const utils = require(
  '../../../view/perspective/utils'
);

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

    const url = utils.getFilterQuery(perspectiveObject);
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

      const url = utils.getFilterQuery(perspectiveObject);
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
      expect(utils.getFilterQuery(perspectiveObject)).to.equal(url);
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

      const url = utils.getFilterQuery(perspectiveObject);
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

      const url = utils.getFilterQuery(perspectiveObject);
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
      expect(utils.getFilterQuery(perspectiveObject)).to.equal(url);
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
      expect(utils.getFilterQuery(perspectiveObject))
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

      const url = utils.getFilterQuery(perspectiveObject);
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

      const url = utils.getFilterQuery(perspectiveObject);
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
      expect(utils.getFilterQuery(perspectiveObject)).to.equal(url);
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
      expect(utils.getFilterQuery(perspectiveObject)).to.equal(url);
    });
  });
});
