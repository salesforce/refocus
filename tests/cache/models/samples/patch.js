/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/patch.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1/samples';
const rtu = require('../redisTestUtil');
const u = require('./utils');
const redisOps = require('../../../../cache/redisOps');
const objectType = require('../../../../cache/sampleStore')
                    .constants.objectType;
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const Sample = tu.db.Sample;
const ZERO = 0;
describe(`api: redisStore: PATCH ${path}`, () => {
  let sampleName;
  let sampUpdatedAt;
  let sampleValue;
  let token;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    u.doSetup()
    .then((sampObj) => Sample.create(sampObj))
    .then((sample) => {
      sampleName = sample.name;
      return samstoinit.eradicate();
    })
    .then(() => samstoinit.init())
    .then(() => redisOps.getHashPromise(objectType.sample, sampleName))
    .then((sampleObj) => {
      sampUpdatedAt = new Date(sampleObj.updatedAt);
      sampleValue = sampleObj.value;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('Lists: ', () => {
    it('basic patch does not return id', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ value: '3' })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.id).to.be.undefined;
        done();
      });
    });

    it('createdAt and updatedAt fields have the expected format', (done) => {
      api.put(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ value: '3' })
      .expect(constants.httpStatus.OK)
      .end((err, res ) => {
        if (err) {
          done(err);
        }

        const { updatedAt, createdAt } = res.body;
        expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
        expect(createdAt).to.equal(new Date(createdAt).toISOString());
        done();
      });
    });

    it('basic patch /samples', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ value: '3' })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!(res && res.body &&
          res.body.status === constants.statuses.Warning)) {
          throw new Error('Incorrect Status Value');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });
  });

  describe('Patch Related Links ', () => {
    it('single related link', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({
        value: '2',
        relatedLinks: [
          { name: 'link', url: 'https://samples.com' },
        ],
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.relatedLinks).to.have.length(1);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name',
            'link');
        done();
      });
    });

    it('multiple relatedlinks', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ value: '2', relatedLinks: [] })
      .expect(constants.httpStatus.OK)
      .end((err/* , res */) => {
        if (err) {
          done(err);
        }

        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          relatedLinks: [
            { name: 'link0', url: 'https://samples.com' },
            { name: 'link1', url: 'https://samples.com' },
          ],
        })
        .expect(constants.httpStatus.OK)
        .end((_err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.relatedLinks).to.have.length(2);
          for (let i = ZERO; i < res.body.relatedLinks.length; i++) {
            /*
             * Link names are starting from link0 to link1 so adding the index
             * at the end to get the name dynamically.
             */
            expect(res.body.relatedLinks[i])
              .to.have.property('name', 'link' + i);
          }

          done();
        });
      });
    });

    it('with duplicate name', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({
        value: '2',
        relatedLinks: [
          { name: 'link4', url: 'https://samples.com' },
          { name: 'link4', url: 'https://samples.com' },
        ],
      })
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body).to.have.property('errors');
        expect(res.body.errors[ZERO].description)
        .to.contain('Name of the relatedlinks should be unique');
        done();
      });
    });
  });

  describe('UpdatedAt tests: ', () => {
    it('patch /samples without value does not increment ' +
      'updatedAt', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        const result = res.body;
        const dateToInt = new Date(result.updatedAt).getTime();
        expect(dateToInt).to.be.equal(sampUpdatedAt.getTime());
        done();
      });
    });

    it('patch /samples with only identical value increments ' +
      'updatedAt', (done) => {
      // preventing setTimeout by setting sampUpdatedAt 2 secs back.
      sampUpdatedAt.setSeconds(sampUpdatedAt.getSeconds() - 2);
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ value: sampleValue })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        const result = res.body;
        const dateToInt = new Date(result.updatedAt).getTime();
        expect(dateToInt).to.be.above(sampUpdatedAt.getTime());
        done();
      });
    });
  });
});

