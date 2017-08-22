/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/verbs/doPost.js
 */
'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const utils = require('../../../../api/v1/helpers/verbs/utils');
const doPost = require('../../../../api/v1/helpers/verbs/doPost');
require('sinon-as-promised');

describe('tests/api/v1/verbs/doPost.js, doPost verb Tests >', () => {
  let handlePostResultStub;
  let mergeDuplicateArrayElementsStub;


  /**
   * doPost(req, res, next, props) {
   */
  const props = {
    modelName: 'aspects',
    model: {
      create: {
        // sinon stub goes here
      }
    },
  };

  const req = { swagger: { params: {} } };
  req.swagger.params = { queryBody:
   { path: [ 'paths', '/aspects', 'post', 'parameters', '0' ],
     schema:
      { name: 'queryBody',
        description: 'Request body.',
        in: 'body',
        required: true,
        schema: [Object] },
     originalValue:
      { name: '___ASPECTNAME',
        isPublished: true,
        timeout: '110s',
        status0range: [Object],
        status1range: [Object],
        valueType: 'NUMERIC' },
     value:
      { name: '___ASPECTNAME',
        isPublished: true,
        timeout: '110s',
        status0range: [Object],
        status1range: [Object],
        valueType: 'NUMERIC',
      },
    },
  };

  beforeEach(() => {
    handlePostResultStub = sinon.stub(utils, 'handlePostResult');
    mergeDuplicateArrayElementsStub = sinon.stub(utils, 'mergeDuplicateArrayElements');
  })
  afterEach(() => {
    handlePostResultStub.restore();
    mergeDuplicateArrayElementsStub.restore();
    // restore all sinon-related stub and spies
  });

  it('handleError is called with 400 error');

  it('handleError is called when handlePostResult fails');

  it('postSample is called when getUser fails, cache is on and is sample');

  it('createSample is called when cache is off and returnUser is false');

  it('create is called when cache is off and returnUser is false');

  it('create is called when getUser fails, cache is on resource is not sample');

  it.only('mergeDuplicateArrayElements is called with the expected args', () => {
    // setup
    const stub = sinon.stub();
    props.model.create = stub;
    stub.resolves('foo');


    doPost(req, {}, () => {}, props)
    .then(() => {
      expect(handlePostResultStub.called).to.be.true;
    })
    mergeDuplicateArrayElementsStub.restore();
    sinon.assert.calledWith(mergeDuplicateArrayElementsStub, req.swagger.params.queryBody.value, props)
  });

  it('stub makePostPromise returns success: res.status is called');

  it('stub makePostPromise throws err: handleError is called once');

  it('handleError is called');


  it('basic sinon stub promise test', () => {
    sinon.stub().resolves('foo')().then((value) => {
      expect(value).to.equal('foo');
    })
  });

  it.only('should call Event.create when all if ok', function (done) {

    function accept() {

        utils.handlePostResult(); // first

        return Promise.resolve(true); //.then(() => {
        //   return utils.handlePostResult(); // second
        // });
    }

    accept('message').then(() => {
      console.log('reached here, but stub.calledOnce does not terminate')
      // handlePostResultStub.calledOnce.to.be.true;
      done();
    });
  });

  it.only('spy in .then is falsely called', (done) => {
      const spy = sinon.spy(utils, 'makePostPromiseWithUser');

    // stub is called
      const stub = sinon.stub();
      props.model.create = stub;
      stub.resolves('foo');

      props.model.create()
      .then((val) => {
        utils.makePostPromiseWithUser();
        expect(val).to.equal('foo');
        // expect(spy.calledOnce).to.be.true;
        // spy.restore();
        done()
      })
  });
});