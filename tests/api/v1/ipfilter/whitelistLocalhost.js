/**
 *tests/api/v1/ipfilter/whitelistLocalhost.js
 */
'use strict';

process.env.NODE_ENV = 'testWhitelistLocalhost';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1/api-docs';

describe('Ip Restriction Test', () => {
  const token = tu.createToken();

  it(`GET OK for localhost at ${path}`, (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

