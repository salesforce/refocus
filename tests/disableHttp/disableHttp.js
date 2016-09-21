/**
 * tests/disableHttp/disableHttp.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const path = '/v1/users';
const expect = require('chai').expect;

describe('http is disabled', () => {
  it('GET is redirected', (done) => {
    api.get(path)
    .expect(constants.httpStatus.REDIRECT)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('POST is rejected', (done) => {
    api.post(path)
    .send({ name: 'abc@def.ghi', email: 'abc@def.ghi', password: 'abcdefghi' })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
