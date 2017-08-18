/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/sampleCount.js
 */
'use strict';
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1';
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('tests/api/v1/samples/sampleCount.js >', () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      status0range: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      status3range: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('For Subject >', () => {
    it('all subjects', (done) => {
      api.post('/v1/samples/upsert')
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get('/v1/subjects')
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
          expect(res.body[0].sampleCount).to.equal(undefined);

          // making sure the samples array is deleted in the response
          expect(res.body[0].samples).to.equal(undefined);
        });
        done();
      });
    });

    it('a specific subject', (done) => {
      api.post(`${path}/samples/upsert`)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(`${path}/subjects/${tu.namePrefix}Subject`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body.sampleCount).to.equal(undefined);

          // making sure the samples array is deleted in the response
          expect(res.body.samples).to.equal(undefined);
        });
        done();
      });
    });

    it('when samples are deleted', (done) => {
      api.post(`${path}/samples/upsert`)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((postErr, res) => {
        if (postErr) {
          return done(postErr);
        }

        api.delete(`${path}/samples/${tu.namePrefix}Subject|` +
          `${tu.namePrefix}Aspect1`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((delErr, res) => {
          if (delErr) {
            return done(delErr);
          }

          api.get(`${path}/subjects/${tu.namePrefix}Subject`)
          .set('Authorization', token)
          /* .expect(constants.httpStatus.OK) */
          .expect((res) => {
            expect(res.body.sampleCount).to.equal(undefined);

            // making sure the samples array is deleted in the response
            expect(res.body.samples).to.equal(undefined);
          })
          .end((getErr /* , res */) => {
            if (getErr) {
              return done(getErr);
            }

            done();
          });
        });
      });
    });
  });

  describe('For Aspects >', () => {
    it('all aspects', (done) => {
      api.post(`${path}/samples/upsert`)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(`${path}/aspects`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
          expect(res.body[0].sampleCount).to.equal(undefined);

          // making sure the samples array is deleted in the response
          expect(res.body[0].samples).to.equal(undefined);
        });
        done();
      });
    });

    it('a specific aspects', (done) => {
      api.post(`${path}/samples/upsert`)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(`${path}/subjects/${tu.namePrefix}Aspect1`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body.sampleCount).to.equal(undefined);

          // making sure the samples array is deleted in the response
          expect(res.body.samples).to.equal(undefined);
        });
        done();
      });
    });

    it('when samples are deleted', (done) => {
      api.post(`${path}/samples/upsert`)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((postErr /* , res */) => {
        if (postErr) {
          return done(postErr);
        }

        api.delete(`${path}/samples/${tu.namePrefix}Subject|` +
                                            `${tu.namePrefix}Aspect1`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((delErr /* , res */) => {
          if (delErr) {
            return done(delErr);
          }

          api.get(`${path}/aspects/${tu.namePrefix}Aspect1`)
          .set('Authorization', token)
          .expect(constants.httpStatus.OK)
          .expect((res) => {
            expect(res.body.sampleCount).to.equal(undefined);

            // making sure the samples array is deleted in the response
            expect(res.body.samples).to.equal(undefined);
          })
          .end(done);
        });
      });
    });
  });
});
