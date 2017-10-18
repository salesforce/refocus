/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsertBulkConcurrent.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';
const delayInMilliSeconds = 100;

describe('tests/cache/models/samples/upsertBulkConcurrent.js, ' +
`api::redisEnabled::POST::bulkUpsert ${path} >`, () => {
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

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect3`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect4`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(rtu.forceDeleteUserAndProf);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('bulkupsert to multiple samples that belong to the subject should ' +
  'succeed', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect3`,
        value: '4',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect4`,
        value: '4',
      },
    ])
    .then(() => {
      setTimeout(() => {
        api.get('/v1/samples')
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(4);
          expect(res.body[0].name).to.contain(`${tu.namePrefix}Subject|`);
          expect(res.body[1].name).to.contain(`${tu.namePrefix}Subject|`);
          expect(res.body[2].name).to.contain(`${tu.namePrefix}Subject|`);
          expect(res.body[3].name).to.contain(`${tu.namePrefix}Subject|`);
          done();
        });
      }, delayInMilliSeconds);
    });
  });
});
