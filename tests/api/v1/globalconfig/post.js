/**
 * tests/api/v1/globalconfig/post.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const adminUser = require('../../../../config').db.adminUser;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/globalconfig';
const expect = require('chai').expect;

describe(`api: POST ${path}`, () => {
  let testUserToken;
  let predefinedAdminUserToken;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  /**
   * Register a non-admin user and an admin user; grab the predefined admin
   * user's token
   */
  before((done) => {
    api.post('/v1/register')
    .set('Authorization', token)
    .send({
      username: `${tu.namePrefix}test@test.com`,
      email: `${tu.namePrefix}test@test.com`,
      password: 'abcdefghijklmnopqrstuvwxyz',
    })
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        testUserToken = res.body.token;
        api.post('/v1/token')
        .send({
          username: adminUser.name,
          email: adminUser.name,
          password: adminUser.password,
        })
        .end((err2, res2) => {
          if (err2) {
            done(err2);
          } else {
            predefinedAdminUserToken = res2.body.token;
          }
        });
        done();
      }
    });
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('forbidden if not admin user', (done) => {
    api.post(path)
    .set('Authorization', testUserToken)
    .send({
      key: `${tu.namePrefix}_GLOBAL_CONFIG_ABC`,
      value: 'def',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors).to.have.deep.property('[0].type',
          'ForbiddenError');
        done();
      }
    });
  });

  it('sucessful creation by predefined admin user', (done) => {
    api.post(path)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      key: `${tu.namePrefix}_GLOBAL_CONFIG_ABC`,
      value: 'def',
    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('key',
          `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
        expect(res.body).to.have.property('value', 'def');
        done();
      }
    });
  });

  it('Cannot post duplicate', (done) => {
    api.post(path)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      key: `${tu.namePrefix}_GLOBAL_CONFIG_DUPE`,
      value: 'a duplicate',
    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('key',
          `${tu.namePrefix}_GLOBAL_CONFIG_DUPE`);
        expect(res.body).to.have.property('value', 'a duplicate');
        api.post(path)
        .set('Authorization', predefinedAdminUserToken)
        .send({
          key: `${tu.namePrefix}_GLOBAL_CONFIG_DUPE`,
          value: 'post a duplicate',
        })
        .end((err2, res2) => {
          expect(res2.body).to.have.deep.property('errors[0].type',
            'SequelizeUniqueConstraintError');
          done();
        });
      }
    });
  });
});
