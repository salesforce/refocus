/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/postWriters.js
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
const postWritersPath = '/v1/generatorTemplates/{key}/writers';

describe('api: generatorTemplates: post writers', () => {
  let token;
  let generatorTemplate;
  let firstUser;
  let secondUser;
  let otherValidToken;
  const userNameArray = [];
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
    }).then(() =>

    /**
     * tu.createToken creates an user and an admin user is already created,
     * so one use of these.
     */
      User.findOne({ where: { name: tu.userName } }))
    .then((usr) => {
      firstUser = usr;
      userNameArray.push(firstUser.name);
      return tu.createSecondUser();
    })
    .then((secUsr) => {
      secondUser = secUsr;
      userNameArray.push(secondUser.name);
      return tu.createThirdUser();
    })
    .then((tUsr) => {
      return tu.createTokenFromUserName(tUsr.name);
    })
    .then((tkn) => {
      otherValidToken = tkn;
    })
    .then(() => done())
    .catch(done);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('add writers to the record and make sure the writers are ' +
    'associated with the right object', (done) => {
    api.post(postWritersPath.replace('{key}', generatorTemplate.id))
    .set('Authorization', token)
    .send(userNameArray)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body).to.have.length(2);

      const userOne = res.body[0];
      const userTwo = res.body[1];
      expect(userOne.generatorTemplateId).to.not.equal(undefined);
      expect(userOne.userId).to.not.equal(undefined);

      expect(userTwo.generatorTemplateId).to.not.equal(undefined);
      expect(userTwo.userId).to.not.equal(undefined);
    })
    .end((err /* , res */) => {
      return err ? done(err) : done();
    });
  });

  it('return 403 for adding writers using an user that is not '+
    'already a writer of that resource', (done) => {
    api.post(postWritersPath.replace('{key}', generatorTemplate.id))
    .set('Authorization', otherValidToken)
    .send(userNameArray)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(1);
      expect(errorArray[0].type).to.equal('ForbiddenError');
      return done();
    });
  });

  it('a request body that is not an array should not be accepted', (done) => {
    const firstUserName = firstUser.name;
    api.post(postWritersPath.replace('{key}', generatorTemplate.id))
    .set('Authorization', token)
    .send({ firstUserName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      return done();
    });
  });
});

