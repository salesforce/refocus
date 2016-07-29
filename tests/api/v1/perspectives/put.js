/**
 * tests/api/v1/perspectives/put.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;

describe(`api: PUT ${path}`, () => {
  let perspectiveId;
  let createdLensId;
  const token = tu.createToken();

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: 'testPersp',
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      perspectiveId = createdPersp.id;
      createdLensId = createdPersp.lensId;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('update root subject', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      name: 'testPersp',
      lensId: createdLensId,
      rootSubject: 'changedMainSubject',
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.rootSubject).to.equal('changedMainSubject');
      expect(res.body.aspectTagFilter).to.equal(undefined);
      return done();
    });
  });

  it('update aspectTagFilter', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      name: 'testPersp',
      lensId: createdLensId,
      rootSubject: 'changedMainSubject',
      aspectTagFilter: ['_temp', '_hum'],
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.rootSubject).to.equal('changedMainSubject');
      expect(res.body.aspectTagFilter).to.eql(['_temp', '_hum']);
      return done();
    });
  });

  it('validates aspectFilter', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send({
      name: 'testPersp',
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature#'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('validates aspectTagFilter', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send({
      name: 'testPersp',
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectTagFilter: ['temp#', 'hum'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('validates subjectTagFilter', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send({
      name: 'testPersp',
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      subjectTagFilter: ['ea#', 'na'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('validates statusFilter', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send({
      name: 'testPersp',
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      statusFilter: ['Critical', '-OKAY'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
