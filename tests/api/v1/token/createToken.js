/**
 * tests/api/v1/token/createToken.js
 */

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const registerPath = '/v1/register';
const tokenPath = '/v1/token';

describe(`api: createToken`, () => {
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
    api.post(tokenPath)
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
    api.post(tokenPath)
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

  it('sucessful authentication, create token', (done) => {
    api.post(tokenPath)
    .send(u.fakeUserCredentials)
    .expect(constants.httpStatus.OK)
    .expect((res) => expect(res.body.success).to.be.true)
    .expect((res) => expect(res.body.message).to.be.equal('Enjoy your token!'))
    .expect((res) => expect(res.body).to.have.property('token'))
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

