/**
 * tests/tokenReq/sampleUpsertBulk.js
 */
'use strict';

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const tu = require('../testUtils');
const u = require('../api/v1/samples/utils');
const constants = require('../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const User = tu.db.User;
const Profile = tu.db.Profile;
const path = '/v1/samples/upsert/bulk';

describe('api: POST ' + path, () => {
  const token = tu.createToken();

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => Profile.create({
      name: tu.namePrefix + 1,
    }))
    .then((createdProfile) => User.create({
      email: 'test@refocus.com',
      profileId: createdProfile.id,
      name: `${tu.namePrefix}1`,
      password: 'abcd',
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('forbidden if no token', (done) => {
    api.post(path)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/ForbiddenError/)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('all succeed', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(200)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});