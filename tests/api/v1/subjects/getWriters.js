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

describe('api: subjects: get writers}', () => {
  let token;
  let subject;

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
    .catch((err) => done(err));
  });

  before((done) => {
    Subject.create(subjectToCreate)
    .then((sub) => {
      subject = sub;
    }).then(() =>

     /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne())
    .then((usr) => subject.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => subject.addWriter(secUsr))
    .then(() => done())
    .catch((err) => done(err));
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

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

  it('find Writers and make sure they are sorted by username', (done) => {
    api.get(getWritersPath.replace('{key}', subject.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
      const firstUserName = res.body[0].name;
      const secondUserName = res.body[1].name;
      expect(firstUserName < secondUserName).to.equal(true);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
