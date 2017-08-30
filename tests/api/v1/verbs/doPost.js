/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/postUtils.js
 */
'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const featureToggles = require('feature-toggles');
const redisModelSample = require('../../../../cache/models/samples');
const pu = require('../../../../api/v1/helpers/verbs/postUtils');
const utils = require('../../../../api/v1/helpers/verbs/utils');
const authUtils = require('../../../../api/v1/helpers/authUtils');
const apiErrors = require('../../../../api/v1/apiErrors');

describe('api/v1/helpers/verbs/postUtils.js, Tests >', () => {
  const SAMPLE = {
    subjectId: 'hoot',
    aspectId: 'hoot',
  };
  const ASPECT = {
    name: 'hello',
    timeout: '3d',
  };
  const req = { method: 'POST' };

  it('makePostPromise: when cache is off and returnUser is false, ' +
    'and POSTing a non-sample, return the expected promise', (done) => {
    const expectedStr = 'made it to props.model.create';
    const props = {
      modelName: 'Aspect',
      model: {
        create: () => Promise.resolve(expectedStr),
      },
    };

    const params = {
      queryBody: {
        value: ASPECT,
      },
    };

    pu.makePostPromise(params, props, req)
    .then((str) => {
      expect(str).to.equal(expectedStr);
      done();
    })
    .catch(done);
  });

  it('makePostPromise: when cache is off and returnUser is false, ' +
    'and POSTing a sample, return the expected promise', (done) => {
    const expectedStr = 'made it to u.createSample';
    const stub = sinon.stub(utils, 'createSample')
    .returns(Promise.resolve(expectedStr));
    const props = {
      modelName: 'Sample',
      model: {
        create: () => Promise.reject('shold not call props.model.create'),
      },
    };

    const params = {
      queryBody: {
        value: SAMPLE,
      },
    };

    pu.makePostPromise(params, props, req)
    .then((str) => {
      expect(str).to.equal(expectedStr);
      stub.restore(); // clean up
      done();
    })
    .catch((err) => {
      stub.restore(); // clean up
      done(err);
    });
  });

  describe('stubbing authUtils: throw ForbiddenError', () => {
    let authUtilsStub;
    let featureToggleStub;
    beforeEach(() => {
      featureToggleStub = sinon.stub(featureToggles,
        'isFeatureEnabled').returns(true);
      authUtilsStub = sinon.stub(authUtils, 'getUser')
        .returns(Promise.reject(new apiErrors.ForbiddenError()));
    });
    afterEach(() => {
      featureToggleStub.restore();
      authUtilsStub.restore();
    });

    it('makePostPromise: when cache is on and POSTing sample,' +
      ' on forbidden error, return the expected promise', (done) => {
      const expectedStr = 'made it to u.createSample';
      const successfulPostSampleStub = sinon
        .stub(redisModelSample, 'postSample')
        .returns(Promise.resolve(expectedStr));
      const props = {
        modelName: 'Sample',
        model: {
          create: () => Promise.reject('shold not call props.model.create'),
        },
      };
      const params = {
        queryBody: {
          value: SAMPLE,
        },
      };

      pu.makePostPromise(params, props, req)
      .then((str) => {
        expect(str).to.equal(expectedStr);
        successfulPostSampleStub.restore();
        done();
      })
      .catch((err) => {
        successfulPostSampleStub.restore();
        done(err);
      });
    });

    it('makePostPromise: when cache is on and POSTing a non-sample,' +
      ' on forbidden error, return the expected promise', (done) => {
      const expectedStr = 'made it to props.model.create';
      const props = {
        modelName: 'Aspect',
        model: {
          create: () => Promise.resolve(expectedStr),
        },
      };
      const params = {
        queryBody: {
          value: ASPECT,
        },
      };

      pu.makePostPromise(params, props, req)
      .then((str) => {
        expect(str).to.equal(expectedStr);
        done();
      })
      .catch(done);
    });
  });
});
