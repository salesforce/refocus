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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
import { statuses } from '../../../api/v1/constants';
import assert from 'assert';
import React from 'react';
import sinon from 'sinon';
import { getValuesObject, getFilterQuery,
  getTagsFromArrays } from '../../../view/newPerspective/utils.js';

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

describe('Perspective app ', () => {
  const tags = ['one', 'two', 'three', 'four', 'five'];
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  const DUMMY_STRING = 'COOL';
  const LENS_NAME = DUMMY_STRING + DUMMY_STRING;
  const SUBJECT1 = LENS_NAME + DUMMY_STRING;
  const SUBJECT2 = DUMMY_STRING + LENS_NAME;
  const ASPECT1 = SUBJECT2 + DUMMY_STRING;
  const ASPECT2 = DUMMY_STRING + SUBJECT2;
  const DUMMY_ID = '743bcf42-cd79-46d0-8c0f-d43adbb63866';
  const DUMMY_FUNCTION = () => {};
  let request;
  let sandbox;
  function setup(valuePairs) {
    const defaultValuePairs = {
      '/v1/aspects': {
        body: [ { name: 'COOLCOOLCOOLCOOL', isPublished: true },
        { name: 'COOLCOOLCOOLCOOL', isPublished: true } ]},
      '/v1/subjects': {
        body: [{absolutePath: SUBJECT1, isPublished: true },
        { absolutePath: SUBJECT2, isPublished: true }],
      },
      '/v1/perspectives': {
        body: [{
          name: DUMMY_STRING,
          rootSubject: SUBJECT1,
          lensId: DUMMY_ID,
          statusFilter: [],
          aspectFilter: [],
          aspectTagFilter: [],
          subjectTagFilter: [],
          aspectFilterType: 'EXCLUDE',
          statusFilterType: 'EXCLUDE',
          aspectTagFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
        },
        { name: 'perspective2', rootSubject: SUBJECT2, lensId: DUMMY_ID }],
      }
    };

    const valueObject = Object.assign(defaultValuePairs, valuePairs);

    // for second argument
    request.withArgs(sinon.match([DUMMY_STRING, 'perspective2'])).returns(DUMMY_STRING);
    // for first argument
    request.withArgs(sinon.match('/v1/perspectives')).returns(Promise.resolve(valueObject['/v1/perspectives']));
    request.withArgs(sinon.match('/v1/subjects')).returns(Promise.resolve(valueObject['/v1/subjects']));
    request.withArgs(sinon.match('/v1/lenses/' + DUMMY_ID)).returns(Promise.resolve({
      body: { name: LENS_NAME, id: DUMMY_ID },
    }));
    request.withArgs(sinon.match('/v1/lenses')).returns(Promise.resolve({
      body: [{ name: LENS_NAME, isPublished: true, id: DUMMY_ID },
      { name: DUMMY_STRING, isPublished: true, id: DUMMY_ID+2 }],
    }));
    request.withArgs(sinon.match('/v1/aspects')).returns(Promise.resolve(valueObject['/v1/aspects']));
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    request = sandbox.stub();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('results from GET requests', () => {
    it('default fields', () => {
      setup();
      const obj = getValuesObject(request, request);
      return obj.then((obj) => {
        expect(obj.name).to.equal(DUMMY_STRING);
        expect(obj.perspective.name).to.equal(DUMMY_STRING);
        expect(obj.subjects.length).to.equal(2);
        expect(obj.lenses.length).to.equal(2);
        expect(obj.lens.id).to.equal(DUMMY_ID);
        expect(obj.lens.name).to.equal(LENS_NAME);
        expect(obj.persNames.length).to.equal(2);

        // filters
        expect(obj.aspectFilter.length).to.equal(2);
        expect(obj.statusFilter).to.deep.equal(Object.keys(statuses).sort());
        expect(obj.aspectTagFilter.length).to.equal(0);
        expect(obj.subjectTagFilter.length).to.equal(0);

        // default filter types
        expect(obj.perspective.aspectFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.statusFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.aspectTagFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.subjectTagFilterType).to.equal('EXCLUDE');
      });
    });

    it('set the available aspect tags', () => {
      setup({
        '/v1/aspects': {
          body: [{ name: ASPECT1, isPublished: true, tags: tags.slice(0, 2) },
          { name: 'iDontShowUp', isPublished: false },
          { name: ASPECT2, isPublished: true, tags: tags.slice(2) }],
        }
      });
      const obj = getValuesObject(request, request);
      return obj.then((obj) => {
        expect(obj.aspectTagFilter.length).to.equal(tags.length);
        expect(obj.aspectTagFilter).to.deep.equal(tags.sort())
      });
    });

    it('set the available aspectFilter', () => {
      setup({
        '/v1/aspects': {
          body: [{ name: ASPECT1, isPublished: true },
          { name: 'iDontShowUp', isPublished: false },
          { name: ASPECT2, isPublished: true }],
        }
      });
      const obj = getValuesObject(request, request);
      return obj.then((obj) => {
        expect(obj.aspectFilter.length).to.equal(2);
        expect(obj.aspectFilter[0].name).to.equal(ASPECT1);
        expect(obj.aspectFilter[1].name).to.equal(ASPECT2);
      });
    });

    it('set subjectTagFilter without duplicate tags', () => {
      const subjectTags = tags.slice(0, 2);
      setup({
        '/v1/subjects': {
          body: [{absolutePath: SUBJECT1, isPublished: true, tags: subjectTags },
          { absolutePath: SUBJECT2, isPublished: true, tags: subjectTags }],
        }
      });
      const obj = getValuesObject(request, request);
      return obj.then((obj) => {
        expect(obj.subjectTagFilter.length).to.equal(subjectTags.length);
        expect(obj.subjectTagFilter).to.deep.equal(subjectTags);
      });
    });

    it('sets the filter type', () => {
      setup(() => {
        request
          .withArgs(sinon.match('/v1/perspectives'))
          .returns(Promise.resolve({
            body: [{
            name: DUMMY_STRING, rootSubject: SUBJECT1, lensId: DUMMY_ID,
            aspectTagFilterType: 'EXCLUDE',
            aspectFilterType: 'EXCLUDE',
            subjectTagFilterType: 'EXCLUDE',
            statusFilterType: 'EXCLUDE',
          }],
        }));
      });
      const obj = getValuesObject(request, request);
      return obj.then((obj) => {
        expect(obj.perspective.aspectTagFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.aspectFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.subjectTagFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.statusFilterType).to.equal('EXCLUDE');
      });
    });
  });
});
