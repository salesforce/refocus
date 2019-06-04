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
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.Sample;
const path = '/v1/samples';
const expect = require('chai').expect;
const ZERO = 0;

describe(`tests/api/v1/samples/put.js, PUT ${path} >`, () => {
  let sampleName1;
  let sampleName2;
  let aspectId1;
  let subjectId1;
  let subjectId2;
  let aspectId2;
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
    u.doCustomSetup('COFFEE', 'BAGEL')
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName1 = samp.name;
      subjectId1 = samp.subjectId;
      aspectId1 = samp.aspectId;
      return u.doCustomSetup('TEA', 'TOFFEE');
    })
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName2 = samp.name;
      subjectId2 = samp.subjectId;
      aspectId2 = samp.aspectId;
      done();
    })
    .catch(done);
  });

  beforeEach(u.populateRedis);
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('check apiLinks end with sample name', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, value: '2' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { apiLinks } = res.body;
      expect(apiLinks.length).to.be.above(ZERO);
      let href = '';
      for (let j = apiLinks.length - 1; j >= 0; j--) {
        href = apiLinks[j].href;
        if (apiLinks[j].method != 'POST') {
          expect(href.split('/').pop()).to.equal(sampleName1);
        } else {
          expect(href).to.equal(path);
        }
      }

      done();
    });
  });

  it('reject if name field in request', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, value: '2', name: '2' })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.contain('ValidationError');
      done();
    });
  });

  it('basic succeeds', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, value: '2' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(sampleName1);
      done();
    });
  });

  it('put with readOnly field isDeleted should fail', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, isDeleted: 0 })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description)
      .to.contain('You cannot modify the read-only field: isDeleted');
      return done();
    });
  });

  it('put with readOnly field createdAt should fail', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, createdAt: new Date().toString() })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description)
      .to.contain('You cannot modify the read-only field: createdAt');
      return done();
    });
  });

  it('put with readOnly field previousStatus should fail', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, previousStatus: 'Invalid' })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description)
      .to.contain('You cannot modify the read-only field: previousStatus');
      return done();
    });
  });

  it('put does not return id', (done) => {
    api.put(`${path}/${sampleName1}`)
    .set('Authorization', token)
    .send({ subjectId2, aspectId2, value: '2' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.id).to.be.undefined;
      done();
    });
  });

  it('related links set to empty array if not provided', (done) => {
    api.put(`${path}/${sampleName1}`)
      .set('Authorization', token)
      .send({ subjectId2, aspectId2, value: '3' })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.eql([]);
      })
      .end(done);
  });

  describe('subject isPublished false >', () => {
    beforeEach((done) => {
      tu.db.Subject.findByPk(subjectId1)
      .then((sub) => {
        sub.update({ isPublished: false });
        done();
      })
      .catch(done);
    });

    it('cannot create sample if subject not published', (done) => {
      api.put(`${path}/${sampleName1}`)
      .set('Authorization', token)
      .send({ subjectId1, aspectId1, value: '2' })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });

  describe('aspect isPublished false >', () => {
    beforeEach((done) => {
      tu.db.Aspect.findByPk(aspectId1)
      .then((asp) => asp.update({ isPublished: false }))
      .then(() => done())
      .catch(done);
    });

    it('cannot create sample if aspect not published', (done) => {
      api.put(`${path}/${sampleName1}`)
      .set('Authorization', token)
      .send({ subjectId1, aspectId1, value: '2' })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });
});
