/**
 * tests/api/v1/ssoconfig/post.js
 */

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';

describe(`api: POST ${path}`, () => {
  const token = tu.createToken();

  after(u.forceDelete);

  it('sucessful creation', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.samlParams)
    .expect(constants.httpStatus.CREATED)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('Cannot post if there is already a config row in database', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.samlParams)
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/SSOConfigCreateConstraintError/)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
