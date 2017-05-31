/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsertBulkWithprovider.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const redisClient = require('../../../../cache/redisCache').client.sampleStore;
const bulkUpsert = require('../../../../cache/models/samples.js')
                        .bulkUpsertByName;
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';
const URL1 = 'https://samples.com';
const relatedLinks = [
  { name: 'link1', url: URL1 },
  { name: 'link2', url: URL1 },
];

describe('api::redisEnabled::POST::bulkUpsert ' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('returnUser', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.toggleOverride('enforceWritePermission', false);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then((aspectOne) => {
      return Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect2`,
        timeout: '10m',
        valueType: 'BOOLEAN',
        okRange: [10, 100],
      });
    })
    .then((aspectTwo) => {
      return Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      });
    })
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(rtu.flushRedis);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('returnUser', false));

  it('succesful bulk upsert should contain provider and user fields', (done) => {
    const samp1Name = `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`;
    const samp2Name = `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`;
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: samp1Name,
        value: '0',
      }, {
        name: samp2Name,
        value: '20',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
       setTimeout(() => {
        api.get('/v1/samples/' + samp1Name)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.provider).to.be.an('string')
          expect(res.body.user).to.be.an('object')
          expect(res.body.user.email).to.be.an('string')
          expect(res.body.user.name).to.be.an('string')
          done();
        });
      }, 500);
    });
  });
});
