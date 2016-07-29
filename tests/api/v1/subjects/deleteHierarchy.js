/**
 * tests/api/v1/subjects/deleteHierarchy.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';

describe(`api: DELETE ${path}`, () => {
  const token = tu.createToken();

  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };
  let ipar = 0;
  let ichi = 0;

  beforeEach((done) => {
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('by id', (done) => {
    api.delete(path.replace('{key}', ipar))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('by abs path', (done) => {
    const pth = path.replace('{key}', `${tu.namePrefix}NorthAmerica`);
    api.delete(pth)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('by abs path, not found', (done) => {
    api.delete(path.replace('{key}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
