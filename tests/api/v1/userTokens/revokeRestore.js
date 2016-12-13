/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/userTokens/get.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;

describe(`api: POST ${path}/U/tokens/T/[revoke|restore]`, () => {
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;

  before((done) => {
    Profile.create({
      name: `${tu.namePrefix}testProfile`,
    })
    .then((profile) =>
      User.create({
        profileId: profile.id,
        name: uname,
        email: uname,
        password: 'user123password',
      })
    )
    .then((user) => {
      return Token.create({
        name: tname,
        createdBy: user.id,
      });
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('ok', (done) => {
    api.post(`${path}/${uname}/tokens/${tname}/revoke`)
    .set('Authorization', '???')
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('name', tname);
        expect(res.body.isRevoked > '0').to.be.true;
        api.post(`${path}/${uname}/tokens/${tname}/restore`)
        .set('Authorization', '???')
        .send({})
        .expect(constants.httpStatus.OK)
        .end((err2, res2) => {
          if (err2) {
            done(err2);
          } else {
            expect(res2.body).to.have.property('name', tname);
            expect(res2.body).to.have.property('isRevoked', '0');
            done();
          }
        });
      }
    });
  });

  it('try to restore a token if it was not already revoked', (done) => {
    api.post(`${path}/${uname}/tokens/${tname}/restore`)
    .set('Authorization', '???')
    .send({})
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('try to revoke a token if it was already revoked', (done) => {
    api.post(`${path}/${uname}/tokens/${tname}/revoke`)
    .set('Authorization', '???')
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('name', tname);
        expect(res.body.isRevoked > '0').to.be.true;
        api.post(`${path}/${uname}/tokens/${tname}/revoke`)
        .set('Authorization', '???')
        .send({})
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err2, res2) => {
          if (err2) {
            done(err2);
          } else {
            done();
          }
        });
      }
    });
  });
});