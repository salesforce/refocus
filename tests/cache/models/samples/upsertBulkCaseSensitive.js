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
const path = '/v1/samples/upsert/bulk';

describe('tests/cache/models/samples/upsertBulkCaseSensitive.js, ' +
`api: POST ${path} >`, () => {
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

  before(rtu.populateRedis);
  before((done) => {
    samstoinit.eradicate()
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDeleteAspSampSubj);
  after(rtu.flushRedis);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('existing sample: different case name should NOT modify sample name',
  (done) => {
    const path = '/v1/samples/upsert/bulk';
    const sampleName = '___Subject1.___Subject2|___Aspect1';

    api.post(path)
    .set('Authorization', token)
    .send([{ name: sampleName.toLowerCase(), value: '6' }])
    .then(() => {
      /*
       * the bulk api is asynchronous. The delay is used to give some time for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get('/v1/samples?name=' + sampleName)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name).to.equal(sampleName);
          done();
        });
      }, 100);
    });
  });

  it('new sample: different case name should NOT modify sample name',
  (done) => {
    const path = '/v1/samples/upsert/bulk';
    const sampleName = '___Subject1|___Aspect2';

    api.post(path)
    .set('Authorization', token)
    .send([{ name: sampleName.toLowerCase(), value: '6' }])
    .then(() => {
      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get('/v1/samples?name=' + sampleName)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name).to.equal(sampleName);
          done();
        });
      }, 100);
    });
  });
});
