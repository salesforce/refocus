/**
 * tests/api/v1/authenticate/authenticateUser.js
 */

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const registerPath = '/v1/register';
const authPath = '/v1/authenticate';
const tu = require('../../../testUtils');

describe(`api: authenticateUser`, () => {
  const token = tu.createToken();
  before((done) => {
    api.post(registerPath)
    .send(u.fakeUserCredentials)
    .end((err) => {
      if(err){
        return done(err);
      }
      done();
    });
  });

  after(u.forceDelete);

  it('no user found', (done) => {
    api.post(authPath)
    .set('Authorization', token)
    .send({
      email: 'unknown@abc.com',
      password: 'fakePasswd',
    })
    .expect(constants.httpStatus.UNAUTHORIZED)
    .expect(/LoginError/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('Wrong password', (done) => {
    api.post(authPath)
    .set('Authorization', token)
    .send({
      email: 'user1@abc.com',
      password: 'wrongPasswd',
    })
    .expect(constants.httpStatus.UNAUTHORIZED)
    .expect(/LoginError/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('sucessful authentication', (done) => {
    api.post(authPath)
    .set('Authorization', token)
    .send(u.fakeUserCredentials)
    .expect(constants.httpStatus.OK)
    .expect((res) => expect(res.body.success).to.be.true)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

