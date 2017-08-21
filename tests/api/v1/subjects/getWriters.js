/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/getWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Subject = tu.db.Subject;
const User = tu.db.User;
const getWritersPath = '/v1/subjects/{key}/writers';
const getWriterPath = '/v1/subjects/{key}/writers/{userNameOrId}';

describe('tests/api/v1/subjects/getWriters.js >', () => {
  let token;
  let subject;
  let user;

  const subjectToCreate = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(subjectToCreate)
    .then((sub) => {
      subject = sub;
    })
    /*
     * tu.createToken creates a user and an admin user is already created,
     * so use one of these.
     */
    .then(() => User.findOne())
    .then((usr) => subject.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      subject.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers with writer permission', (done) => {
    api.get(getWritersPath.replace('{key}', subject.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
    })
    .end(done);
  });

  it('find Writers, make sure passwords not returned', (done) => {
    api.get(getWritersPath.replace('{key}', subject.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      const firstUser = res.body[0];
      const secondUser = res.body[1];
      expect(res.body).to.have.length(2);
      expect(firstUser.password).to.equal(undefined);
      expect(secondUser.password).to.equal(undefined);
    })
    .end(done);
  });

  it('find Writer by username', (done) => {
    api.get(getWriterPath.replace('{key}', subject.name)
      .replace('{userNameOrId}', user.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('name', user.name);
    })
    .end(done);
  });

  it('find Writer by userId', (done) => {
    api.get(getWriterPath.replace('{key}', subject.name)
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('id', user.id);
    })
    .end(done);
  });

  it('Writer not found for invalid resource but valid writers', (done) => {
    api.get(getWriterPath.replace('{key}', 'invalidresource')
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });

  it('Writer not found for invalid username', (done) => {
    api.get(getWriterPath.replace('{key}', subject.name)
      .replace('{userNameOrId}', 'invalidUser'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });

  describe('with api activity logs enabled >', () => {
    before(() => tu.toggleOverride('enableApiActivityLogs', true));
    after(() => tu.toggleOverride('enableApiActivityLogs', false));

    it('find Writers that have writer permission' +
      'associated with the model', (done) => {
      api.get(getWritersPath.replace('{key}', subject.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.length(2);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        return done();
      });
    });
  });
});
