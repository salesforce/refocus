/**
 * tests/api/v1/samples/get.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const path = '/v1/samples';

describe(`api: GET ${path}`, () => {
  let sampleId;
  const token = tu.createToken();

  before((done) => {
    u.doSetup()
    .then((samp) => {
      return Sample.create(samp);
    })
    .then((samp) => {
      sampleId = samp.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting sample');
      }

      if (res.body[0].status !== constants.statuses.Critical) {
        throw new Error('Incorrect Status Value');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });


  it('basic get by id', (done) => {
    api.get(`${path}/${sampleId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting sample');
      }

      if (res.body.status !== constants.statuses.Critical) {
        throw new Error('Incorrect Status Value');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
