/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/getWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const User = tu.db.User;
const getWritersPath = '/v1/generatorTemplates/{key}/writers';
const getWriterPath = '/v1/generatorTemplates/{key}/writers/{userNameOrId}';

describe('tests/api/v1/generatorTemplates/getWriters.js > ', () => {
  let token;
  let generatorTemplate;
  let user;
  const generatorTemplateToCreate = u.getGeneratorTemplate();

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(generatorTemplateToCreate)
    .then((gen) => {
      generatorTemplate = gen;
    })
    /*
     * tu.createToken creates an user and an admin user is already created,
     * so one use of these.
     */
    .then(() => User.findOne())
    .then((usr) => generatorTemplate.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      generatorTemplate.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => tu.createThirdUser())
    .then((tUsr) => generatorTemplate.addWriter(tUsr))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers that have writer permission'
    + 'associated with the model', (done) => {
    api.get(getWritersPath.replace('{key}', generatorTemplate.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(3);
    })
    .end(done);
  });

  it('find Writers and make sure the passwords are not returned', (done) => {
    api.get(getWritersPath.replace('{key}', generatorTemplate.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      const firstUser = res.body[0];
      const secondUser = res.body[1];
      const thirdUser = res.body[2];
      expect(res.body).to.have.length(3);
      expect(firstUser.password).to.equal(undefined);
      expect(secondUser.password).to.equal(undefined);
      expect(thirdUser.password).to.equal(undefined);
    })
    .end(done);
  });

  it('find Writer by username', (done) => {
    api.get(getWriterPath.replace('{key}', generatorTemplate.name)
    .replace('{userNameOrId}', user.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('name', user.name);
    })
    .end(done);
  });

  it('find Writer by userId', (done) => {
    api.get(getWriterPath.replace('{key}', generatorTemplate.name)
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
    api.get(getWriterPath.replace('{key}', generatorTemplate.name)
    .replace('{userNameOrId}', 'invalidUser'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });
});

