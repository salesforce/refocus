/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/getWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const User = tu.db.User;
const getWritersPath = '/v1/perspectives/{key}/writers';
const getWriterPath = '/v1/perspectives/{key}/writers/{userNameOrId}';

describe('tests/api/v1/perspectives/getWriters.js >', () => {
  let perspective;
  let token;
  let user;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      perspective = createdPersp;
    })
    /*
     * tu.createToken creates a user and an admin user is already created,
     * so use one of these.
     */
    .then(() => User.findOne())
    .then((usr) => perspective.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      perspective.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers with write permission', (done) => {
    api.get(getWritersPath.replace('{key}', perspective.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('find Writers, make sure passwords not returned', (done) => {
    api.get(getWritersPath.replace('{key}', perspective.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      const firstUser = res.body[0];
      const secondUser = res.body[1];
      expect(res.body).to.have.length(2);
      expect(firstUser.password).to.equal(undefined);
      expect(secondUser.password).to.equal(undefined);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('find Writer by username', (done) => {
    api.get(getWriterPath.replace('{key}', perspective.name)
      .replace('{userNameOrId}', user.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('name', user.name);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('find Writer by userId', (done) => {
    api.get(getWriterPath.replace('{key}', perspective.name)
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('id', user.id);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('Writer not found for invalid resource but valid writers', (done) => {
    api.get(getWriterPath.replace('{key}', 'invalidresource')
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('Writer not found for invalid username', (done) => {
    api.get(getWriterPath.replace('{key}', perspective.name)
      .replace('{userNameOrId}', 'invalidUser'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
