/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/roomFlag/roomFlagDisabled.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const path = '/v1/rooms';
const expect = require('chai').expect;

describe('tests/roomFlag/roomFlagDisabled.js, Rooms path is found >', () => {
  it('GET is found', (done) => {
    api.get(path)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });
});
