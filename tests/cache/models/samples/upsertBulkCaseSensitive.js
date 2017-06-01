/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsertBulkCaseSensitive.js
 */
'use strict';

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const redisClient = require('../../../../cache/redisCache').client.sampleStore;
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;
const path = '/v1/samples/upsert/bulk';
const sampleName = '___Subject1.___Subject2|___Aspect1';

describe('api: POST ' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach(rtu.populateRedis);
  beforeEach((done) => {
    samstoinit.eradicate()
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  afterEach(rtu.flushRedis);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('exiting sample: different case name should NOT modify sample name', (done) => {
    const path = '/v1/samples/upsert/bulk';
    const sampleName = '___Subject1.___Subject2|___Aspect1';

    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: sampleName.toLowerCase(),
        value: '6',
      },
    ])
    .then(() => {

      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get('/v1/samples?name=' + sampleName)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name).to.equal(sampleName);
          done();
        });
      }, 100);
    });
  });

  it('new sample: different case name should NOT modify sample name', (done) => {
    const path = '/v1/samples/upsert/bulk';
    const sampleName = '___Subject1|___Aspect2';

    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: sampleName.toLowerCase(),
        value: '6',
      },
    ])
    .then(() => {

      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get('/v1/samples?name=' + sampleName)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          console.log('in res body')
          expect(res.body).to.have.length(1);
          expect(res.body[0].name).to.equal(sampleName);
          done();
        });
      }, 100);
    });
  });
});
