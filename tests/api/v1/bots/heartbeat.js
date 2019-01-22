/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/heartbeat.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/bots';
const expect = require('chai').expect;
const ZERO = 0;
const tu = require('../../../testUtils');

describe('tests/api/v1/bots/heartbeat.js >', () => {
  let testBot;
  let token;
  let userId;

  before((done) => {
    tu.createUserAndToken()
    .then((obj) => {
      userId = obj.user.id;
      token = obj.token;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    u.createStandard(userId)
    .then((newBot) => {
      testBot = newBot;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  it('Pass, post last heartbeat', (done) => {
    const currentTimestamp = new Date();
    api.post(`${path}/${testBot.name}/heartbeat`)
    .set('Authorization', token)
    .send({ currentTimestamp })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
