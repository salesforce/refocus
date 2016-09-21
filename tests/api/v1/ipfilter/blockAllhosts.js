/**
 * tests/api/v1/ipfilter/blockAllhosts.js
 */
'use strict';

process.env.NODE_ENV = 'testBlockAllhosts';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1';

describe.skip('Ip Restriction Tests', () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  after(tu.forceDeleteUser);

  it(`GET UNAUTHORIZED for localhost at ${path}`, (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.UNAUTHORIZED)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('GET UNAUTHORIZED for localhost at /', (done) => {
    api.get('/')
    .set('Authorization', token)
    .expect(constants.httpStatus.UNAUTHORIZED)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

