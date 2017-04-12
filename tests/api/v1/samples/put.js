/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/put.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const path = '/v1/samples';
const expect = require('chai').expect;
const ZERO = 0;

describe(`api: PUT ${path}`, () => {
  let sampleName;
  let subjectId;
  let aspectId;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    u.doCustomSetup('COFFEE', 'BAGEL')
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName = samp.name;
      return u.doCustomSetup('TEA', 'TOFFEE')
    })
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      subjectId = samp.subjectId;
      aspectId = samp.aspectId;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('check apiLinks end with sample name', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, value: '2' })
    .expect(constants.httpStatus.OK)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      const { apiLinks } = res.body;
      expect(apiLinks.length).to.be.above(ZERO);
      let href = '';
      for (let j = apiLinks.length - 1; j >= 0; j--) {
        href = apiLinks[j].href;
        if (apiLinks[j].method!= 'POST') {
          expect(href.split('/').pop()).to.equal(sampleName);
        } else {
          expect(href).to.equal(path);
        }
      }

      done();
    });
  });

  it('reject if name field in request', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, value: '2', name: '2' })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.contain('ValidationError');
      done();
    });
  });

  it('basic succeeds', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, value: '2' })
    .expect(constants.httpStatus.OK)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.equal(sampleName);
      done();
    });
  });

  it('put with readOnly field isDeleted should fail', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, isDeleted: 0 })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to
      .contain('You cannot modify the read-only field: isDeleted');
      return done();
    });
  });

  it('put with readOnly field createdAt should fail', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, createdAt: new Date().toString() })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to
      .contain('You cannot modify the read-only field: createdAt');
      return done();
    });
  });

  it('put with readOnly field previousStatus should fail', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, previousStatus: 'Invalid' })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to
      .contain('You cannot modify the read-only field: previousStatus');
      return done();
    });
  });

  it('put does not return id', (done) => {
    api.put(`${path}/${sampleName}`)
    .set('Authorization', token)
    .send({ subjectId, aspectId, value: '2' })
    .expect(constants.httpStatus.OK)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.id).to.be.undefined;
      done();
    });
  });
});


