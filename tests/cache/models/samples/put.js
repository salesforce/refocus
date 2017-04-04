/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/put.js
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
describe(`api: cache: PUT ${path}`, () => {
  let sampleName;
  let token;
  let aspectId;
  let subjectId;

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
      aspectId = sampleObj.aspectId;
      subjectId = sampleObj.subjectId;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('Lists: ', () => {
    it('basic put does not return id', (done) => {
      api.put(`${path}/${sampleName}`)
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

    it('basic put /samples', (done) => {
      api.put(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ aspectId, subjectId, value: '3' })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        if (!(res && res.body &&
          res.body.status === constants.statuses.Warning)) {
          throw new Error('Incorrect Status Value');
        }

        done();
      });
    });
  });

  describe('PUT Related Links ', () => {
    it('single related link', (done) => {
      api.put(`${path}/${sampleName}`)
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
      api.put(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ value: '2', relatedLinks: [] })
      .expect(constants.httpStatus.OK)
      .end((err/* , res */) => {
        if (err) {
          done(err);
        }

        api.put(`${path}/${sampleName}`)
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
      api.put(`${path}/${sampleName}`)
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
});

