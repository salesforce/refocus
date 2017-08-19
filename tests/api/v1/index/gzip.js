/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/index/gzip.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const path = '/v1/api-docs';

describe('tests/api/v1/index/gzip.js >', () => {
  const gzipEncode = 'gzip';
  const deflateEncode = 'deflate';

  it('GET gzip encoded content by default', (done) => {
    api.get(path)
    .expect(constants.httpStatus.OK)
    .expect('Content-Type', /json/)
    .expect(/Refocus API/)
    .expect('content-encoding', gzipEncode)
    .end(done);
  });

  it('GET unzipped/deflated content when asked for it', (done) => {
    api.get(path)
    .set('Accept-Encoding', deflateEncode)
    .expect(constants.httpStatus.OK)
    .expect('Content-Type', /json/)
    .expect(/Refocus API/)
    .expect('content-encoding', deflateEncode)
    .end(done);
  });

  it('GET gzipped content when asked for it', (done) => {
    api.get(path)
    .set('Accept-Encoding', gzipEncode)
    .expect(constants.httpStatus.OK)
    .expect('Content-Type', /json/)
    .expect(/Refocus API/)
    .expect('content-encoding', gzipEncode)
    .end(done);
  });
});
