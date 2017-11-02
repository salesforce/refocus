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
const pu = require('../../../../api/v1/helpers/verbs/postUtils');

describe('api/v1/helpers/verbs/postUtils.js, Tests >', () => {
  const ASPECT = {
    name: 'hello',
    timeout: '3d',
  };
  const req = { method: 'POST' };

  it('makePostPromise: when POSTing a non-sample, return the expected ' +
    'promise', (done) => {
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
