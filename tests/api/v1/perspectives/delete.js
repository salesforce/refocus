/**
 * tests/api/v1/perspectives/delete.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;

describe(`api: DELETE ${path}`, () => {
  let perspectiveId;
  const token = tu.createToken();

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: 'testPersp',
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
    }))
    .then((createdPersp) => {
      perspectiveId = createdPersp.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('delete ok', (done) => {
    api.delete(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.isDeleted).to.not.equal(0);
      return done();
    });
  });
});
