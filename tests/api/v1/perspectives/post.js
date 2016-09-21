/**
 * tests/api/v1/perspectives/post.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';

describe(`api: POST ${path}`, () => {
  let createdLensId;
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
    u.doSetup()
    .then((lens) => {
      createdLensId = lens.id;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('OK, no filter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
    })
    .expect(constants.httpStatus.CREATED)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('OK, with filters', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    })
    .expect(constants.httpStatus.CREATED)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('root subject required', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('validates aspectFilter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
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
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
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
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
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
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
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
