/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/deleteWithoutPerms.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Generator = tu.db.Generator;
const User = tu.db.User;
const path = '/v1/generators/{key}';
const expect = require('chai').expect;

describe('api: generators: delete without permission', () => {
  let generator;
  let otherValidToken;

  const generatorToCreate = u.getGenerator();

  before((done) => {
    tu.createToken()
    .then(() => {
      done();
    })
    .catch(done);
  });

  before((done) => {
    Generator.create(generatorToCreate)
    .then((gen) => {
      generator = gen;
    })
    .then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne({ where: { name: tu.userName } }))
    .then((usr) => {
      return generator.addWriter(usr);
    })
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

  it('should return 403 when deleting the generator' +
    ' without permission', (done) => {
    api.delete(path.replace('{key}', generator.id))
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        done(err);
      }
      expect(res.body.errors[0].message).to.equal('Forbidden')
      done();
    });
  });
});

