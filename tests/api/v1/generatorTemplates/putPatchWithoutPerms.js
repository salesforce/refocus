/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/putPatchWithoutPerms.js
 */

'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const User = tu.db.User;
const path = '/v1/generatorTemplates';

describe('tests/api/v1/generatorTemplates/putPatchWithoutPerms.js > ', () => {
  let generatorTemplate;
  let otherValidToken;
  const generatorTemplateToCreate = u.getGeneratorTemplate();

  before((done) => {
    tu.createToken()
    .then(() => {
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(generatorTemplateToCreate)
    .then((gen) => {
      generatorTemplate = gen;
    })
    /**
     * tu.createToken creates an user and an admin user is already created,
     * so one use of these.
     */
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => generatorTemplate.addWriter(usr))
    .then(() => tu.createUser('myUNiqueUser'))
    .then((_usr) => tu.createTokenFromUserName(_usr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      done();
    })
    .catch(done);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('PATCH without permission: should return 403', (done) => {
    api.patch(`${path}/${generatorTemplate.id}`)
    .set('Authorization', otherValidToken)
    .send({ isPublished: false })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(1);
      expect(errorArray[0].type).to.equal('ForbiddenError');
      return done();
    });
  });
});
