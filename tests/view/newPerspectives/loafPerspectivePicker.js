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
import sinon from 'sinon';
import { getValuesObject } from '../../../view/newPerspective/utils.js';

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
