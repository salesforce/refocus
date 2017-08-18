/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/perspectives/loadPerspectivePicker.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
import { statuses } from '../../../api/v1/constants';
import sinon from 'sinon';
import { getValuesObject } from '../../../view/perspective/utils.js';

describe('tests/view/perspectives/loadPerspectivePicker.js, ' +
'Perspective app >', () => {
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
  let spy;
  const GET_DEFAULT_PERSPECTIVE = '/v1/globalconfig/DEFAULT_PERSPECTIVE';
  let accumulatorObject = {
    handleHierarchyEvent: DUMMY_FUNCTION,
    handleLensDomEvent: DUMMY_FUNCTION,
    customHandleError: DUMMY_FUNCTION,
    setupSocketIOClient: DUMMY_FUNCTION,
    redirectToUrl: DUMMY_FUNCTION,
  };

  function setup(valuePairs) {
    const defaultValuePairs = {
      '/v1/lenses': {
        body: [{ name: LENS_NAME, isPublished: true, id: DUMMY_ID },
        { name: DUMMY_STRING, isPublished: true, id: DUMMY_ID+2 }],
      },
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

    // for first argument
    request.withArgs(sinon.match('/v1/perspectives/' + DUMMY_STRING))
      .returns(Promise.resolve({
        body: valueObject['/v1/perspectives'].body[0] ,
    }));

    request.withArgs(sinon.match('/v1/lenses/' + DUMMY_ID)).returns(Promise.resolve({
      body: valueObject['/v1/lenses'].body[0] ,
    }));

    for (let key in valueObject) {
      request.withArgs(sinon.match(key)).returns(Promise.resolve(valueObject[key]));
    }
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    request = sandbox.stub();
    spy = sandbox.spy();
  });
  afterEach(() => {
    sandbox.restore();
  });

  function getNamedPerspectiveUrl() {
    return {
      url: '/v1/perspectives/' + DUMMY_STRING,
      named: true,
    };
  }

  function getDefaultPerspectiveUrl() {
    return {
      url: GET_DEFAULT_PERSPECTIVE,
      named: false,
    };
  }

  describe('results from GET requests >', () => {
    it('redirect is called when default perspective exists', () => {
      const globalconfigObject = {};

      // on request GET_DEFAULT_PERSPECTIVE, return object with
      // 'value' field.
      // expect the app to redirect to url ending with 'value' field.
      globalconfigObject[GET_DEFAULT_PERSPECTIVE] = { body: { value: 'perspective2' } };
      setup(globalconfigObject);
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getDefaultPerspectiveUrl;
      accumulatorObject.redirectToUrl = spy;
      const obj = getValuesObject(accumulatorObject);

      // check redirectToUrl is called with the expected url
      // by looking into the first argument of the first call to redirectToUrl
      obj.then((obj) => {
        expect(spy.args[0][0]).to.equal('/perspectives/' + 'perspective2');
      });
    });

    it('redirect is called when default perspective does not exist, but ' +
      'perspectives do', () => {
      const globalconfigObject = {};

      // on request GET_DEFAULT_PERSPECTIVE, response does not contain the body.
      // expect the app to redirect to url ending with the name of
      // the first perspective by alphabetical order
      globalconfigObject[GET_DEFAULT_PERSPECTIVE] = {};
      setup(globalconfigObject);
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getDefaultPerspectiveUrl;
      accumulatorObject.redirectToUrl = spy;
      const obj = getValuesObject(accumulatorObject);

      // check redirectToUrl is called with the expected url
      // by looking into the first argument of the first call to redirectToUrl
      obj.then((obj) => {
        expect(spy.args[0][0]).to.equal('/perspectives/' + DUMMY_STRING);
      });
    });

    it('default fields', () => {
      setup();
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getNamedPerspectiveUrl;
      const obj = getValuesObject(accumulatorObject);
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
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getNamedPerspectiveUrl;
      const obj = getValuesObject(accumulatorObject);
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
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getNamedPerspectiveUrl;
      const obj = getValuesObject(accumulatorObject);
      return obj.then((obj) => {
        expect(obj.aspectFilter.length).to.equal(2);
        expect(obj.aspectFilter[0]).to.equal(ASPECT1);
        expect(obj.aspectFilter[1]).to.equal(ASPECT2);
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
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getNamedPerspectiveUrl;
      const obj = getValuesObject(accumulatorObject);
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
      accumulatorObject.getPromiseWithUrl = request;
      accumulatorObject.getPerspectiveUrl = getNamedPerspectiveUrl;
      const obj = getValuesObject(accumulatorObject);
      return obj.then((obj) => {
        expect(obj.perspective.aspectTagFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.aspectFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.subjectTagFilterType).to.equal('EXCLUDE');
        expect(obj.perspective.statusFilterType).to.equal('EXCLUDE');
      });
    });
  });
});
