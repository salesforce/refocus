/**
 * tests/api/v1/profiles/getWithoutUsers.js
 */
'use strict';

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const path = '/v1/profiles';

describe(`api: GET ${path} (without users)`, () => {
  const profileObj = { name: `${tu.namePrefix}1` };
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    Profile.create(profileObj)
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('GET all with fields [name,id] returns only name & id fields (and ' +
  'apiLinks)', (done) => {
    api.get(`${path}?fields=name,id`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.above(0);
      for (var i = 0; i < res.body.length; i++) {
        const p = res.body[i];
        expect(p).to.have.all.keys(['name', 'id', 'apiLinks']);
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('GET all with fields=userCount, returns userCount field (and apiLinks)',
  (done) => {
    api.get(`${path}?fields=userCount`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.above(0);
      for (var i = 0; i < res.body.length; i++) {
        const p = res.body[i];
        expect(p).to.have.all.keys(['userCount', 'apiLinks']);
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('GET all, with fields userCount and name only (and apiLinks)', (done) => {
    api.get(`${path}?fields=userCount,name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.above(0);
      for (var i = 0; i < res.body.length; i++) {
        const p = res.body[i];
        expect(p).to.have.all.keys(['userCount', 'name', 'apiLinks']);
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
