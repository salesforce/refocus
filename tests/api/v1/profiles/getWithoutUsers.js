/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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

describe('tests/api/v1/profiles/getWithoutUsers.js (without users) >', () => {
  const profileObj = { name: `${tu.namePrefix}1` };
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Profile.create(profileObj)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('GET ?fields=name returns name, id & apiLinks)', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.above(0);
      for (let i = 0; i < res.body.length; i++) {
        const p = res.body[i];
        expect(p).to.have.all.keys(['apiLinks', 'id', 'name']);
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('GET ?fields=userCount returns userCount, id & apiLinks)', (done) => {
    api.get(`${path}?fields=userCount`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.above(0);
      for (let i = 0; i < res.body.length; i++) {
        const p = res.body[i];
        expect(p).to.have.all.keys(['apiLinks', 'id', 'userCount']);
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('GET ?fields=userCount,name', (done) => {
    api.get(`${path}?fields=userCount,name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.above(0);
      for (let i = 0; i < res.body.length; i++) {
        const p = res.body[i];
        expect(p).to.have.all.keys(['apiLinks', 'id', 'name', 'userCount']);
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
